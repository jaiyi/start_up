# 插件结构：4 插件 + 2 共享库

> 上游：[00-overview.md](00-overview.md)
> 2026-10-10 评审重组：原 A–F 六插件按功能动作切分，改为按"进程边界 + 领域所有权"切分。旧 → 新映射见 §8。

所有插件为 TS（Cordis `apply(ctx)` + `defineTool`），通过 `ctx.tools.register` 注册模型可调用工具；
**仅 gateway 含 HTTP 路由**。接口以下为**设计稿**，字段在 spike 后定稿。

## 0. 拆分原则

1. **HTTP 边界唯一化**：全部外部 HTTP 入口集中在 gateway。路由注册、鉴权、幂等去重、审计中间件只实现一次——它们全部建在 spike 待验证的 DSH HTTP 能力上，风险集中一处而非四处。
2. **域逻辑归域插件**：gateway 薄、不含域逻辑；每个领域（工单诊断 / 知识配置 / 运维治理）有唯一 owner 插件，域规则变更只改一处。
3. **共享纪律显式化**：审计、幂等、发布流水线、Pack 校验、DB 访问归 spc-core，不靠各插件自觉复刻。
4. **后端拥有的数据由后端写**：`spc.alert_events`（工单）由后端判异引擎落库；DSH 侧只更新处理状态列。写权限矩阵见 [04-data-and-schema.md](04-data-and-schema.md) §6。

## 1. spc-core（共享内核，非插件）

| 模块 | 职责 |
|---|---|
| `audit` | append-only 审计事件写入；持久化失败向调用方抛错，不伪造成功 |
| `idempotency` | 幂等键统一管理：`event_id`（告警唤醒）/ `request_id`（gate 推进）/ `idempotency_key`（计算任务）三种键的生成与去重入口 |
| `db` | PG 访问层（repository 模式）：连接管理、事务、按写权限矩阵约束写路径 |
| `release-pipeline` | 版本化发布流水线（版本递增、digest、审批人、审计）——Pack 与 config 共用一条流水线 |
| `pack-validation` | Pack 校验（路径穿越/敏感值/资源存在性/引用完整性，平移 pack_loader；资源白名单按 Pack 声明） |
| `time` | `business_alert_time` 时区纪律（历史证据查询的包含式上界） |

## 2. compute-client（共享库，原插件 B 的 TS 侧）

- 接口：`submitComputeTask(task_type, params, idempotency_key, requested_by)`、`getTaskStatus(task_id)`、`onTaskCallback(consumer)`。
- 消费方：knowledge-config（调试模式回放派单）、人工触发场景（如临时重训）。
- 运营例行的重训/趋势检测由后端 cron 自持，不经此客户端。
- 任务契约（派单/状态/回调/幂等）见 [03-backend-compute.md](03-backend-compute.md) §3。

## 3. 插件 1：gateway（HTTP 边界）

职责：全部 HTTP 入口的路由、鉴权、幂等去重、审计。**不含域逻辑**——每个路由组委托对应域插件的内部服务。

| 路由组 | 方向 | 鉴权 | 委托 |
|---|---|---|---|
| `POST /spc/alerts` | 后端 → DSH（唤醒信号） | HMAC 签名 | workorder 域 `wakeDiagnosis` |
| `POST /api/tasks/callback` | 后端 → DSH（任务完成） | HMAC 签名 | compute-client 回调消费方 |
| `/api/gates/*`、`/api/diagnosis/*`、`/api/alerts/*` | UI → DSH | 用户 token | workorder 域 |
| `/api/knowledge/*` | UI → DSH | 用户 token（发布需专家/运维角色） | knowledge-config 域 |
| `/api/ops/*` | UI/运维 → DSH | 运维角色 | ops 域 |

要点：

- **工单已由后端落库**：`/spc/alerts` 的语义是"唤醒推理"，校验失败只影响唤醒，不影响工单存在性。
- 以 `event_id` 幂等去重；重复唤醒返回既有诊断会话引用，不重复推理。
- DSH 恢复（进程启动）时扫描 `alert_events` 中未唤醒/未诊断的工单补触发推理（兜底后端重试耗尽的情况；机制细节见 [07-open-questions.md](07-open-questions.md) Q10）。
- 鉴权/审计/幂等中间件全部来自 spc-core，gateway 只做路由装配——它应当是全部插件里最薄的一个。
- **未决**：DSH server 模式 HTTP 能力是否存在、会话外部唤醒 API 形态——见 [06-spike-plan.md](06-spike-plan.md)。

## 4. 插件 2：workorder-diagnosis（工单与诊断域）

职责：工单与诊断域的唯一 owner——工单处理状态、五-gate 状态机、诊断会话生命周期、证据查询、推理编排、飞书旁路提醒。

模型可调用工具：

| 工具 | 输入要点 | 输出 |
|---|---|---|
| `query_spc_evidence` | `event_id / window_id / process_key / business_alert_time(带时区)` | 控制图数据、控制限历史、违规记录（含版本与来源） |
| `query_fault_tree` | `pack_id@version + phenomenon anchor` | 有界图查询结果（深度/节点/边/超时受限） |
| `run_diagnosis` | 事件上下文 | 证据 + 候选原因（引用树节点）+ 待人工检查项 + 候选措施 + 警告 |
| `get_diagnosis_session` | `session_id` | 会话状态、已走 gate、当时 Pack/知识版本 |

内部服务（供 gateway 调用，非模型工具）：

| 服务 | 说明 |
|---|---|
| `wakeDiagnosis(event_id)` | 幂等创建/唤醒诊断会话（固定 `pack_id@version`）→ `run_diagnosis` → 产物落库挂到工单 → 飞书提醒 |
| `advanceGate(session_id, decision, request_id, actor)` | 人工推进 gate；`request_id` 幂等；审计持久化失败不返回成功（对齐现有 advance bridge 语义） |
| `listAlerts / getAlert / getDiagnosis` | UI API 的读路径 |

要点（平移原插件 C/E 的域纪律）：

- `business_alert_time` 沿用现有语义：历史测量与控制限查询的**包含式上界**，必带时区；不得用事件送达时间替代。
- 未注册 process_key / 无已发布 Pack → 显式"该工艺未支持"，**不回退默认工艺**（吸取现有 detector 回退 Glue 节点、provider 回退 Glue Pack 的教训）。
- 诊断会话落库时固定 `pack_id@version` 与知识投影版本。
- 输出必须区分：已查得的事实 / 候选解释 / 待人工查证。
- 工单处理状态列（`workorder_status`/`notify_status`）由本域更新；事件事实列由后端写（[04-data-and-schema.md](04-data-and-schema.md) §6）。
- 飞书凭据走环境变量/secret；推送失败落库"通知失败"状态供重发，不吞。

## 5. 插件 3：knowledge-config（配置与知识域）

职责：数据接入配置引导（原插件 A）+ Pack/配置的候选编辑、回放验证、发布治理。配置与 Pack 共用 spc-core 的 release-pipeline——同一条"候选 → 校验 → 审批 → 版本发布"流水线，不再各写一份。

模型可调用工具：

| 工具 | 输入要点 | 输出 | 模型可写？ |
|---|---|---|---|
| `guide_data_source` | 用户描述的数据源（CSV/DB 表/API） | 数据源配置草案（YAML/JSON schema 校验） | 草案可写，发布需人工 |
| `guide_window_split` | 工艺、检测项、分组方式 | window 分割配置草案 | 同上 |
| `guide_spc_params` | 工艺类型、控制图类型建议（imr/xbar_r/ewma/cusum） | 参数草案（含建议理由） | 同上 |
| `edit_candidate_pack` | 候选 Pack 修改 | 校验结果（spc-core pack-validation） | 候选可写，发布需人工 |
| `run_replay` | 候选 Pack + 历史事件范围 | 回放对比报告（增益/回归） | 可发起，结论仅供参考 |
| `publish_config` / `publish_pack` | 草案/候选 + 审批人 | 版本落库（release-pipeline） | 否，需运维/专家角色 |

内部服务（供 gateway `/api/knowledge/*` 调用）：候选 Pack 读写、回放报告查询、发布审批。

回放编排：本域经 compute-client 派单 `evaluate_batch` → 调用 workorder 域诊断能力对历史事件跑候选 Pack → 对比候选根因与已知结论。发布流水线语义见 [05-diagnosis-and-learning.md](05-diagnosis-and-learning.md) §2。

要点：

- Agent 只产出**草案/候选**，所有 schema 校验复用既有约定（时区必填、数值范围、字段白名单）。
- 配置版本化，`active` 状态切换有审计；参考现有 assessment 配置语义但增加审批 gate（现有"生成即 active"不沿用）。

## 6. 插件 4：ops（后端部署与治理）

职责：管理面命令的域逻辑（原插件 F）。操作经 gateway `/api/ops/*` 由人触发；模型只能调用 status 工具。

| 工具/操作 | 权限 | 说明 |
|---|---|---|
| `deploy_backend(release)` | 运维角色（人经 ops 路由触发） | 部署/升级计算服务，返回 receipt（版本、目标、时间、执行者） |
| `migrate_schema(target_version?)` | 运维角色 | 按序执行迁移，`schema_migrations` 记录；失败即停 |
| `get_backend_status` | 只读（模型可调用） | 服务存活、队列深度、schema 版本、最近告警 |
| `rollback_backend` | 运维角色 | 服务回滚；schema 回滚走快照策略（[04-data-and-schema.md](04-data-and-schema.md) §2） |

要点：

- **模型只能调用 status**；deploy/migrate/rollback 必须人触发。
- 部署目标与方式未决（systemd/docker/公司平台），见 [07-open-questions.md](07-open-questions.md) Q2。
- 全部操作落审计事件（spc-core audit）。

## 7. 职责边界速查

| 关注点 | 唯一 owner |
|---|---|
| HTTP 路由/鉴权/幂等去重 | gateway（中间件来自 spc-core） |
| 工单处理状态/五-gate/诊断会话状态机 | workorder-diagnosis |
| 配置与 Pack 的候选 → 发布流水线 | knowledge-config（流水线实现在 spc-core） |
| 部署/迁移/回滚 | ops |
| 计算任务派单客户端 | compute-client |
| 审计/幂等键/DB 访问/Pack 校验 | spc-core |
| 工单创建（`alert_events` 写入） | 后端判异引擎 |

数据表级写权限矩阵见 [04-data-and-schema.md](04-data-and-schema.md) §6。

## 8. 与原 A–F 插件的映射

| 原插件 | 去向 |
|---|---|
| A 数据接入配置引导 | 插件 3 knowledge-config |
| B 计算任务编排 | compute-client（库）+ gateway 回调路由；运营例行归后端 cron |
| C 诊断执行 | 插件 2 workorder-diagnosis |
| D 告警网关 | 工单落库移至后端；唤醒路由归 gateway `/spc/alerts`；会话/飞书归插件 2 |
| E 工作台后端 API | 边界归 gateway `/api/*`；域逻辑归插件 2/3 |
| F 后端部署与治理 | 插件 4 ops + gateway `/api/ops/*` |
