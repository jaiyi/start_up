# DeepSeek Harness 航天 CAE 工具链可行性调研

## 0. 结论先行

航天 CAE Agent 里最大的不确定性确实不在 LLM，也不在 WeKnora，而在 **CAE 工具链能否被稳定、可审计、可复现地自动化**。

推荐结论是：

```text
第一版不要从“GUI 自动建模”或“全流程自主仿真”开始；
第一版应从“已有 FEM 文件 + 文件级工具链 + 受控 solver batch run + 确定性后处理”开始。
```

也就是说，MVP 的主路径应该是：

```text
上传已有 BDF / INP / CDB 等 FEM 文件
  ↓
解析模型和工况
  ↓
做模型完整性 / 单位 / 坐标系 / 材料 / 载荷检查
  ↓
工程师确认仿真计划
  ↓
Temporal 启动 solver workflow
  ↓
CAE adapter 以 batch / API 方式提交求解
  ↓
解析 OP2 / ODB / RST / F06 / log 等结果
  ↓
提取应力、位移、频率、反力、warning、fatal error
  ↓
确定性裕度计算
  ↓
Agent 只做解释、摘要、报告草稿和风险提示
```

GUI 直接操作电脑可以作为兜底方案，但不应作为航天 CAE Agent 的主集成路线。对于航天场景，推荐优先级是：

```text
官方 API / batch CLI / 文件接口
  > CAE 软件内置脚本 / journal / macro API
  > Web 门户自动化
  > 企业 RPA
  > 坐标 / 图像识别型 GUI 自动化
```

---

## 1. 调研边界与资料状态

当前本地文档已经明确：还没有找到 DeepSeek Harness 的官方产品文档、开源仓库或演示材料；因此本文中关于 DeepSeek Harness “开源插件”的判断，只能先按 **Agent Runtime / Tool Runtime / MCP Tool Gateway** 的合理产品形态推演，不能视为已验证的官方能力。

本文重点回答四个问题：

1. DeepSeek Harness 如果有开源插件体系，CAE 工具链应如何接入？
2. 常用商业 CAE 软件有哪些可自动化接口？
3. API 不足时，GUI / 电脑操作是否可行？
4. 航天结构静力 + 模态 MVP 应该如何落地？

---

## 2. CAE 工具链为什么是最大工程难点

航天 CAE 工具链的难点来自四类不确定性。

### 2.1 工具链碎片化

真实工程里可能同时出现：

- Nastran / OptiStruct / Abaqus / Ansys / Simcenter / Femap / Patran / HyperMesh；
- BDF / DAT / FEM / INP / CDB / OP2 / ODB / RST / H3D / F06 / LOG；
- Windows 桌面软件、Linux batch solver、HPC scheduler、license server；
- 公司内部材料库、载荷数据库、PLM / PDM、报告模板和审签系统。

这不是一个单一 API 能解决的问题，而是需要建立 **CAE Tool Adapter 层**。

### 2.2 关键事实不能由 LLM 生成

以下内容必须来自确定性工具或受控数据库：

- 节点、单元、属性、材料、载荷、边界条件；
- 应力、位移、频率、反力、质量、模态参与因子；
- solver warning / fatal error；
- Margin of Safety；
- 文件 hash、solver 版本、deck 版本、结果文件版本。

LLM 可以解释这些事实，但不能替代工具产生这些事实。

### 2.3 版本和许可强约束

航天 CAE 常受以下条件限制：

- solver license 是否可用；
- solver 版本是否经过内部验证；
- HPC 队列、作业脚本和资源配额；
- 商业软件 Python / COM / journal API 是否授权；
- 结果文件是否可由开源库解析；
- 图形界面是否必须在 Windows / VNC / 远程桌面环境运行。

### 2.4 自动化必须可审计

航天仿真不是普通自动化脚本。每次自动化都要记录：

- 输入文件 hash；
- 工况和材料版本；
- solver 名称和版本；
- 命令行参数或 API 调用参数；
- workflow id；
- 输出文件 hash；
- warning / fatal error 摘要；
- 人工确认记录；
- 报告版本和签署状态。

---

## 3. DeepSeek Harness 插件 / 工具接入判断

### 3.1 当前可确认点

本地文档对 DeepSeek Harness 的定位是：

```text
围绕 DeepSeek 模型能力构建的 Agent / Workflow / Tool Runtime，
把模型封装进可控、可审计、可进入业务流程的执行环境。
```

因此，对 CAE 工具链而言，最关键的不是“有没有一个叫 CAE 插件的官方包”，而是 Harness 是否提供以下扩展面：

| 扩展面 | CAE 场景需要什么 |
|---|---|
| Tool Registry | 注册 `parse_model_file`、`submit_solver_run`、`parse_solver_results`、`calculate_margin_of_safety` 等工具 |
| MCP / API Gateway | 让 Agent 只能通过 schema 约束、权限受控的工具调用 CAE 能力 |
| Workflow Hook | 与 Temporal solver workflow、postprocess workflow、report workflow 对接 |
| File Asset API | 管理 BDF / INP / OP2 / ODB / RST / LOG / PDF 等大文件引用和 hash |
| Human Review API | 对 plan approval、solver run confirmation、report sign-off 发 signal |
| Trace / Audit | 记录 prompt、工具入参、工具输出、文件 hash、错误、审批和成本 |
| Eval / Golden Case | 支持对固定样例 case 做回归测试 |

### 3.2 插件形态建议

如果 DeepSeek Harness 支持开源插件，CAE 插件不建议做成一个大而全的 monolith，而应拆成多个小插件 / adapter：

```text
cae-file-plugin
  - 文件上传、hash、类型识别、元数据抽取

cae-nastran-plugin
  - BDF 解析、Nastran batch run、OP2/F06/log 解析

cae-abaqus-plugin
  - INP 解析、Abaqus job run、ODB 解析

cae-ansys-plugin
  - CDB / APDL / MAPDL / DPF 结果接口

cae-postprocess-plugin
  - 指标提取、云图、热点识别、结果对比

cae-margin-plugin
  - 裕度计算、许用值校验、单位换算

cae-report-plugin
  - Markdown / PDF / 审签包生成
```

每个插件都应暴露稳定工具，而不是让 LLM 直接执行脚本。

### 3.3 DeepSeek Harness 待验证清单

拿到官方或开源仓库后，应优先验证：

| 待验证项 | 为什么重要 |
|---|---|
| 是否支持 MCP Server / MCP Client | 决定 CAE 工具是否能作为标准工具接入 |
| 是否支持自定义 Tool schema | 决定输入输出能否强校验 |
| 是否支持文件上传和 artifact 引用 | CAE 大文件不能塞进 prompt |
| 是否支持长任务 callback / webhook / workflow ref | solver run 不可能同步阻塞等待 |
| 是否支持 RBAC / scope / human approval | 航天高风险动作必须人审 |
| 是否支持 trace 导出 | 后续评测和审计需要完整轨迹 |
| 是否支持私有化部署 | CAE 模型和结果通常不能外发 |
| 是否支持插件隔离 | commercial solver adapter 可能有不同机器、许可证和网络边界 |
| 是否支持工具超时、重试、幂等 | solver / postprocess 是长任务和重 IO 任务 |
| 是否支持和 Temporal / LangGraph 集成 | 推荐架构依赖两者分工 |

如果这些能力缺失，仍然可以用外围架构补齐：

```text
DeepSeek Harness 只做前台 Agent / Skill 调用
  + 自建 MCP Tool Gateway
  + Temporal
  + Postgres
  + MinIO
  + CAE Adapter Workers
```

---

## 4. 商业 CAE 软件 API 与自动化接口

### 4.1 Nastran 系列：MSC Nastran / NX Nastran / OptiStruct

#### 典型接口

| 能力 | 可行方式 |
|---|---|
| 输入模型 | BDF / DAT / FEM deck 文件 |
| 提交求解 | batch command / scheduler job |
| 结果文件 | OP2、F06、LOG、XDB、H3D 等，视 solver 和配置而定 |
| 解析工具 | pyNastran 可解析大量 BDF / OP2；F06/log 可规则解析 |
| 前后处理 | Patran、Femap、HyperMesh、Simcenter、HyperView 等 |

#### 适合 MVP 的原因

Nastran 类工具链特别适合第一版，因为它天然偏文件驱动：

```text
BDF 输入 deck
  → batch solver
  → OP2 / F06 / log 结果
```

这比 GUI 自动化更容易纳入 Temporal + MCP。

#### 风险

- BDF 方言很多，不同求解器支持卡片不同；
- 大 OP2 文件解析性能需要验证；
- F06 / log 文本格式可能随版本变化；
- 商业 solver license 和 HPC 队列需要企业环境配合；
- 模态、复合材料、接触、非线性等高级场景复杂度会上升。

#### 推荐用途

MVP 首选：

```text
BDF 静力 + 模态
  + pyNastran 解析 BDF / OP2
  + batch Nastran 或 mock solver
  + F06/log 规则解析
```

### 4.2 Abaqus

#### 典型接口

| 能力 | 可行方式 |
|---|---|
| 输入模型 | INP 文件，或 Abaqus/CAE model database |
| 提交求解 | `abaqus job=... input=...` batch command |
| 脚本接口 | Abaqus Python，CAE scripting，ODB access |
| 结果文件 | ODB、DAT、MSG、STA、LOG |
| 后处理 | `odbAccess` Python API、Abaqus Viewer scripting |

#### 优势

- Python 脚本生态成熟；
- ODB 结果可通过官方 API 读取；
- 非线性、接触、材料模型能力强；
- 对结构场景覆盖广。

#### 风险

- Abaqus Python 是特定运行时，不等同于普通 Python；
- ODB 解析通常依赖安装了 Abaqus 的环境；
- CAE GUI 脚本容易受 session state 影响；
- license 约束明显；
- 静力 + 模态 MVP 可做，但环境搭建比 Nastran 文件流更重。

#### 推荐用途

第二优先级商业适配器：

```text
INP batch run
  + Abaqus Python / odbAccess 后处理
  + 结果摘要导出 JSON
```

### 4.3 Ansys Mechanical / MAPDL / Workbench

#### 典型接口

| 能力 | 可行方式 |
|---|---|
| 参数化求解 | MAPDL / APDL command script |
| Python 接入 | PyMAPDL、DPF、Workbench scripting / journal |
| 结果文件 | RST、RTH、CDB、LOG、OUT |
| 后处理 | DPF / PyDPF、MAPDL POST1、Workbench report |

#### 优势

- APDL / MAPDL 命令式接口适合自动化；
- DPF 对结果抽取较强；
- Workbench journal 可覆盖 GUI 流程；
- 工业用户多，结构/热/耦合覆盖广。

#### 风险

- Workbench 项目文件和 GUI 状态复杂；
- Mechanical 自动化往往和 Windows 桌面、版本、license 绑定；
- DPF / PyMAPDL 版本匹配需要测试；
- 对航天已有 Nastran 资产的团队，迁移成本可能较高。

#### 推荐用途

如果用户团队 Ansys 是主工具，则优先走：

```text
MAPDL / APDL batch
  + DPF 结果提取
  + Workbench journal 仅作为辅助
```

不建议第一版把 Workbench GUI 自动操作作为主路径。

### 4.4 HyperMesh / HyperWorks / OptiStruct

#### 典型接口

| 能力 | 可行方式 |
|---|---|
| 前处理 | HyperMesh Tcl / Python / batch 脚本 |
| 求解器 | OptiStruct、Nastran deck export |
| 后处理 | HyperView / H3D / table export |
| 自动化 | macro、command file、batch mode |

#### 优势

- 前处理能力强，适合网格检查、deck 生成、求解器格式转换；
- 对 Nastran / OptiStruct 生态友好；
- 可作为“模型修复 / deck 检查”工具节点。

#### 风险

- API 和脚本语言随版本变化；
- GUI / batch 差异需要验证；
- 自动修复模型风险较高，MVP 不建议自动改模型。

#### 推荐用途

MVP 可只做只读检查或导出：

```text
import model
  → run quality checks
  → export summary JSON / deck
```

自动网格重划分和自动修复后置。

### 4.5 Femap / Patran / Simcenter 3D

#### Femap

- 常见于 Nastran 前后处理；
- Windows COM / OLE Automation 适合脚本化；
- 对已有 Femap 流程的团队，可以作为桌面 automation path；
- 但强依赖 Windows、COM、安装环境和 license。

#### Patran

- 传统航天结构团队可能仍有使用；
- PCL / session file 可自动化；
- 老工具链脚本能力可用，但维护成本偏高。

#### Simcenter 3D / NX

- NX Open / Simcenter API 能力强；
- 适合 CAD-CAE 一体化和企业 PLM 集成；
- 但部署、授权、数据模型和学习成本较高，不适合作为第一版通用 MVP 主路径。

---

## 5. 开源 CAE 工具链可行性

### 5.0 开源项目 Git 链接总览

下面这些链接优先服务于“航天结构静力 + 模态 MVP”的工具链选型。第一版建议优先验证 `pyNastran + MYSTRAN / CalculiX + meshio + PyVista`，再扩展到 Code_Aster / SALOME / ParaView 等更重的开源平台。

| 工具 | Git 链接 | 主要用途 | MVP 价值判断 |
|---|---|---|---|
| pyNastran | https://github.com/SteveDoyle2/pyNastran | Nastran BDF / OP2 / F06 解析 | 最适合作为 BDF 检查、模型摘要、OP2 结果读取的第一优先级组件 |
| MYSTRAN | https://github.com/MYSTRANsolver/MYSTRAN | 开源 Nastran-like 求解器 | 适合验证 Nastran 风格静力 / 模态开源闭环，需进一步验证求解能力和工程适配范围 |
| CalculiX | https://github.com/Dhondtguido/CalculiX | Abaqus-like INP 结构求解器 | 无商业 license 时适合端到端 demo；与航天常见 Nastran 资产存在格式差异 |
| Code_Aster | https://gitlab.com/codeaster/src | EDF 开源有限元求解器 | 求解能力强，适合结构、热、非线性验证；部署和学习成本较高 |
| SALOME Platform | https://git.salome-platform.org/gitweb/ | 几何、网格、前后处理平台 | 更偏工业级开源前后处理，适合和 Code_Aster 配套，但 MVP 成本较高 |
| SALOME GitHub org | https://github.com/SalomePlatform | SALOME 相关镜像和组件 | 可作为源码浏览和组件索引入口，仍需以官方 GitLab / gitweb 为准 |
| FreeCAD | https://github.com/FreeCAD/FreeCAD | 开源 CAD / CAE 工作台 | 可用于 STEP / 几何基础处理和轻量参数化，第一版不建议主攻自动建模 |
| Gmsh | https://gitlab.onelab.info/gmsh/gmsh | 开源网格生成器 | 适合 demo 和简单模型网格化，不建议第一版覆盖复杂航天 FEM |
| meshio | https://github.com/nschloe/meshio | 网格格式转换 | 适合作为格式桥接层，连接 Gmsh、CalculiX、VTK / PyVista 等工具 |
| PyVista | https://github.com/pyvista/pyvista | Python VTK 封装、云图和截图 | 适合报告图、热点可视化、结果截图生成 |
| VTK | https://gitlab.kitware.com/vtk/vtk | 科学可视化底层库 | PyVista / ParaView 的底层能力来源，通常不直接作为 MVP 接口层 |
| ParaView | https://gitlab.kitware.com/paraview/paraview | 工业级后处理和可视化 | 适合复杂可视化和后处理流水线，MVP 可先用 PyVista 简化 |
| pyYeti | https://github.com/twmacro/pyyeti | 结构动力学、Nastran 数据处理 | 对航天结构动力学和 Nastran 结果处理有参考价值，可作为第二阶段后处理候选 |
| OOFEM | https://github.com/oofem/oofem | 开源有限元求解器 | 可作为结构求解备选，但与航天主流资产贴合度需验证 |
| SU2 | https://github.com/su2code/SU2 | 开源 CFD / 优化平台 | 航空航天相关度高，但更适合后续流体 / 气动扩展，不建议结构 MVP 首批纳入 |
| OpenFOAM | https://develop.openfoam.com/Development/openfoam | 开源 CFD 工具链 | 更适合流体方向，中长期可调研，不建议第一版结构 Agent 主链路采用 |
| OpenMDAO | https://github.com/OpenMDAO/OpenMDAO | NASA 发起的多学科设计优化框架 | 适合后续参数化仿真、多学科优化和设计空间探索 |
| OpenVSP | https://github.com/OpenVSP/OpenVSP | NASA 开源飞行器几何建模工具 | 适合后续飞行器外形 / 气动前处理调研，不是结构静力 MVP 核心依赖 |

建议把这些开源项目分成三类使用：

```text
第一优先级：pyNastran、MYSTRAN、CalculiX、meshio、PyVista
第二优先级：Code_Aster、SALOME、Gmsh、ParaView、pyYeti
后续扩展：SU2、OpenFOAM、OpenMDAO、OpenVSP、OOFEM
```

### 5.1 pyNastran

| 能力 | 评价 |
|---|---|
| BDF 解析 | MVP 非常适合 |
| OP2 读取 | MVP 非常适合，但需验证具体结果类型 |
| 模型摘要 | 适合生成节点、单元、材料、属性、载荷、约束摘要 |
| 模型质量检查 | 可做基础检查，复杂网格质量需补工具 |
| 求解 | 不负责求解 |

推荐作为第一版 Nastran 文件解析核心。

### 5.2 CalculiX

| 能力 | 评价 |
|---|---|
| 输入格式 | Abaqus-like INP |
| 求解 | 开源，可跑静力、模态等基础结构分析 |
| MVP 价值 | 无商业 license 时可做端到端 demo |
| 风险 | 与商业 Abaqus/Nastran 工程流程不完全一致 |

推荐用途：

```text
没有商业 solver license 时，用 CalculiX 做可运行 demo；
有商业环境后，把 adapter 切到 Nastran / Abaqus / Ansys。
```

### 5.3 Code_Aster / Salome-Meca

| 能力 | 评价 |
|---|---|
| 求解能力 | 强，适合结构、热、非线性等 |
| 自动化 | command file / batch 可行 |
| 生态 | 学习曲线较陡，航天团队接受度不一定高 |
| MVP 价值 | 可做开源高保真验证环境，但不如 pyNastran + Nastran 路线贴近航天既有资产 |

### 5.4 FreeCAD / Salome / Gmsh / meshio

| 工具 | 推荐用途 |
|---|---|
| FreeCAD | CAD / STEP 基础解析、几何属性、简单参数化建模 |
| Salome | 几何、网格、Code_Aster 前处理 |
| Gmsh | 开源网格生成，适合 demo，不适合直接覆盖航天复杂模型 |
| meshio | 多格式网格转换和轻量解析 |

MVP 不建议把 CAD 自动网格化作为主目标。可以后置到第二阶段。

### 5.5 VTK / PyVista / ParaView

| 能力 | 评价 |
|---|---|
| 云图生成 | 适合 |
| 网格可视化 | 适合 |
| 结果截图 | 适合报告草稿 |
| 数值事实来源 | 不能替代 solver result parser |

推荐用于报告图、热点截图和可视化，不作为正式结果唯一来源。

---

## 6. GUI / 电脑操作自动化可行性

### 6.1 总体判断

GUI 自动化可行，但只能作为兜底，不应作为主路线。

推荐优先级：

| 方式 | 推荐级别 | 说明 |
|---|---|---|
| 软件内置 Python / journal / command script | 高 | 最接近官方 API，可版本化，可审计 |
| Web CAE 门户 + Playwright | 中高 | DOM 稳定时可靠，适合云仿真门户、任务提交和结果下载 |
| 企业 RPA | 中 | 可做遗留系统串联，但需强审计和失败截图 |
| macro recording | 中低 | 适合探索和原型，不能长期作为生产逻辑 |
| pyautogui | 低 | 坐标和时序脆弱，只适合锁定环境下小范围操作 |
| Sikuli / 图像识别 | 很低 | 可处理无控件 GUI，但误识别和环境漂移风险高 |
| VNC / 远程桌面 | 基础设施 | 可稳定运行环境，但不是自动化方法本身 |

### 6.2 航天合规风险

GUI 自动化最大问题不是“能不能点”，而是：

- 点击是否可证明；
- 是否知道当前软件状态；
- 是否能发现隐藏错误；
- 是否能保证没有点错菜单；
- 软件升级、分辨率、语言、主题变化后是否仍然可靠；
- 自动化产物能否经得起审查。

因此如果使用 GUI 自动化，必须要求：

1. 锁定 VM / VNC 镜像、分辨率、语言、主题和软件版本；
2. 每个关键步骤截图；
3. 每次运行记录输入输出 hash；
4. UI 状态不符合预期时 fail closed；
5. 自动化脚本版本化；
6. 用 golden case 回归；
7. 工程师确认关键产物；
8. 不允许 GUI 自动化直接发布正式结论。

### 6.3 适合 GUI 自动化的边界

可以做：

- 打开 legacy 工具导出某类结果；
- 将固定模板项目另存为新 case；
- 上传 / 下载 web portal 文件；
- 截取报告所需图片；
- 执行已录制、已审查、已参数化的 macro。

不建议做：

- 自动创建复杂 FEM；
- 自动修复模型并直接求解；
- 自动判断仿真合格；
- 通过像素识别读取关键数值；
- 在没有结果文件校验的情况下只靠截图出报告。

---

## 7. 推荐 CAE Adapter 架构

### 7.1 Adapter 层定位

CAE Adapter 是 Harness / MCP 和真实 CAE 软件之间的隔离层。

```text
DeepSeek Harness / LangGraph
  ↓
MCP Tool Gateway
  ↓
CAE Adapter API
  ↓
Temporal Activity Worker
  ↓
具体 CAE 软件 / CLI / API / GUI / HPC
```

Adapter 的职责不是“智能判断”，而是把真实工具能力封装成确定性接口。

### 7.2 核心接口

建议第一版定义统一接口：

```text
inspect_model(file_ref) -> model_summary
validate_model(model_ref, ruleset_ref) -> validation_report
validate_load_cases(load_table_ref) -> load_case_report
generate_solver_deck(case_id, solver_profile) -> solver_input_ref
submit_solver_run(solver_input_ref, run_config) -> solver_run_ref
get_solver_run_status(solver_run_ref) -> run_status
collect_solver_outputs(solver_run_ref) -> output_refs
parse_solver_results(output_refs, metrics_request) -> result_metrics
generate_contour_plots(result_ref, plot_config) -> plot_refs
calculate_margin(metrics_ref, allowable_ref, criteria_ref) -> margin_report
```

### 7.3 Adapter 元数据

每个 adapter 需要声明：

```text
adapter_name
adapter_version
supported_solvers
supported_input_formats
supported_output_formats
supported_analysis_types
requires_license
requires_gui
requires_windows
supports_batch
supports_hpc
validated_solver_versions
golden_cases
known_limitations
```

这能让 Harness 在运行前判断“当前 case 能不能被这个 adapter 接住”。

---

## 8. MVP 推荐方案

### 8.1 MVP 总体选择

第一版建议选择：

```text
航天结构件静力 + 模态
已有 Nastran BDF / Abaqus INP 文件
优先 Nastran BDF + OP2/F06 路线
无商业 license 时用 mock solver / golden result / MYSTRAN / CalculiX 兜底
```

MVP 不做：

- CAD 自动识别和自动网格；
- 复杂接触 / 非线性 / 随机振动；
- 自动模型修复；
- 多 solver 全覆盖；
- GUI 全自动建模；
- 无人审的正式工程结论。

### 8.2 MVP 技术栈

| 层 | 推荐组件 | 说明 |
|---|---|---|
| 前台 Agent | DeepSeek Harness | 创建 case、解释状态、生成计划和报告草稿 |
| 编排 | LangGraph | 编排 Skill / Tool 节点 |
| 长任务 | Temporal | solver / postprocess / report workflow |
| 工具边界 | MCP Tool Gateway + FastAPI / Pydantic | schema、权限、幂等、审计 |
| 状态 | Postgres | case、run、review、tool_call、workflow_ref |
| 文件 | MinIO / NAS | FEM、solver output、log、plots、reports |
| FEM 解析 | pyNastran | BDF / OP2 优先 |
| 开源求解兜底 | MYSTRAN / CalculiX / Code_Aster | MYSTRAN 适合 Nastran-like 静力 / 模态验证；CalculiX 适合 Abaqus-like INP demo；Code_Aster 能力强但更重 |
| 后处理 | pyNastran + PyVista | 指标和云图 |
| 报告 | Markdown + Pandoc | 报告草稿和 PDF |
| GUI 兜底 | VNC + Playwright / RPA / pyautogui | 只做受控 fallback |

### 8.3 MVP 三条落地路径

#### 路径 A：最稳 MVP，文件解析 + mock / golden result

适用：没有 solver license，但想快速验证 Harness 闭环。

```text
BDF / INP 上传
  → pyNastran / parser 解析
  → 模型检查
  → 使用预置 golden OP2 / F06 / log
  → 后处理
  → 裕度计算
  → 报告草稿
```

优点：最快、风险最低、适合演示状态机和审计。
缺点：没有验证真实求解调度。

#### 路径 B：推荐工程 MVP，Nastran batch run

适用：团队有 Nastran / OptiStruct license 和样例 BDF。

```text
BDF 上传
  → pyNastran inspect
  → plan approval
  → Temporal solver_workflow
  → batch run Nastran / OptiStruct
  → parse OP2 / F06 / log
  → margin + report
```

优点：最贴近航天结构工程真实流程。
缺点：依赖 license、solver 环境、结果解析适配。

#### 路径 C：开源可运行 MVP，MYSTRAN / CalculiX / Code_Aster

适用：希望完全开源跑通端到端。

```text
BDF / INP / mesh 上传
  → MYSTRAN / CalculiX / Code_Aster batch solve
  → 结果转换 / 解析
  → PyVista 可视化
  → 报告草稿
```

优点：无商业 license，端到端可控；MYSTRAN 更贴近 Nastran 文件流，CalculiX / Code_Aster 更适合完全开源求解闭环。
缺点：与航天团队真实 Nastran 资产有差距。

### 8.4 推荐优先级

如果目标是产品可行性验证：

```text
路径 A → 路径 B
```

如果目标是纯开源 demo：

```text
路径 A → 路径 C
```

如果用户已有商业 solver 环境：

```text
直接路径 B
```

---

## 9. MVP 具体任务拆解

### Phase 1：只读解析和检查

输出：

1. `upload_model_file`；
2. `inspect_model_file`；
3. `parse_nastran_bdf`；
4. `parse_load_case_table`；
5. `check_unit_system`；
6. `check_coordinate_system`；
7. `validate_material_assignment`；
8. `extract_model_summary`。

验收：

- 能读取节点、单元、材料、属性、约束、载荷；
- 能生成模型摘要 JSON；
- 能发现明显缺材料、缺约束、孤立部件、单位缺失等问题；
- 不执行任何求解。

### Phase 2：Temporal solver workflow

输出：

1. `solver_workflow`；
2. `submit_solver_run`；
3. `get_solver_run_status`；
4. `read_solver_log`；
5. `collect_solver_outputs`；
6. `temporal_workflow_refs`；
7. retry / timeout / cancel。

验收：

- 可以运行 mock solver 或真实 batch solver；
- 每次 run 有 workflow id、solver version、input hash、output hash；
- solver 失败能进入 `solver_failed`；
- 工程师确认前不能启动。

### Phase 3：结果解析和后处理

输出：

1. `parse_solver_results`；
2. `extract_static_metrics`；
3. `extract_modal_metrics`；
4. `generate_contour_plot`；
5. `identify_hotspots`；
6. `compare_runs`。

验收：

- 能提取最大位移、最大应力、一阶频率等指标；
- 能保存结果 JSON；
- 能生成报告用图片；
- 指标和图都能追溯到结果文件 hash。

### Phase 4：裕度和报告

输出：

1. `search_material_allowable`；
2. `calculate_margin_of_safety`；
3. `generate_analysis_report`；
4. `create_review_package`；
5. V&V checklist。

验收：

- 裕度计算由确定性代码完成；
- 材料许用值必须来自 approved material record；
- 报告包含文件版本、solver 版本、结果引用和限制条件；
- 工程师审签前不能 approved。

---

## 10. 风险排序

| 风险 | 影响 | MVP 对策 |
|---|---|---|
| 商业 solver license 不可用 | 无法真实求解 | 先用 mock / golden result / CalculiX，adapter 接口保持一致 |
| 结果文件解析不完整 | 指标提取错误 | 从最小指标开始：max displacement、max stress、first frequency |
| BDF / INP 方言复杂 | 模型解析失败 | 限定样例模型和支持卡片范围，记录 unsupported cards |
| 单位 / 坐标系不清 | 工程结论失效 | 必须人工确认，缺失则阻塞 |
| 材料许用值来源不明 | 裕度不可用 | 无 approved allowable record 则不生成正式 MS |
| GUI 自动化脆弱 | 不可复现 | 只作为 fallback，并加截图、hash、golden case、人审 |
| Solver warning 被忽略 | 结果无效 | log parser + Agent 解释 + V&V checklist |
| 大文件管理混乱 | 结果不可追溯 | MinIO / NAS + hash + file_assets |
| Agent 越权 | 安全风险 | LLM 只能调用 MCP 工具，不能直接 shell / GUI |
| 过早做 CAD 自动建模 | MVP 失焦 | 第一版从已有 FEM 文件开始 |

---

## 11. 航天总体工程视角的推荐

从总体工程角度看，CAE Agent 的价值不应定义为“自动替工程师仿真”，而应定义为：

```text
把仿真任务从经验驱动的手工流程，变成可追踪、可检查、可复用、可审签的工程任务闭环。
```

第一版最有价值的不是自动建模，而是：

1. 输入完整性检查；
2. 工况和准则结构化；
3. 模型、材料、载荷和边界条件检查；
4. solver run 可追踪；
5. warning / fatal error 解释；
6. 关键指标自动提取；
7. 裕度确定性计算；
8. V&V checklist；
9. 报告草稿；
10. 审签和经验沉淀。

这也是最符合航天工程责任边界的落地路径。

---

## 12. 软件工程视角的推荐

从软件工程角度看，不要直接把 CAE 软件“接进 Agent”，而要引入四层隔离：

```text
Agent / Skill 层：理解、解释、计划、报告
MCP Tool 层：schema、权限、幂等、审计
CAE Adapter 层：封装具体软件 API / CLI / GUI
Execution 层：Temporal worker、HPC、license、文件系统
```

关键设计原则：

1. 每个工具必须有 schema；
2. 每个写动作必须有 idempotency key；
3. 每个长任务必须有 workflow id；
4. 每个文件必须有 hash；
5. 每个结果必须能追溯到 input deck 和 solver version；
6. 每个高风险动作必须有人审；
7. 每个 adapter 必须有 golden case；
8. GUI 自动化必须 fail closed；
9. LLM 输出不能直接进入正式工程结论；
10. 所有不支持的格式和卡片必须显式报告。

---

## 13. 最终 MVP 建议

### 13.1 推荐 MVP 名称

```text
Aerospace Structural Static + Modal CAE Toolchain Adapter MVP
```

### 13.2 MVP 范围

```text
输入：已有 BDF / INP、载荷表、材料记录、验收准则
输出：模型检查报告、solver run 记录、结果指标、裕度表、报告草稿
```

### 13.3 MVP 主线

优先选：

```text
Nastran BDF + pyNastran + batch solver / mock solver + OP2/F06 parser
```

备选：

```text
Abaqus INP + Abaqus Python / CalculiX + ODB / FRD parser
```

### 13.4 MVP 成功标准

1. 一个样例支架 case 可以从文件上传跑到报告草稿；
2. 所有工具调用都有 trace；
3. 所有文件都有 hash；
4. solver run 由 Temporal 管理；
5. 结果指标来自 parser，不来自 LLM；
6. 裕度由确定性代码计算；
7. 计划审批和报告审签有人审；
8. GUI 自动化不是主路径；
9. 可以替换 solver adapter 而不改 Agent 主流程。

### 13.5 一句话方案

```text
MVP 用 DeepSeek Harness 管任务和人机交互，
用 LangGraph 编排 Skill，
用 Temporal 管 solver/postprocess/report 长任务，
用 MCP Tool Gateway 封装 CAE Adapter，
用 pyNastran / batch solver / deterministic postprocess 打通 BDF → OP2/F06 → 指标 → 裕度 → 报告，
GUI 自动化只作为 legacy 工具兜底。
```
