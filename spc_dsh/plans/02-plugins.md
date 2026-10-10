# 平台资产与 spc profile 结构

> 上游：[00-overview.md](00-overview.md)
> v0.3（2026-10-10 第二轮评审）：按多 profile 平台视角分层——SPC 只是第一个应用（后续拧紧判异、工厂排产等），插件化的动机之一是跨 profile 复用。原 v0.1 六插件 → v0.2 四插件两轮重组的映射见 §10。

所有插件为 TS（Cordis `apply(ctx)` + `defineTool`），通过 `ctx.tools.register` 注册模型可调用工具；
**仅 platform-gateway 含 HTTP 路由**。接口以下为**设计稿**，字段在 spike 后定稿。

## 0. 拆分原则

1. **平台资产 / 应用资产两层**：HTTP 边界、共享纪律、通用工单引擎、运维治理、集成治理、任务客户端是平台资产，独立版本化跨 profile 复用；profile 只装业务差异（诊断能力、配置引导、Pack schema、服务注册、路由组）。
2. **HTTP 边界唯一化且平台化**：DSH 宿主只有一个 HTTP 面。全部外部入口集中在 platform-gateway，profile 以路由组挂载，鉴权/审计/幂等中间件全局一份——避免"跨 profile 各建边界"重演"跨插件各建边界"的错误。
3. **域逻辑归域，平台引擎不装业务**：plugin-workorder 承载与工艺无关的工单/gate/会话/反馈引擎；SPC 特有的证据与故障树查询作为能力提供者由 profile 注入。
4. **集成治理横跨两个平面**：持续管道归运行面（后端），交互式查询归管理面（DSH 工具），治理层（注册表/凭据/白名单/审计）唯一。
5. **结构先行，实现按需**：归属划分现在定（命名/目录/schema 分域，成本低）；通用化实现等第二个 profile 或第一个真实业务系统连接出现（详见 §9）。
6. **后端拥有的数据由后端写**：`spc.alert_events`（工单）由后端判异引擎落库；DSH 侧只更新处理状态列。写权限矩阵见 [04-data-and-schema.md](04-data-and-schema.md) §6。

## 1. platform-core（平台共享内核，非插件）

| 模块 | 职责 |
|---|---|
| `audit` | append-only 审计事件写入；持久化失败向调用方抛错，不伪造成功 |
| `idempotency` | 幂等键统一管理：`event_id`（告警唤醒）/ `request_id`（gate 推进）/ `idempotency_key`（计算任务）三种键的生成与去重入口 |
| `db` | PG 访问层（repository 模式）：连接管理、事务、按写权限矩阵约束写路径 |
| `release-pipeline` | 版本化发布流水线（版本递增、digest、审批人、审计）——Pack / config / 连接器定义 / **流水线定义**共用；校验器可注册（各 profile 注册自己的 schema） |
| `pack-validation` | 校验框架（路径穿越/敏感值/资源存在性/引用完整性，平移 pack_loader）；资源白名单按被校验物声明。SPC Pack schema 由 spc profile 注册 |
| `time` | `business_alert_time` 时区纪律（历史证据查询的包含式上界） |

## 2. platform-gateway（平台 HTTP 边界）

职责：全部 HTTP 入口的路由、鉴权、幂等去重、审计。**不含域逻辑**——每个路由组委托对应域插件/profile 的内部服务。

**路由组挂载 API**：profile 声明路由组（前缀按 profile 命名空间隔离，如 `/spc/*`、未来 `/tightening/*`），挂载进平台中间件链。

| 路由组 | 方向 | 鉴权 | 委托 |
|---|---|---|---|
| `POST /spc/alerts` | 后端 → DSH（唤醒信号） | HMAC 签名 | plugin-workorder `wakeDiagnosis`（spc 能力注入） |
| `POST /api/tasks/callback` | 后端 → DSH（任务完成） | HMAC 签名 | compute-client 回调消费方 |
| `/api/gates/*`、`/api/diagnosis/*`、`/api/alerts/*` | UI → DSH | 用户 token | plugin-workorder |
| `/api/knowledge/*` | UI → DSH | 用户 token（发布需专家/运维角色） | spc 知识配置能力 |
| `/api/ops/*` | UI/运维 → DSH | 运维角色 | plugin-ops |
| `/api/integrations/*` | UI → DSH | 用户 token（注册需审批角色） | plugin-integration |

要点：

- **工单已由后端落库**：`/spc/alerts` 的语义是"唤醒推理"，校验失败只影响唤醒，不影响工单存在性。
- 以 `event_id` 幂等去重；重复唤醒返回既有诊断会话引用，不重复推理。
- DSH 恢复（进程启动）时扫描 `alert_events` 中未唤醒/未诊断的工单补触发推理（兜底后端重试耗尽；机制见 [07-open-questions.md](07-open-questions.md) Q10）。
- 鉴权/审计/幂等中间件全部来自 platform-core，gateway 只做路由装配——它应当是全部组件里最薄的一个。
- **未决**：DSH server 模式 HTTP 能力是否存在、会话外部唤醒 API 形态——见 [06-spike-plan.md](06-spike-plan.md)。

## 3. plugin-workorder（通用工单引擎，平台插件）

职责：判异类 profile 的通用工单引擎——工单处理状态、gate 状态机、诊断会话生命周期、反馈闭环、飞书旁路提醒。**不含任何 SPC 特有逻辑**；诊断的具体能力由 profile 以**能力提供者接口**注入。

能力提供者接口（profile 实现）：

| 接口 | spc profile 的实现 |
|---|---|
| `collectEvidence(event_context)` | `query_spc_evidence`（控制图/控制限历史/违规记录） |
| `queryKnowledge(pack_id@version, anchor)` | `query_fault_tree`（有界图查询） |
| `proposeDiagnosis(event_context)` | `run_diagnosis` 的 SPC 诊断推理 |

> 边界纪律随接口下沉为引擎契约：`business_alert_time` 包含式上界语义、未注册 process_key / 无已发布 Pack 显式失败**不回退默认工艺**（吸取现有 detector/provider 回退 Glue 的教训）、会话固定 `pack_id@version` 与知识投影版本、输出区分事实/候选/待查证。

模型可调用工具：

| 工具 | 输入要点 | 输出 |
|---|---|---|
| `run_diagnosis` | 事件上下文 | 证据 + 候选原因（引用知识节点）+ 待人工检查项 + 候选措施 + 警告 |
| `get_diagnosis_session` | `session_id` | 会话状态、已走 gate、当时 Pack/知识版本 |

内部服务（供 platform-gateway 调用，非模型工具）：

| 服务 | 说明 |
|---|---|
| `wakeDiagnosis(event_id)` | 幂等创建/唤醒诊断会话（固定 `pack_id@version`）→ 编排能力提供者 → 产物落库挂到工单 → 飞书提醒 |
| `advanceGate(session_id, decision, request_id, actor)` | 人工推进 gate；`request_id` 幂等；审计持久化失败不返回成功（对齐现有 advance bridge 语义） |
| `listAlerts / getAlert / getDiagnosis` | UI API 的读路径 |

要点：

- gate 状态机通用：数量与语义由 profile 的 Pack/配置声明（SPC 五-gate；拧紧判异是否同构见 [07-open-questions.md](07-open-questions.md) Q14）。
- 工单处理状态列（`workorder_status`/`notify_status`）由本引擎更新；事件事实列由后端写。
- 飞书凭据走环境变量/secret；推送失败落库"通知失败"状态供重发，不吞。
- 单一反馈表（gate 结论/误报标注/专家修正）统一血缘：`source_event_id` + `process_key` + `pack_id@version` + 知识投影版本。

## 4. plugin-ops（受管服务治理，平台插件）

职责：受管服务注册表 + deploy/migrate/status 治理。受管对象是**计算节点**（通用计算+存储的 Docker，见 [03-backend-compute.md](03-backend-compute.md) §1）——profile 注册服务描述符（服务名、部署目标、迁移目录、健康端点、schema 归属），ops 对注册表统一执行。算子随节点部署发布；流水线定义走 platform-core 发布流水线（治理面，非 ops 职责）。操作经 platform-gateway `/api/ops/*` 由人触发；模型只能调用 status 工具。

| 工具/操作 | 权限 | 说明 |
|---|---|---|
| `deploy_backend(service, release)` | 运维角色（人经 ops 路由触发） | 部署/升级注册表中指定服务，返回 receipt（版本、目标、时间、执行者） |
| `migrate_schema(service, target_version?)` | 运维角色 | 按序执行该服务 schema 目录下的迁移，`schema_migrations` 记录；失败即停 |
| `get_service_status(service)` | 只读（模型可调用） | 服务存活、队列深度、schema 版本、最近告警 |
| `rollback_backend(service)` | 运维角色 | 服务回滚；schema 回滚走快照策略（[04-data-and-schema.md](04-data-and-schema.md) §2） |

要点：

- **模型只能调用 status**；deploy/migrate/rollback 必须人触发。
- 部署目标与方式未决（systemd/docker/公司平台），见 [07-open-questions.md](07-open-questions.md) Q2。
- 全部操作落审计事件（platform-core audit）。

## 5. plugin-integration（外部系统集成治理，平台插件）

职责：公司业务系统（MES/ERP/QMS/设备等）连接的统一治理。**gateway 管"别人进来"，integration 管"我们出去 + 业务系统主动进来"**——两者严格区分。

| 组件 | 职责 |
|---|---|
| 连接器注册表 | 版本化连接器定义：端点、协议（REST/MCP/消息队列）、契约 schema、限流、重试/熔断策略；候选 → 契约校验 → 审批 → 发布（platform-core release-pipeline） |
| 凭据管理 | secret 引用，不进 Git（原 Q7"飞书凭据"升级为通用凭据治理） |
| 端点白名单与审计 | 所有出入站调用留痕；未注册端点拒绝调用 |
| 运行面管道（后端执行） | 持续取数（测量数据/拧紧曲线流）、回写——DSH 宕机不断流 |
| 管理面适配器（DSH 侧） | 诊断/调试中的交互式查询（MCP 适配器 / 模型工具） |

模型可调用工具（交互式查询）：

| 工具 | 说明 |
|---|---|
| `query_business_system(connector_id, query)` | 按注册表契约的只读查询；限流与审计 |
| `draft_writeback(connector_id, operation)` | **只产出草案**——回写类操作必须人工 gate 后由 integration 执行（00 §3.4 推广边界） |

要点：

- 持续取数管道在**后端**运行——判异不断流的底线要求；DSH 侧只做交互式查询。
- 回写边界与审批链细则见 [07-open-questions.md](07-open-questions.md) Q15。
- 首批目标系统与协议见 [07-open-questions.md](07-open-questions.md) Q11——**连接器注册表的完整实现等第一个真实连接出现时再做**（§9 原则），首版只需要凭据管理与白名单骨架。

## 6. compute-client（平台共享库）

- 接口：`submitComputeTask(task_type, params, idempotency_key, requested_by)`、`getTaskStatus(task_id)`、`onTaskCallback(consumer)`。
- 任务契约（派单/状态/回调/幂等）为**平台契约**（[03-backend-compute.md](03-backend-compute.md) §3）——任何受管后端服务的任务派单都走它。
- 消费方：spc 知识配置能力（调试模式回放派单）、人工触发场景；运营例行任务由后端 cron 自持。
- 后续 profile（拧紧判异）复用同一客户端与任务契约；是否复用 SPC 后端执行器见 [07-open-questions.md](07-open-questions.md) Q12。

## 7. Profile: spc-station（薄）

profile 内含**路由组声明 + 诊断能力提供者 + 配置引导工具 + Pack schema 注册 + 服务注册**，不含任何边界/引擎/治理逻辑。

### 7.1 spc 诊断能力（实现 plugin-workorder 能力提供者接口）

| 提供者 | 说明 |
|---|---|
| `collectEvidence` | 控制图数据、控制限历史、违规记录（含版本与来源）；`business_alert_time` 为包含式上界，必带时区 |
| `queryKnowledge` | SPC Pack 声明的故障树有界图查询（深度/节点/边/超时受限） |
| `proposeDiagnosis` | SPC 诊断推理（事实/候选/待查证三段式） |

### 7.2 spc 配置引导工具（模型可调用）

| 工具 | 输入要点 | 输出 | 模型可写？ |
|---|---|---|---|
| `guide_data_source` | 用户描述的数据源 | **集成域连接器候选定义**（交 plugin-integration 注册治理）+ 取数配置草案 | 草案可写，发布/注册需人工 |
| `guide_window_split` | 工艺、检测项、分组方式 | window 分割配置草案 | 同上 |
| `guide_spc_params` | 工艺类型、控制图类型建议（imr/xbar_r/ewma/cusum） | 参数草案（含建议理由） | 同上 |
| `edit_candidate_pack` | 候选 Pack 修改 | 校验结果（platform-core pack-validation + SPC schema） | 候选可写，发布需人工 |
| `run_replay` | 候选 Pack + 历史事件范围 | 回放对比报告（增益/回归） | 可发起，结论仅供参考 |
| `publish_config` / `publish_pack` | 草案/候选 + 审批人 | 版本落库（release-pipeline） | 否，需运维/专家角色 |

内部服务（供 platform-gateway `/api/knowledge/*` 调用）：候选 Pack 读写、回放报告查询、发布审批。

回放编排：经 compute-client 派单 `evaluate_batch` → plugin-workorder 诊断编排对历史事件跑候选 Pack → 对比候选根因与已知结论。发布流水线语义见 [05-diagnosis-and-learning.md](05-diagnosis-and-learning.md) §2。

### 7.3 服务注册与 schema 归属

- `spc-backend` 服务描述符：部署目标、迁移目录（`spc` schema）、健康端点。**受管对象是通用计算节点**（算子随节点部署、流水线定义经发布流水线挂载，见 [03-backend-compute.md](03-backend-compute.md) §1/§5）。
- SPC Pack schema 注册进 platform-core release-pipeline（pack-validation 的 SPC 实例）。

## 8. 职责边界速查

| 关注点 | 唯一 owner |
|---|---|
| HTTP 路由/鉴权/幂等去重 | platform-gateway（中间件来自 platform-core） |
| 工单处理状态/gate/诊断会话状态机 | plugin-workorder |
| SPC 证据/故障树查询 | spc profile 诊断能力（实现 workorder 接口） |
| 配置与 Pack 的候选 → 发布流水线 | platform-core release-pipeline；spc profile 注册 schema 并编排 |
| 部署/迁移/回滚/受管服务注册表 | plugin-ops |
| 外部系统连接/凭据/白名单/出入站审计 | plugin-integration |
| 计算任务派单客户端与平台契约 | compute-client |
| 审计/幂等键/DB 访问/校验框架 | platform-core |
| 工单创建（`spc.alert_events` 写入） | 后端判异引擎 |

数据表级写权限矩阵见 [04-data-and-schema.md](04-data-and-schema.md) §6。

## 9. 实施纪律：为复用而结构化，不为复用而实现

- **现在做**（结构决策，成本低）：命名、目录、包归属、schema 分域、接口边界划分、平台包独立版本号。
- **等触发再做**（通用化实现）：
  - plugin-workorder 的能力提供者接口**先按 SPC 完整实现一次**，接口边界划清楚；拧紧 profile 落地时再抽通用——**不写空转的通用引擎**。
  - plugin-integration 的完整连接器注册表等第一个真实业务系统连接（Q11）出现再做；首版只需凭据管理 + 白名单骨架。
  - plugin-ops 的多服务并发治理等第二个后端服务出现（Q12）再补。
- 首交付物不变：后端 + PG + 假告警落库 + 单事件诊断链（不依赖 UI/飞书/ops/完整 integration），落位在新结构里。

## 10. 历史映射

v0.1（A–F 六插件）→ v0.2（4 插件 + 2 库）→ v0.3（平台/应用两层）：

| v0.1 插件 | v0.2 去向 | v0.3 去向 |
|---|---|---|
| A 数据接入配置引导 | knowledge-config | spc profile 配置引导工具；数据源定义交 plugin-integration |
| B 计算任务编排 | compute-client + gateway 回调 | compute-client（平台）+ platform-gateway 回调路由 |
| C 诊断执行 | workorder-diagnosis | plugin-workorder（引擎）+ spc 诊断能力（profile） |
| D 告警网关 | 工单落库移后端；唤醒路由归 gateway | platform-gateway 路由组 + plugin-workorder `wakeDiagnosis` |
| E 工作台后端 API | gateway `/api/*` + 域插件 | platform-gateway + plugin-workorder / spc 知识配置 |
| F 后端部署与治理 | ops 插件 + `/api/ops/*` | plugin-ops（受管服务注册表）+ spc-backend 描述符 |
| （缺失） | （缺失） | plugin-integration（集成治理域，v0.3 新增） |
