# DeepSeek Harness 应用侧调研：航天 CAE Simulation Agent

## 0. 结论先行

如果把 DeepSeek Harness 理解为“让 DeepSeek 类模型进入工具、流程、权限、状态、审计和评测体系的运行时”，那么航天 CAE Simulation Agent 是一个非常适合检验 Harness 价值的应用侧样板。

它的目标不应该是做一个会聊天的 CAE 助手，而是建设一个面向航天结构 / 热 / 流体等仿真任务的 **可控仿真任务执行控制面**：

```text
工程需求
  ↓
仿真任务建模
  ↓
模型 / 材料 / 载荷 / 边界条件检查
  ↓
仿真方案生成与人审
  ↓
求解器和后处理工具调用
  ↓
结果解释、裕度计算与 V&V 检查
  ↓
报告生成、审签和经验沉淀
```

在这个场景里，DeepSeek 负责工程语义理解、方案规划、日志解释、结果摘要和报告撰写；CAE 求解器和后处理工具负责真实计算；Harness 负责状态、权限、工具调用、审计、人审、文件索引和失败恢复；工程师负责关键假设、正式结论和审签。

---

## 1. 为什么航天 CAE 特别需要 Harness

普通 CAE Agent 可能强调效率：快速建模、快速求解、快速解释。航天领域则必须同时满足：

- 需求追溯；
- 工况完整性；
- 单位和坐标系一致性；
- 材料许用值来源；
- 载荷包络和载荷组合；
- 安全系数和裕度计算；
- 模型版本与配置管理；
- 网格质量和收敛性；
- 求解器 warning / fatal error 审查；
- 试验相关性与 V&V；
- 报告审签；
- 全链路可复现、可审计。

这意味着航天 CAE Agent 不能设计成“模型自动给工程结论”。更合理的定位是：

```text
工程师增强型仿真任务控制面。
```

Agent 可以自动化大量准备、检查、运行、汇总和报告工作，但不能替代工程责任人完成最终放行。

---

## 2. 第一版不做全航天 CAE

航天 CAE 覆盖范围很大：

1. 结构静力分析；
2. 模态分析；
3. 正弦振动 / 随机振动；
4. 冲击 / pyroshock；
5. 热分析；
6. 热-结构耦合；
7. CFD / 气动分析；
8. 气动热；
9. 多体动力学；
10. 分离动力学；
11. 控制-结构耦合；
12. 疲劳 / 断裂力学；
13. 复合材料分析；
14. 不确定性和可靠性分析；
15. 试验-仿真相关性分析。

第一版建议不要试图覆盖全域，而是选择一个高频、闭环清晰、指标明确、工具链相对成熟的切口。

推荐 MVP：

```text
航天结构件静力 + 模态分析 Agent
```

典型对象：

- 卫星支架；
- 电子设备安装板；
- 天线支撑结构；
- 载荷适配器；
- 舱段局部结构；
- 仪器安装框架；
- 星箭连接部件；
- 轻量化结构件。

---

## 3. MVP 定位

第一版可以定义为：

```text
面向航天结构件的静力 + 模态仿真 Agent。

用户上传已有 FEM 模型、材料信息、载荷工况表和验收准则，Agent 在 Harness 控制下完成需求解析、模型检查、仿真方案草稿、求解器运行、后处理、Margin of Safety 计算、V&V checklist 和报告草稿生成；关键计划、材料许用值、边界条件、正式结论和报告发布都必须由工程师确认。
```

第一版优先从已有 FEM 文件开始，而不是从 CAD 自动建模开始。

原因：

1. 航天结构仿真里 FEM 模型质量和边界条件比几何自动识别更关键；
2. CAD → 网格 → FEM 自动化复杂度较高，容易拖慢 MVP；
3. 已有 BDF / INP / CDB 等模型可以更快验证 Harness 的状态、工具和审计价值；
4. 先做模型检查、求解、后处理、裕度和报告，更贴近工程师真实痛点。

---

## 4. 用户角色

| 角色 | 关注点 | 在系统中的动作 |
|---|---|---|
| 结构分析工程师 | 模型、载荷、边界、求解、裕度、报告 | 创建 case、确认计划、运行求解、审核结果 |
| 专业组长 / 审核人 | 方法正确性、风险、报告质量 | 审核仿真计划、结果和报告 |
| 设计工程师 | 结构风险、设计修改建议 | 查看热点、裕度和设计建议 |
| 试验工程师 | 仿真与试验相关性 | 查看仿真假设、频率、载荷和试验对比 |
| 项目负责人 | 进度、风险和交付物 | 查看 case 状态、阻塞项和审签状态 |
| CAE / AI 平台管理员 | 工具、权限、审计、算力、模板 | 管理工具、材料库、求解器、报告模板和策略 |

---

## 5. 总体架构

```text
用户入口层
├── 工程师对话入口
├── 仿真任务工作台
├── 模型 / 工况 / 结果 / 报告查看器
└── 审核与签署入口

DeepSeek Harness 层
├── 任务状态机
├── Agent / Skill 编排
├── Tool Registry
├── 文件和模型版本索引
├── 权限、人审和审批策略
├── trace / audit log
├── 错误重试和失败补偿
└── 评测与反馈记录

CAE 专家 Agent 层
├── Requirement & Load Case Agent
├── Model Check Agent
├── Material & Allowable Agent
├── Mesh Review Agent
├── Solver Setup Agent
├── Solver Monitor Agent
├── Post-processing Agent
├── Margin of Safety Agent
├── V&V Review Agent
└── Report Agent

工具层
├── FEM 解析：BDF / INP / CDB / OP2 / ODB / RST
├── CAD / STEP / Parasolid 解析，后续扩展
├── 求解器：Nastran / Abaqus / Ansys / OptiStruct / CalculiX
├── 后处理：pyNastran / Abaqus Python / Ansys DPF / PyVista / ParaView
├── 材料和许用值库
├── 载荷工况表解析
├── 报告生成器
└── 文件存储 / 对象存储 / NAS

状态与知识层
├── Postgres 仿真任务状态库
├── 模型、结果和报告文件索引
├── 材料 / 许用值元数据
├── 历史 case 库
├── 仿真规范和 checklist 知识库
├── 求解错误与处理经验库
└── 审签与审计记录
```

---

## 6. DeepSeek、Harness、CAE 工具的分工

| 层 | 负责什么 | 不负责什么 |
|---|---|---|
| DeepSeek 模型 | 需求解析、工况理解、计划草稿、日志解释、结果摘要、报告撰写 | 不凭空给应力值、不编材料许用值、不替代正式审签 |
| Harness | 状态机、工具调用、权限、人审、审计、文件索引、重试、评测 | 不直接承担数值求解 |
| CAE 工具 | 模型解析、网格检查、求解、后处理、指标提取 | 不理解完整工程语义，不做组织责任判断 |
| 工程师 | 确认假设、边界条件、材料、载荷、正式结论和报告 | 不必手工整理所有重复性过程记录 |

这个分工的核心是：

```text
DeepSeek 负责理解和表达；
CAE 工具负责计算；
Harness 负责执行控制；
工程师负责工程责任。
```

---

## 7. 多模态输入处理方式

航天 CAE Simulation Agent 是多模态 Agent，但不能把所有模态都直接丢给 LLM。

| 输入类型 | 处理方式 | Agent 使用方式 |
|---|---|---|
| 文本需求 | DeepSeek 解析 | 抽取仿真类型、对象、工况、准则、缺失信息 |
| 载荷表 / Excel | 表格解析工具 | 转成结构化 load cases 和 load combinations |
| FEM 文件 | pyNastran / Abaqus Python / Ansys DPF 等解析 | 读取节点、单元、材料、属性、约束、载荷、坐标系 |
| CAD / STEP | CAD 工具解析，MVP 可后置 | 获取几何摘要、特征、质量属性和可网格化风险 |
| Solver log | DeepSeek + 日志解析规则 | 解释 fatal / warning / non-convergence |
| 结果文件 | 后处理工具解析 | 提取最大应力、位移、频率、反力、热点 |
| 云图 / 截图 | VLM 辅助，非数值依据 | 帮助理解热点和报告截图，关键数值仍以结果文件为准 |
| PDF / 历史报告 | 文档抽取 + RAG | 检索规范、历史 case、审查意见和经验 |

原则：

```text
关键数值来自工具，工程解释由 Agent 生成，正式判断由人确认。
```

---

## 8. 专家 Agent 分工

### 8.1 Requirement & Load Case Agent

职责：把自然语言、载荷表和规范要求转成结构化仿真需求。

输出示例：

```json
{
  "analysis_type": ["linear_static", "modal"],
  "object": "satellite equipment bracket",
  "load_cases": [
    {
      "case_id": "LC-Z-01",
      "description": "launch axial acceleration",
      "load_type": "inertial_acceleration",
      "direction": "Z",
      "value": 12,
      "unit": "g"
    }
  ],
  "constraints": [
    {
      "type": "fixed_support",
      "location": "mounting holes"
    }
  ],
  "acceptance_criteria": {
    "min_first_natural_frequency_hz": 100,
    "min_margin_of_safety": 0
  },
  "missing_information": []
}
```

重点校验：

- 载荷单位；
- 坐标系；
- 工况方向；
- 载荷组合；
- limit / ultimate / yield 区分；
- 安全系数；
- 是否缺温度工况；
- 是否缺验收准则。

### 8.2 Model Check Agent

职责：检查几何 / FEM 模型是否可仿真。

检查项：

- 单位系统是否明确；
- 坐标系是否明确；
- 节点、单元、属性、材料是否完整；
- 是否存在未赋材料的单元；
- 是否存在未连接部件；
- 是否存在自由刚体模态风险；
- 约束点是否存在；
- 载荷施加区域是否存在；
- RBE / MPC / 接触 / 螺栓简化是否有说明。

### 8.3 Material & Allowable Agent

职责：管理材料属性和许用值来源。

航天场景里，Agent 不能自己编材料许用值。如果材料库缺失，应明确阻塞正式裕度计算。

输出应包含：

- 材料牌号；
- 热处理状态；
- 密度；
- 弹性模量；
- 泊松比；
- 屈服许用值；
- 极限许用值；
- 温度适用范围；
- 许用值来源；
- 是否经批准。

### 8.4 Mesh Review Agent

职责：检查网格质量和局部细化风险。

检查项：

- 单元类型；
- 单元数量；
- 长宽比；
- Jacobian；
- warpage；
- skewness；
- 最小角；
- 局部应力集中区域网格密度；
- 连接关系；
- 质量集中点；
- RBE / MPC 使用合理性。

### 8.5 Solver Setup Agent

职责：生成或检查求解器输入 deck。

第一版建议优先支持 Nastran BDF，因为它在航天结构、模态、频响、随机振动中常见。

检查项：

- SOL 类型；
- subcase；
- SPC / MPC；
- FORCE / MOMENT / GRAV / ACCEL；
- MAT / PSHELL / PSOLID / PBAR 等属性；
- 模态提取方法；
- 输出请求；
- 质量和惯量设置。

### 8.6 Solver Monitor Agent

职责：监控求解过程并解释日志。

检查项：

- 是否完成；
- 是否有 fatal error；
- 是否有 warning；
- 是否存在 singularity；
- 是否有 unconstrained DOF；
- 是否有 negative pivot；
- 是否有 excessive deformation；
- 是否有质量、属性或约束警告。

### 8.7 Post-processing Agent

职责：从结果文件提取指标和生成云图引用。

静力指标：

- 最大 von Mises 应力；
- 最大主应力；
- 最大位移；
- 关键连接点反力；
- 螺栓载荷；
- 局部热点位置；
- 应力 / 位移云图引用。

模态指标：

- 前 N 阶频率；
- 振型参与因子；
- 有效质量；
- 一阶频率是否满足要求；
- 局部振型风险。

### 8.8 Margin of Safety Agent

职责：基于工具结果、材料许用值和安全系数计算裕度。

典型形式：

```text
MS = Allowable / (Actual × SafetyFactor) - 1
```

实际项目中公式可能因载荷、材料、屈曲、连接、复合材料准则而变化，因此公式必须来自受控准则或模板，而不是 Agent 自行决定。

输出示例：

```json
{
  "margins": [
    {
      "criterion": "yield",
      "location": "mounting hole H2",
      "allowable_mpa": 435,
      "actual_mpa": 312.5,
      "safety_factor": 1.25,
      "margin_of_safety": 0.114,
      "status": "pass"
    },
    {
      "criterion": "frequency",
      "requirement_hz": 100,
      "actual_hz": 128.4,
      "margin": 0.284,
      "status": "pass"
    }
  ]
}
```

### 8.9 V&V Review Agent

职责：在报告前进行验证与确认 checklist。

检查项：

- 需求是否完整；
- 工况是否覆盖；
- 单位是否一致；
- 坐标系是否一致；
- 材料是否来自批准库；
- 安全系数是否正确；
- 网格质量是否达标；
- 是否需要网格收敛性检查；
- 边界条件是否合理；
- 模型简化是否记录；
- solver warning 是否处理；
- 结果是否经过人工审核；
- 是否需要和试验或历史 case 对比。

### 8.10 Report Agent

职责：生成报告草稿。

报告必须包含：

- 仿真目的；
- 需求来源；
- 模型版本；
- 几何 / FEM 来源；
- 材料来源；
- 载荷来源；
- 边界条件；
- 简化假设；
- 网格质量；
- 求解器和版本；
- 结果摘要；
- Margin of Safety；
- V&V checklist；
- 限制条件；
- 需要人工确认项；
- 审签记录。

---

## 9. Harness 工具注册清单

### 9.1 文件和模型工具

```text
upload_model_file
inspect_model_file
parse_nastran_bdf
parse_abaqus_inp
extract_model_summary
check_unit_system
check_coordinate_system
```

### 9.2 材料工具

```text
search_material_allowable
validate_material_assignment
get_temperature_dependent_properties
```

### 9.3 载荷工具

```text
parse_load_case_table
validate_load_case
generate_load_case_matrix
check_load_unit_consistency
```

### 9.4 网格工具

```text
check_mesh_quality
summarize_mesh
detect_disconnected_components
detect_unconstrained_parts
```

### 9.5 求解工具

```text
generate_solver_deck
run_solver
get_solver_status
read_solver_log
cancel_solver_run
```

### 9.6 后处理工具

```text
extract_static_metrics
extract_modal_metrics
generate_contour_plot
identify_hotspots
calculate_margin_of_safety
compare_runs
```

### 9.7 报告工具

```text
generate_analysis_report
export_report_pdf
create_review_package
```

### 9.8 知识工具

```text
search_analysis_guidelines
search_historical_cases
save_lesson_learned_candidate
```

工具注册时每个工具都要定义：

- input schema；
- output schema；
- 允许的 case 状态；
- 需要的用户角色；
- 是否只读；
- 是否可重试；
- 是否需要人工确认；
- 最大运行时间；
- 产出文件类型；
- 审计字段；
- 失败补偿方式。

---

## 10. 任务状态机

第一版任务状态机可以设计为：

```text
created
  ↓
requirements_parsed
  ↓
model_uploaded
  ↓
model_checked
  ↓
plan_generated
  ↓
plan_approved
  ↓
solver_ready
  ↓
running
  ↓
postprocessing
  ↓
results_ready
  ↓
margin_calculated
  ↓
report_generated
  ↓
under_review
  ↓
approved / needs_revision / rejected
```

异常状态：

```text
blocked_missing_input
model_invalid
solver_failed
result_invalid
review_rejected
cancelled
```

状态机约束：

1. 没有模型检查，不能进入 `plan_generated`。
2. 没有工程师确认，不能进入 `solver_ready`。
3. solver fatal error 未处理，不能进入 `results_ready`。
4. 材料许用值来源缺失时，不能生成正式 Margin of Safety，只能生成估算风险提示。
5. 报告未审签，不能进入 `approved`。

---

## 11. 动态状态数据模型

建议从第一版就建立 Postgres 状态库。

### 11.1 `simulation_cases`

```text
simulation_cases
├── id
├── project_id
├── case_key
├── case_name
├── domain                  # structure / thermal / cfd / coupled
├── analysis_type           # static / modal / random_vibration / thermal
├── status
├── objective
├── owner_id
├── created_at
└── updated_at
```

### 11.2 `simulation_requirements`

```text
simulation_requirements
├── id
├── case_id
├── requirement_id
├── source_doc_ref
├── requirement_text
├── parsed_json
├── acceptance_criteria
├── verification_method
└── created_at
```

### 11.3 `simulation_models`

```text
simulation_models
├── id
├── case_id
├── model_type              # cad / fem / reduced_model
├── file_ref
├── file_hash
├── model_version
├── unit_system
├── coordinate_system
├── source
└── created_at
```

### 11.4 `simulation_materials`

```text
simulation_materials
├── id
├── case_id
├── material_name
├── material_standard
├── property_json
├── allowable_json
├── allowable_source_ref
├── approved
└── created_at
```

### 11.5 `simulation_load_cases`

```text
simulation_load_cases
├── id
├── case_id
├── load_case_key
├── description
├── load_type
├── direction
├── magnitude
├── unit
├── factor_type             # limit / ultimate / yield / test
├── source_ref
├── payload_json
└── created_at
```

### 11.6 `simulation_solver_runs`

```text
simulation_solver_runs
├── id
├── case_id
├── solver_name
├── solver_version
├── input_file_ref
├── status
├── started_at
├── finished_at
├── log_ref
├── error_summary
└── created_at
```

### 11.7 `simulation_results`

```text
simulation_results
├── id
├── run_id
├── result_type
├── metrics_json
├── plot_refs
├── raw_result_refs
└── created_at
```

### 11.8 `simulation_margins`

```text
simulation_margins
├── id
├── case_id
├── run_id
├── criterion
├── location_ref
├── allowable_value
├── actual_value
├── safety_factor
├── margin_of_safety
├── status
├── source_ref
└── created_at
```

### 11.9 `simulation_reviews`

```text
simulation_reviews
├── id
├── case_id
├── reviewer_id
├── review_type             # plan / model / result / report
├── status                  # pending / approved / rejected / needs_revision
├── comments
└── created_at
```

### 11.10 `simulation_tool_calls`

```text
simulation_tool_calls
├── id
├── case_id
├── tool_name
├── input_hash
├── output_hash
├── status
├── error_message_sanitized
├── started_at
└── finished_at
```

### 11.11 `simulation_audit_log`

```text
simulation_audit_log
├── id
├── case_id
├── actor_id
├── action
├── resource_type
├── resource_id
├── decision
├── reason
├── trace_id
├── redacted_payload
└── created_at
```

---

## 12. 人机协同和风险分级

航天 CAE 必须明确 Agent 的边界。

| 等级 | 动作 | 是否允许 Agent 自动执行 |
|---|---|---|
| L0 | 读取模型摘要、解析日志、查询历史案例、提取结果指标 | 可以 |
| L1 | 生成仿真计划草稿、边界条件草稿、报告草稿 | 可以生成，但需要人确认 |
| L2 | 启动求解器、计算正式裕度、生成审签包 | 必须有工程师确认 |
| L3 | 结构正式放行、替代试验结论、修改受控设计基线 | 不允许自动执行 |

关键原则：

```text
Agent 可以辅助判断，但不能成为最终责任人。
```

---

## 13. 第一版 checklist

### 13.1 输入完整性

- 是否有模型文件；
- 是否有单位系统；
- 是否有坐标系说明；
- 是否有材料；
- 是否有载荷；
- 是否有边界条件；
- 是否有验收准则；
- 是否有安全系数。

### 13.2 模型完整性

- 是否有未赋材料的单元；
- 是否有未连接部件；
- 是否有异常刚性连接；
- 是否存在自由刚体模态风险；
- 是否有重复节点；
- 是否有畸形单元；
- 是否有未定义属性。

### 13.3 工况完整性

- 是否覆盖所有要求工况；
- 是否区分 limit / ultimate；
- 是否有方向说明；
- 是否有载荷组合；
- 是否有温度条件；
- 是否有来源引用。

### 13.4 结果可信性

- 求解是否完成；
- fatal error 是否为 0；
- warning 是否审查；
- 最大应力位置是否合理；
- 最大位移位置是否合理；
- 一阶频率是否满足要求；
- 是否需要网格收敛性检查；
- 是否有奇异或约束不足风险。

### 13.5 报告完整性

- 是否列出假设；
- 是否列出模型版本；
- 是否列出材料来源；
- 是否列出载荷来源；
- 是否列出求解器版本；
- 是否列出 Margin of Safety；
- 是否列出限制条件；
- 是否有人审记录。

---

## 14. 最小可行 Demo

建议 Demo 设计为：

```text
卫星电子设备安装支架结构分析 Agent
```

输入：

```text
1. 一个支架 BDF / INP 文件；
2. 材料：Aluminum 7075-T7351 或项目批准材料；
3. 载荷：X / Y / Z 三向准静态加速度；
4. 约束：四个安装孔固定；
5. 要求：一阶频率 > 100 Hz，Margin of Safety > 0；
6. 报告模板。
```

Agent 流程：

```text
1. 解析模型；
2. 检查材料和单元；
3. 解析三向载荷工况；
4. 生成静力 + 模态分析计划；
5. 工程师确认计划；
6. 调用求解器；
7. 解析最大应力、位移、一阶频率；
8. 计算 Margin of Safety；
9. 生成报告草稿；
10. 标记需人工确认项；
11. 进入审核流程。
```

输出：

```text
模型检查报告
载荷工况检查报告
求解日志摘要
静力结果表
模态结果表
Margin of Safety 表
风险和待确认项
Markdown / PDF 报告草稿
审核记录
```

---

## 15. 技术落地建议

### 15.1 MVP 工具栈

如果偏开源验证：

| 能力 | 建议工具 |
|---|---|
| FEM 解析 | `pyNastran`、自定义 BDF parser |
| 求解 | CalculiX / Code_Aster / 可选 Nastran-compatible solver |
| 后处理 | pyNastran、PyVista、ParaView |
| 报告 | Markdown、Pandoc、LaTeX |
| 状态库 | Postgres |
| 文件存储 | 本地文件系统 / MinIO |
| Agent 模型 | DeepSeek |
| Harness | Python / TypeScript 服务 |

如果偏工业真实环境：

| 能力 | 可能选择 |
|---|---|
| 求解器 | MSC Nastran、NX Nastran、Abaqus、Ansys、OptiStruct |
| 后处理 | Abaqus Python、Ansys DPF、pyNastran、HyperView 脚本 |
| 文件 | NAS / 对象存储 / PLM 文件引用 |
| 状态 | Postgres + 审计日志 |
| 知识 | 企业知识库 / RAG / GraphRAG |
| 权限 | SSO / RBAC / 项目权限 |

### 15.2 服务模块

```text
cae-task-service
  - case、状态机、命令、审查、反馈

cae-tool-gateway
  - 工具注册、schema、权限、审计、幂等

cae-file-service
  - 模型、结果、报告文件索引和 hash

cae-runner
  - 求解器任务队列、容器 / HPC 调度、日志采集

cae-postprocess-service
  - 结果解析、指标提取、云图生成

cae-agent-runtime
  - DeepSeek 调用、上下文装配、Agent / Skill 编排

cae-knowledge-service
  - 历史 case、规范、错误经验、报告模板检索
```

---

## 16. 分阶段路线图

### Phase 0：定义样板 case

输出物：

- 选定一种结构件；
- 选定输入格式；
- 选定求解器；
- 定义载荷表模板；
- 定义报告模板；
- 定义 checklist。

### Phase 1：脚本化工具链跑通

先不接 Agent，手工 / 脚本跑通：

```text
读取 FEM
  ↓
模型检查
  ↓
调用 solver
  ↓
解析结果
  ↓
计算 Margin of Safety
  ↓
生成 Markdown 报告
```

### Phase 2：工具封装与状态库

把每一步封成工具，并写入 Postgres：

```text
parse_model
check_model
validate_load_cases
run_solver
parse_results
calculate_margin
generate_report
```

### Phase 3：DeepSeek Harness 接入

让 DeepSeek 在 Harness 中完成：

- 需求解析；
- 仿真计划生成；
- 缺失信息提示；
- 求解日志解释；
- 结果解释；
- 报告草稿生成。

### Phase 4：人审与审计闭环

加入：

- 仿真计划审批；
- 材料许用值确认；
- 载荷工况确认；
- 求解执行确认；
- 结果审核；
- 报告审签；
- 审计日志。

### Phase 5：知识沉淀

沉淀：

- 典型结构件模板；
- 典型载荷工况；
- 常见 solver error；
- 常见建模问题；
- 历史 case；
- 审查意见；
- 报告模板。

### Phase 6：扩展分析类型

在静力 + 模态跑通后，再扩展：

- 正弦振动；
- 随机振动；
- 冲击；
- 热分析；
- 热-结构耦合；
- 试验相关性。

---

## 17. 对 DeepSeek Harness 产品能力的反向要求

这个应用场景可以反推 DeepSeek Harness 至少需要这些能力：

1. **长任务状态管理**：CAE 求解不是秒级问答，需要等待、恢复、失败处理。
2. **强 Tool Registry**：每个工具必须有 schema、权限、状态约束、审计和超时。
3. **文件型任务支持**：模型、结果、日志、报告都是文件资产，不能只处理文本消息。
4. **人审节点**：计划、材料、载荷、求解、结果和报告都要支持人工确认。
5. **多 Agent 编排**：需求、模型、材料、网格、求解、后处理、裕度、报告应分工。
6. **领域知识接入**：材料库、规范、历史 case、solver error 经验都要作为可检索知识。
7. **可复现 trace**：每个 case 要能追溯输入文件 hash、工具版本、solver 版本、参数和结果。
8. **安全边界**：不允许 Agent 直接 shell 任意执行、不允许改受控设计基线、不允许自动发布正式结论。
9. **评测机制**：报告质量、日志解释准确率、模型检查召回率、裕度计算正确性都需要回归测试。
10. **企业集成**：后续要能接 PLM、PDM、HPC 调度、材料库、文档系统和审签系统。

如果 DeepSeek Harness 能支撑这个场景，说明它已经不只是模型调用框架，而是具备进入严肃工程任务流的潜力。

---

## 18. 风险与边界

| 风险 | 表现 | 控制方式 |
|---|---|---|
| Agent 编造结果 | 未运行求解器却给出应力和频率 | 关键数值必须来自工具结果，报告标明来源 |
| 材料许用值错误 | 使用未经批准数据计算裕度 | 材料库批准状态校验，缺失时阻塞正式 MS |
| 工况遗漏 | 少算关键载荷方向或组合 | load case checklist 和人工确认 |
| 单位 / 坐标系错误 | g、N、mm、m 混淆 | schema + 单位工具 + 报告显式展示 |
| 模型缺陷未发现 | 未连接部件、约束不足、奇异 | Model Check + Solver Log Review |
| 自动结论越权 | Agent 直接给出放行判断 | L2 / L3 动作必须人审，Agent 只给草稿 |
| 文件版本混乱 | 报告和结果对应错误模型 | file hash、case version、run_id 强绑定 |
| 审计不足 | 事后无法追溯 | trace_id、tool_call_id、audit_log 全链路记录 |

---

## 19. 与 AI Native 任务闭环平台的关系

航天 CAE Simulation Agent 可以作为 AI Native 任务闭环平台在工程研发场景里的样板。

| AI Native 平台层 | CAE Agent 中的体现 |
|---|---|
| 连接层 | CAD / FEM / Solver / 后处理 / 材料库 / PLM / 报告系统 |
| 语义层 | 零件、材料、载荷、约束、工况、频率、裕度、报告 |
| 知识层 | 仿真规范、历史 case、材料手册、solver error 经验 |
| 任务层 | simulation case、run、review、iteration、approval |
| AI 能力层 | 需求解析、日志解释、结果摘要、报告生成 |
| 治理层 | 权限、审计、版本、材料来源、审签 |
| 反馈层 | 工程师修改、审核意见、case 复盘、知识候选 |
| 经营归因层 | 研发周期缩短、试验次数减少、设计风险降低 |

它不是一个孤立 Agent，而是一条高价值工程任务流：

```text
仿真需求 → 仿真任务 → 工具执行 → 结果解释 → 人审 → 报告 → 设计迭代 → 经验复用
```

---

## 20. 下一步可执行事项

如果要继续落地，可以按这个顺序推进：

1. 选定第一个样板对象：卫星设备安装支架 / 电子设备安装板 / 舱段局部结构。
2. 选定第一版输入格式：优先 BDF 或 INP。
3. 确定第一版求解器：Nastran 系、Abaqus、Ansys 或开源替代。
4. 写出载荷工况表模板和报告模板。
5. 建立最小数据模型和任务状态机。
6. 封装 `parse_model`、`check_model`、`run_solver`、`parse_results`、`calculate_margin`、`generate_report` 六个工具。
7. 接入 DeepSeek 做需求解析、日志解释和报告草稿。
8. 增加计划审批、结果审核和报告审签。
9. 用 3-5 个历史 case 做回归测试。
10. 再扩展到随机振动、热分析或试验相关性。
