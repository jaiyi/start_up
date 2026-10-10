# SPC × DeepSeek Harness 架构设计稿

- 版本：v0.3.1（讨论稿，未实施）
- 日期基线：2026-09-29 会话对齐方向；2026-10-10 三轮架构评审（插件重组 → 多 profile 平台化 → 计算节点模型）
- 状态：设计框架已与用户对齐方向；细节含未决问题（见 [07-open-questions.md](07-open-questions.md)）
- 范围声明：本文档是架构规划，不是集成完成声明。未加载插件、未运行测试、未部署、未取得线上 receipt。

## 1. 决策背景

现有 SPC 实现分散在四个仓库（`lads`、`demos`、`dsruntime`、`workstation-iclaw`），对齐繁琐、升级困难。
经头脑风暴式讨论，用户已拍板：

1. **全盘替代**：现有 runtime/dsClaw 工单链、demos iweb 诊断面板全部替代，DSH 成为 SPC 的统一 Agent 平台。
2. **计算外挂**：SPC 计算（判异、控制限训练、CPK）由 agent 挂到后端服务器独立进程执行。
3. **统一 profile + 工作台**：SPC 整体封装成一个 profile，含专属工作台 UI（调试模式 + 运营模式）。
4. **管理面前置**：后端服务的部署、建表、升级由前台插件统一发起和管理。

2026-10-10 第一轮评审（结构重组）：

5. **插件按"进程边界 + 领域"重组**：原 A–F 六插件按功能动作切分，导致工单域横跨三个插件无 owner、HTTP 边界能力四处重复建设、共享纪律无家可归。重组为 4 插件 + 2 共享库。
6. **工单落库移至后端**：`spc.alert_events`（工单）由后端判异引擎直接写入；DSH 侧 POST 退化为"唤醒推理"信号。消除"DSH 宕机期间工单不存在"的底线破口。

2026-10-10 第二轮评审（多 profile 平台视角）——**SPC 只是第一个应用，后续还有拧紧判异 profile、工厂排产 profile 等**。插件化的动机之一就是跨 profile 复用组合；连接公司业务系统（MCP/API）的接口需要统一治理。据此追加：

7. **平台资产与应用资产分层**：HTTP 边界（gateway）、审计/幂等/发布流水线等纪律（core）、通用工单引擎、运维治理（ops）、外部系统集成治理（integration）、任务派单客户端（compute-client）——全部上移为**平台资产**，独立版本化，跨 profile 复用。profile 只装业务差异（诊断能力、配置引导、Pack schema、服务注册）。
8. **补齐集成域**：新增 connection/integration 治理域——连接器注册表、凭据管理、端点白名单、出入站审计；持续取数管道归运行面（后端），交互式查询归管理面（DSH 侧工具/MCP 适配器）。
9. **结构先行，实现按需**：平台化的**归属划分现在定**（命名、目录、schema 分域——成本低）；通用化工单引擎与完整连接器注册表的**实现等第二个 profile 或第一个真实业务系统连接出现时再做**。为复用而结构化，不为复用而实现。

2026-10-10 第三轮评审（计算节点模型）——后端重新定义为**通用计算节点**：具备计算与存储能力的 Docker，独立自持运行；SPC 只是挂载其上的第一个工作负载。管理（算什么/怎么算/pipeline 怎么搭）全部收拢到 DSH 侧，经版本化工件**管理时发布**（不是运行时控制），节点从 PG 读配置自持运行。据此追加：

2026-10-10 第二轮评审（多 profile 平台视角）——**SPC 只是第一个应用，后续还有拧紧判异 profile、工厂排产 profile 等**。插件化的动机之一就是跨 profile 复用组合；连接公司业务系统（MCP/API）的接口需要统一治理。据此追加：

7. **平台资产与应用资产分层**：HTTP 边界（gateway）、审计/幂等/发布流水线等纪律（core）、通用工单引擎、运维治理（ops）、外部系统集成治理（integration）、任务派单客户端（compute-client）——全部上移为**平台资产**，独立版本化，跨 profile 复用。profile 只装业务差异（诊断能力、配置引导、Pack schema、服务注册）。
8. **补齐集成域**：新增 connection/integration 治理域——连接器注册表、凭据管理、端点白名单、出入站审计；持续取数管道归运行面（后端），交互式查询归管理面（DSH 侧工具/MCP 适配器）。
9. **结构先行，实现按需**：平台化的**归属划分现在定**（命名、目录、schema 分域——成本低）；通用化工单引擎与完整连接器注册表的**实现等第二个 profile 或第一个真实业务系统连接出现时再做**。为复用而结构化，不为复用而实现。

2026-10-10 第三轮评审（计算节点模型）——后端重新定义为**通用计算节点**：具备计算与存储能力的 Docker，独立自持运行；SPC 只是挂载其上的第一个工作负载。管理（算什么/怎么算/pipeline 怎么搭）全部收拢到 DSH 侧，经版本化工件**管理时发布**（不是运行时控制），节点从 PG 读配置自持运行。据此追加：

10. **计算节点 + 算子 + 流水线三层资产**：复用单位从"整个后端服务"细化为算子 + 流水线定义；后续 profile 往节点挂载算子与流水线，不需要各自的后端。
11. **计算定义与诊断知识对称治理**：算子/流水线定义与 Diagnosis Pack 走同一条发布流水线——模型只产候选、专家审批后版本化生效，00 §3.4 原则推广到计算面。

## 2. 目标形态

```text
DSH 宿主（平台，server 模式常驻）
├── 平台资产（跨 profile 复用，独立版本化）
│   ├── platform-core      审计/幂等/db/发布流水线/时间纪律
│   ├── platform-gateway   唯一 HTTP 边界 + 路由组挂载 API
│   ├── plugin-workorder   通用工单引擎（判异类 profile 共用：gate/会话/反馈闭环）
│   ├── plugin-ops         受管服务注册表 + deploy/migrate/status
│   ├── plugin-integration 连接器治理（注册表/凭据/白名单/审计）
│   └── compute-client     后端任务派单客户端（平台契约）
│
├── Profile: spc-station（薄）
│     ├── spc 路由组（挂载进 platform-gateway）
│     ├── spc 诊断能力（evidence/fault-tree 工具，实现 workorder 领域接口）
│     ├── spc 配置引导工具 + SPC Pack schema（注册进发布流水线）
│     ├── 专属 SPC 工作台（调试模式 + 运营模式）
│     └── 服务注册：spc-backend 描述符（挂进 plugin-ops）
│
└── Profile: tightening-station / scheduling-station（未来，同样薄）

运行面
├── 计算节点（通用计算 + 存储 Docker，独立自持；任务契约为平台契约）
│     ├── 算子库（判异/训练/分析 —— lads 算法层平移，随节点部署发布）
│     ├── 流水线运行器（从 PG 读已发布的流水线定义编排算子，不从 DSH 取）
│     ├── 任务执行器（接 compute-client 派单，完成后回调 gateway）
│     ├── 工单落库（判异确认异常 → 写 alert_events，POST 仅作唤醒信号）
│     └── 集成管道（持续取数/回写，integration 域的运行面执行器）
└── PostgreSQL 单实例
      ├── platform schema（审计/迁移记录/连接器注册表）
      ├── spc schema（业务表 + 流水线定义发布）
      └── tightening / sched schema（未来）
```

## 3. 核心边界（不因换宿主而消失的底线）

### 3.1 管理面与运行面分离

- 插件管"发命令"，后端管"自己活着"。
- 部署完成后，计算进程与数据库自持运行；DSH 重启/宕机不影响判异、工单落库、持续取数与告警累积。
- 工单由后端落库（决策 6）：DSH 宕机期间工单照常创建与累积；DSH 恢复后补唤醒、补推理（机制见 [03-backend-compute.md](03-backend-compute.md) §4）。
- 飞书提醒主路径在 DSH 侧（诊断会话创建后发送）；后端唤醒投递重试耗尽走死信记录 + 运维告警，不静默。
- ops 域的操作（deploy/migrate/rollback）要求运维角色权限 + 审计事件；模型只能读 status。

### 3.2 建表：插件来跑，模型不写 DDL

| 内容 | 产生方式 | 入库方式 |
|---|---|---|
| schema DDL | 人写的版本化迁移文件，随 profile 发布 | plugin-ops 迁移 runner 幂等执行，逐版本记录 |
| 工艺配置 | Agent 引导生成 + schema 校验 | 人工确认后由 spc profile 的知识配置能力写入配置表 |
| 故障树 / Diagnosis Pack | 调试模式迭代 | 校验 → 审批 → 版本发布 |
| 流水线定义（算子编排/参数） | Agent 引导产候选 + schema 校验 | 校验 → 审批 → 版本发布；计算节点从 PG 读已发布版本自持运行 |
| 集成连接器 | Agent 引导生成草案 + 契约校验 | 审批后注册进连接器注册表 |

**模型不得现场生成并执行 `CREATE TABLE`。**
迁移 runner 平移 lads `SpcSchemaManager` 的幂等模式（`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`），
叠加 `schema_migrations` 版本表与审计。**schema 按域分目录独立演进**（platform / spc / 未来 tightening、sched），见 [04-data-and-schema.md](04-data-and-schema.md) §2。

### 3.3 五个人工 gate 保留

问题定性 → 诊断路径 → 根因查证 → 措施决策 → 效果观察与闭环。
在 DSH 工作台做成状态机 + 审计事件；Agent 推理辅助每个 gate，**gate 推进和关单由人操作**。
gate 状态机由 plugin-workorder 通用引擎承载，gate 数量与语义可由 profile 声明（拧紧判异是否同构五-gate 见 [07-open-questions.md](07-open-questions.md) Q14）。

### 3.4 Agent 不改生产知识（≠ 运营模式只读）

- 运营模式持续写**业务数据**：诊断会话、证据快照、根因结论、gate 推进、效果观察、反馈——这是闭环和故障树迭代的原材料，必须留存。
- 运营模式禁止写**生产知识**：故障树、控制限、SPC 规则、设备参数、**流水线定义**——这些只在调试模式产出候选，经校验、专家批准、版本发布后进运营模式。
- 模型可提议映射和分支，不能直写生产故障树、控制限、SPC 规则。
- **推广到公司业务系统**：模型对业务系统（MES/ERP/QMS 等）的写操作只能产出草案/待审批动作，**回写必须人工 gate**——与"不改生产知识"同一类边界（细则见 [07-open-questions.md](07-open-questions.md) Q15）。

### 3.5 事件幂等与真相源

- 沿用确定性 `event_id` 设计（uuid5 + 时间桶），后端与 DSH 侧不得各造身份。
- 工单/诊断会话唯一真相源 = 持久层（Postgres，非 DSH 会话内存）。
- 诊断会话必须固定当次使用的 Pack/知识投影版本（现有 `diagnosis_session` 缺失的字段，替代版补上）。
- 数据表写权限有唯一 owner（后端/平台引擎/域插件按列组划分），见 [04-data-and-schema.md](04-data-and-schema.md) §6。

### 3.6 平台资产的版本化纪律（2026-10-10 新增）

- 平台包（platform-core / platform-gateway / plugin-workorder / plugin-ops / plugin-integration / compute-client）**独立版本号 + changelog**，profile 声明依赖版本范围。
- spc profile 升级平台包不得静默破坏其他 profile；破坏性变更必须 major 版本 + 迁移说明。
- `schema_migrations` 按 schema 分目录独立演进，互不干扰。

## 4. 主线：一条告警事件就是一张工单

```text
告警事件（= 工单，后端判异确认后自行落库）
  → 后端 POST platform-gateway /spc/alerts（唤醒信号，event_id 幂等）
  → platform-gateway 校验签名与幂等 → 委托 plugin-workorder 唤醒推理会话
  → 创建诊断会话（固定 Pack/知识版本）
  → 五-gate：问题定性 → 诊断路径 → 根因查证 → 措施决策 → 效果观察
  → 结论与根因落库 → 人工闭环
  → 结论回流反馈表 → 驱动故障树迭代（调试模式）
```

飞书推送是**旁路提醒**（让人知道有工单待处理），不是主线；闭环全部在工作台/诊断会话内完成。

## 5. 两种模式

| | 调试模式 | 运营模式 |
|---|---|---|
| 用途 | 故障树迭代、配置调参、历史事件回放 | 工单诊断、告警响应、闭环 |
| 写业务数据（会话/结论/反馈） | 可 | **可（主线依赖）** |
| 写生产知识（故障树/规则/控制限） | 可写候选 | **禁止**（仅消费已发布版本） |
| 知识变更 | 随意改候选 Pack | 仅经审批发布的新版本生效 |
| 对业务系统回写 | 草案/待审批动作 | **禁止自动回写**，人工 gate 后执行 |
| 飞书推送 | 不触发 | 提醒用，非主线 |

## 6. 迁移策略

- **不切流、直接新建**：现有四仓无线上流量（e2e 报告 NOT RUN，无 live identifiers），旧仓封存作参考实现与算法库。
- 可平移：lads SPC 算法层、数据库表结构与迁移文件、故障树/Pack YAML 格式与校验逻辑、五-gate 流程语义。
- 需重写：demos pipeline 编排（改 compute-client 派单）、iweb 面板（改新工作台 UI）、dsClaw 工单/审核流（改 plugin-workorder + platform-gateway API）、飞书推送（DSH 侧新接）。
- 作废：runtime Bundle composition 路由（DSH 自任路由层）。
- **实施节奏（决策 9）**：首交付物不变——后端 + PG + 假告警落库 + 单事件诊断链跑通（不依赖 UI/飞书/ops/完整 integration）；平台资产的通用化实现按需推进。

## 7. 最大的技术未知数（第一刀）

**DSH 常驻 server + 外部 POST 唤醒会话，未验证。**
当前仅核对过 CLI 形态（`@deepseek-ai/dsh@0.2.0-rc.2`）与插件注册 API 类型声明。
若 spike 失败，唤醒机制退化为轮询——且因工单已由后端落库（决策 6），退化路径平滑：DSH 侧轮询扫描 `alert_events` 即可，无需新增落库链路；但 platform-gateway 形态需重评。

Spike 验证步骤见 [06-spike-plan.md](06-spike-plan.md)。

## 8. 文档索引

- [01-architecture.md](01-architecture.md) — 架构总览与模块职责（平台/应用两层）
- [02-plugins.md](02-plugins.md) — 平台资产与 spc profile 结构与接口清单
- [03-backend-compute.md](03-backend-compute.md) — 计算节点、算子/流水线与平台任务契约
- [04-data-and-schema.md](04-data-and-schema.md) — 数据层、schema 分域、建表与迁移治理
- [05-diagnosis-and-learning.md](05-diagnosis-and-learning.md) — 诊断工作流、Pack 契约与自学习闭环
- [06-spike-plan.md](06-spike-plan.md) — 第一刀技术 spike 验证清单
- [07-open-questions.md](07-open-questions.md) — 未决问题与风险登记
