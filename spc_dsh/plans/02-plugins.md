# 插件 A–F 职责与接口清单

> 上游：[00-overview.md](00-overview.md)

所有插件为 TS（Cordis `apply(ctx)` + `defineTool`），通过 `ctx.tools.register` 注册模型可调用工具；
插件 E/F 另含 HTTP 路由。接口以下为**设计稿**，字段在 spike 后定稿。

## 插件 A：数据接入配置引导

职责：引导用户完成"文件源 → window 分割 → 参数设定"的配置生成，产出结构化配置文件（人工确认后发布）。

| 工具 | 输入要点 | 输出 | 模型可写？ |
|---|---|---|---|
| `guide_data_source` | 用户描述的数据源（CSV/DB 表/API） | 数据源配置草案（YAML/JSON schema 校验） | 草案可写，发布需人工 |
| `guide_window_split` | 工艺、检测项、分组方式 | window 分割配置草案 | 同上 |
| `guide_spc_params` | 工艺类型、控制图类型建议（imr/xbar_r/ewma/cusum） | 参数草案（含建议理由） | 同上 |
| `publish_config` | 配置草案 + 审批人 | 配置版本落库 | 否，需运维/专家角色 |

要点：

- Agent 只产出**草案**，所有 schema 校验复用既有约定（时区必填、数值范围、字段白名单）。
- 配置版本化，`active` 状态切换有审计；参考现有 assessment 配置语义但增加审批 gate（现有"生成即 active"不沿用）。

## 插件 B：计算任务编排

职责：把长计算派给后端，管理任务生命周期。

| 工具/API | 说明 |
|---|---|
| `submit_compute_task` | 派单：`task_type + params + idempotency_key + requested_by` |
| `get_task_status` | 查任务状态（queued/running/succeeded/failed + 原因） |
| 任务回调接收 | 后端完成后 POST 回插件 B（或插件 B 轮询后端队列） |

任务类型（首版）：

- `retrain_control_limits`（控制限训练）
- `evaluate_batch`（批量判异/历史回放）
- `compute_capability`（CPK 等）
- `detect_trend`（趋势检测，产出告警候选）

契约要点：幂等键防重复执行；任务状态持久在 Postgres；失败带原因码，不静默重试超上限。

## 插件 C：诊断执行

职责：给定事件上下文，收集证据、走故障树、产出候选根因与建议。

| 工具 | 输入 | 输出 |
|---|---|---|
| `query_spc_evidence` | `event_id / window_id / process_key / business_alert_time(带时区)` | 控制图数据、控制限历史、违规记录（含版本与来源） |
| `query_fault_tree` | `pack_id@version + phenomenon anchor` | 有界图查询结果（深度/节点/边/超时受限） |
| `run_diagnosis` | 事件上下文 | 证据 + 候选原因（引用树节点）+ 待人工检查项 + 候选措施 + 警告 |
| `get_diagnosis_session` | `session_id` | 会话状态、已走 gate、当时 Pack/知识版本 |

要点：

- `business_alert_time` 沿用现有语义：历史测量与控制限查询的**包含式上界**，必带时区；不得用事件送达时间替代。
- 未注册 process_key / 无已发布 Pack → 显式"该工艺未支持"，**不回退默认工艺**（吸取现有 detector 回退 Glue 节点、provider 回退 Glue Pack 的教训）。
- 诊断会话落库时固定 `pack_id@version` 与知识投影版本。
- 输出必须区分：已查得的事实 / 候选解释 / 待人工查证。

## 插件 D：告警网关

职责：接收后端 POST，唤醒推理，推送飞书。

| 项 | 设计 |
|---|---|
| 路由 | `POST /spc/alerts`（DSH server 模式的 HTTP 能力，**spike 验证对象**） |
| 校验 | 签名/Token、必填字段、`event_id` 幂等去重 |
| 动作 | 校验通过 → 创建/唤醒推理会话 → 插件 C `run_diagnosis` → 组装排障建议 → 发飞书群 + 落告警事件 |
| 失败 | 任一步失败 → 记审计并告警运维，不伪造"已通知" |

要点：

- 后端投递需重试 + 至少一次语义；插件 D 以 `event_id` 幂等。
- 飞书推送失败不吞：落库"通知失败"状态供重发。
- **未决**：DSH server 模式 HTTP 能力是否存在、会话外部唤醒 API 形态——见 [06-spike-plan.md](06-spike-plan.md)。

## 插件 E：工作台后端 API

职责：供 UI 调用的鉴权 API，承载五-gate 推进、工单/会话读写。

| 路由组 | 说明 |
|---|---|
| `POST /api/gates/{session_id}/advance` | 人工推进 gate；要求用户身份 + 合法 decision；审计事件持久化失败不得返回成功（对齐现有 advance bridge 语义） |
| `GET /api/diagnosis/{session_id}` | 会话与证据快照 |
| `GET /api/alerts` / `GET /api/alerts/{event_id}` | 告警列表/详情 |
| `GET/PUT /api/knowledge/packs/...` | 调试模式读写候选 Pack；发布走审批 |
| 鉴权 | 用户级 token；gate 推进需人身份，不接受服务身份冒充 |

要点：

- 幂等：advance 请求带 `request_id`，重复提交同 decision 幂等返回（修正现有 `idempotency.required: false` 的缺口）。
- 工单真相源 = Postgres；`event_id` 全局沿用后端确定性身份。

## 插件 F：后端部署与治理

职责：管理面的全部命令通道。

| 工具/操作 | 权限 | 说明 |
|---|---|---|
| `deploy_backend(release)` | 运维角色 | 部署/升级计算服务，返回 receipt（版本、目标、时间、执行者） |
| `migrate_schema(target_version?)` | 运维角色 | 按序执行迁移，`schema_migrations` 记录；失败即停 |
| `get_backend_status` | 只读（模型可调用） | 服务存活、队列深度、schema 版本、最近告警 |
| `rollback_backend` | 运维角色 | 服务回滚；schema 回滚单列谨慎策略 |

要点：

- **模型只能调用 status**；deploy/migrate/rollback 必须人触发。
- 部署目标与方式未决（systemd/docker/公司平台），见 [07-open-questions.md](07-open-questions.md)。
- 全部操作落审计事件。
