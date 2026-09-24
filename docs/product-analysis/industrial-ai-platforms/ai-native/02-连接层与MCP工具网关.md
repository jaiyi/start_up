# 02. 连接层与 MCP 工具网关

## 1. 设计目标

连接层是 AI Native 任务闭环平台进入企业真实系统的受控边界。

它要解决的问题不是“Agent 能不能调 API”，而是：

1. Agent 能读取哪些业务上下文。
2. Agent 能发起哪些写动作。
3. 谁授权了这些动作。
4. 输入输出是否符合 schema。
5. 写动作是否幂等。
6. 高风险动作是否经过人工确认。
7. 调用失败后如何重试和补偿。
8. 事后能不能追溯到任务、用户、工具、数据来源和外部系统响应。

因此，连接层不是普通数据连接器，而是企业系统的受控读写和动作执行层。

## 2. 与传统集成的区别

传统系统集成通常关注“能不能接上”。AI Native 连接层还要关注“AI 在什么任务上下文下、以什么权限、为了什么目的、调用了什么工具、产生了什么结果”。

| 维度 | 传统 API / ETL | AI Native 连接层 |
|---|---|---|
| 触发方式 | 定时、人工、系统事件 | 任务状态、Agent Skill、人审动作、系统事件 |
| 上下文 | 接口参数 | task_id、actor、业务对象、权限、风险等级、知识引用 |
| 读能力 | 查表、同步数据 | 构建任务上下文，带来源、口径、权限和可信等级 |
| 写能力 | 系统间写入 | 命令式写入，必须有策略、幂等、审计和补偿 |
| 权限 | 系统账号或接口 token | 用户身份 + 任务上下文 + 工具策略 + 数据权限 |
| 审计 | 接口日志 | Agent 行为、工具调用、人工确认、外部响应全链路 |
| 失败处理 | 重试或人工排查 | 重试、补偿队列、任务状态标记、用户可见 |

## 3. 总体架构

```text
Agent / Skill Runtime
  ↓  MCP tool call
MCP 工具网关
  ├── AuthN：识别调用方、用户、租户、任务
  ├── AuthZ：判断工具、对象、字段、动作权限
  ├── Schema：校验输入输出
  ├── Policy：风险分级、人审要求、写入策略
  ├── Idempotency：幂等键、请求哈希、结果复用
  ├── Audit：工具调用、数据来源、响应、错误
  └── Dispatch：路由到具体 Connector / 内部服务
        ↓
Connector / Adapter Runtime
  ├── ERP Adapter
  ├── MES Adapter
  ├── EAM Adapter
  ├── HR Adapter
  ├── OA / 飞书 Adapter
  ├── 数仓 / BI Adapter
  ├── 知识库 / WeKnora Adapter
  └── 平台内部 Task / State Adapter
        ↓
权威系统 / 平台状态库
```

## 4. 工具分级

连接层必须区分工具风险等级。第一版建议从 L0-L3 开始。

| 等级 | 类型 | 例子 | 是否需要人审 |
|---|---|---|---|
| L0 | 只读上下文 | 查询设备台账、历史工单、SOP、指标口径、人员技能 | 通常不需要，但受权限控制 |
| L1 | 写平台内部状态 | 记录 AI 建议、保存草稿、记录采纳 / 驳回、创建复盘候选 | 低风险动作可不需要，高风险反馈可需要 |
| L2 | 写回业务系统 | 更新 EAM 工单、创建飞书复盘文档、提交候选知识、同步处理记录 | 默认需要人工确认 |
| L3 | 受控自动执行 | SLA 超时自动升级、重大异常自动创建专项、审批通过后自动归档 | 必须有明确规则和审计，关键动作仍需责任人 |

高风险动作包括但不限于：

1. 关闭重大故障单。
2. 确认维修完成。
3. 修改正式 SOP。
4. 提交质量结论。
5. 改变关键设备状态。
6. 触发财务归因或绩效结算。
7. 向外部客户或供应商发送正式结论。

这些动作不能只由 Agent 决定，必须经过人类责任人确认或审批。

## 5. Tool Registry 设计

每个工具都必须先注册，再允许 Agent 调用。

最小注册结构：

```text
ToolDefinition
├── tool_id
├── tool_name
├── version
├── title
├── description
├── owner_team
├── source_system
├── operation_type        # read / write_internal / write_external / automation
├── risk_level            # L0 / L1 / L2 / L3
├── input_schema
├── output_schema
├── auth_policy_ref
├── approval_policy_ref
├── idempotency_required
├── timeout_ms
├── retry_policy
├── compensation_policy
├── audit_level
├── enabled_for_task_types
├── annotations
└── status                # draft / active / deprecated / disabled
```

MCP annotations 可表达工具语义，例如：

```text
readOnlyHint: true / false
destructiveHint: true / false
idempotentHint: true / false
openWorldHint: true / false
```

但 annotation 只是提示，不能替代服务端权限和策略校验。

## 6. 工具调用上下文

Agent 调用工具时，不应该只传业务参数，还必须带上平台上下文。

```text
ToolCallContext
├── trace_id
├── task_id
├── tenant_id
├── actor_id
├── actor_role_refs
├── skill_run_id
├── tool_name
├── tool_version
├── business_object_refs
├── permission_scope
├── risk_level
├── approval_ref
├── idempotency_key
└── request_time
```

上下文来源应由平台注入，而不是完全相信 Agent 自己传入。Agent 可以提出工具调用意图，但最终执行参数必须由服务端合并当前任务、用户身份、权限策略和业务对象后生成。

## 7. 只读工具设计

只读工具用于构建任务上下文。

设备维修场景的第一批只读工具可以是：

| 工具 | 输入 | 输出 | 来源 |
|---|---|---|---|
| `get_equipment_profile` | `equipment_id` | 设备型号、产线、工序、状态、责任团队 | EAM / MES |
| `list_recent_work_orders` | `equipment_id`、时间范围 | 历史工单、故障码、处理结果、复发信息 | EAM |
| `search_repair_knowledge` | 故障描述、设备型号、故障码 | SOP、案例、复盘、引用片段 | 知识库 / WeKnora |
| `get_skill_roster` | 工厂、班次、技能要求 | 可派工人员、技能等级、排班 | HR / EAM |
| `get_metric_snapshot` | 指标、对象、时间范围 | MTTR、停机时长、OEE、质量损失 | 数仓 / BI |

只读工具也必须做权限控制，例如维修人员只能看授权工厂和设备，质量人员只能看授权产品线，供应商不能看到内部成本字段。

## 8. 写入工具设计

写入工具应按命令式接口设计，而不是暴露任意 update。

### 8.1 平台内部写入

平台内部写入第一版可以包括：

| 工具 | 用途 |
|---|---|
| `record_ai_recommendation` | 保存 AI 建议和引用证据 |
| `record_human_decision` | 记录采纳、驳回、修改和原因 |
| `update_task_status` | 在允许的状态转移内更新任务状态 |
| `create_review_draft` | 创建复盘草稿或候选知识 |
| `record_task_feedback` | 记录任务结果、复发情况、人工反馈 |

平台内部写入也必须走状态机。例如任务处于 `closed` 后，不允许普通用户继续修改核心处理结果，只允许追加复盘或纠错事件。

### 8.2 外部系统写回

外部写回第一版只选择 1-2 个动作打通，不要一开始覆盖所有系统。

候选动作：

| 工具 | 外部系统 | 风险 | 控制方式 |
|---|---|---|---|
| `create_eam_work_order` | EAM | L2 | 人工确认 + 幂等 |
| `append_work_order_note` | EAM | L2 | 人工确认或任务 owner 权限 |
| `create_review_document` | 飞书 / Wiki | L2 | 人工确认 + 草稿状态 |
| `submit_knowledge_candidate` | 知识库 / WeKnora | L2 | 专家审核后发布 |
| `push_task_notification` | IM / 飞书 | L1/L2 | 策略限制频率和对象 |

禁止直接提供：

```text
execute_sql
update_any_field
call_any_api
send_any_message
write_document_without_review
```

这类工具边界过大，无法治理。

## 9. 权限模型

工具权限不能只看用户角色，还要看任务上下文。

建议使用组合判断：

```text
是否允许 = 用户身份
        + 用户角色
        + 所属组织 / 工厂 / 项目
        + 当前任务类型
        + 当前任务状态
        + 业务对象权限
        + 工具风险等级
        + 数据敏感级别
        + 是否已有审批
```

示例策略：

```text
维修技术员：
- 可读取自己工厂设备和相关 SOP；
- 可记录处理过程和采纳 / 修改 AI 建议；
- 可提交维修完成申请；
- 不可直接关闭重大故障单。

设备主管：
- 可查看团队任务；
- 可审批高风险维修方案；
- 可关闭普通故障单；
- 重大停机故障需更高层确认。

知识管理员：
- 可审核候选 SOP；
- 可发布知识版本；
- 不可修改工单处理事实。
```

## 10. Schema 校验

所有工具必须定义输入和输出 schema。

输入 schema 目标：

1. 限定字段类型和枚举。
2. 防止 Agent 传入任意字段。
3. 校验业务对象是否存在。
4. 校验状态转移是否合法。
5. 校验数值范围和必填项。
6. 拒绝跨租户、跨组织或跨任务的数据引用。

输出 schema 目标：

1. 给 Agent 稳定结构化结果。
2. 避免泄露敏感字段。
3. 带上来源、时间、可信等级和引用。
4. 支持 UI 展示和审计。

示例输出：

```text
ToolResult
├── success
├── data
├── error
├── source_refs
├── redaction_applied
├── confidence_level
├── audit_ref
└── next_allowed_actions
```

## 11. 幂等设计

所有写工具都必须支持幂等。

建议机制：

1. 调用方为每个写动作提供 `idempotency_key`。
2. 服务端计算 `request_hash`。
3. 在 `tool_calls` 表中用 `(tool_name, idempotency_key)` 建唯一约束。
4. 相同 key 和相同 hash 返回上次结果。
5. 相同 key 但不同 hash 拒绝执行。
6. 外部系统写回时保存 `external_request_id` 和 `external_result_ref`。

这可以防止模型重试、网络重试或用户重复点击造成重复工单、重复消息、重复扣减或重复状态更新。

## 12. 审计日志

审计日志要覆盖完整链路。

最小审计字段：

```text
ToolCallAudit
├── tool_call_id
├── trace_id
├── task_id
├── skill_run_id
├── actor_id
├── tool_name
├── tool_version
├── operation_type
├── risk_level
├── input_hash
├── redacted_input
├── output_hash
├── redacted_output
├── source_system
├── external_request_ref
├── external_response_status
├── approval_ref
├── idempotency_key
├── status
├── error_code
├── error_message_sanitized
├── started_at
└── finished_at
```

注意：审计中不应保存明文密钥、Token、Cookie、数据库密码或过度敏感的原始业务内容。必要时保存脱敏摘要、hash、引用 ID 和可授权查询入口。

## 13. 错误处理与失败补偿

工具调用失败不能只是返回“失败”。平台需要可恢复机制。

错误类型：

| 类型 | 例子 | 处理方式 |
|---|---|---|
| 参数错误 | schema 不通过、对象不存在 | 立即失败，返回可读错误 |
| 权限错误 | 用户无权访问对象或工具 | 拒绝执行，记录审计 |
| 策略拦截 | 高风险动作缺少审批 | 返回需要审批的 next action |
| 外部系统暂时不可用 | API 超时、限流 | 重试，超过阈值进入补偿队列 |
| 外部系统业务失败 | 状态不允许、字段冲突 | 标记任务异常，提示人工处理 |
| 部分成功 | 文档创建成功但通知失败 | 记录子步骤状态，允许补偿 |

补偿队列字段：

```text
CompensationJob
├── job_id
├── tool_call_id
├── task_id
├── operation_type
├── payload_ref
├── retry_count
├── next_retry_at
├── status
├── last_error
└── owner_team
```

## 14. MCP Gateway API 边界

第一版可以同时提供 MCP 和内部 REST command API。

```text
/mcp
  - Agent / Skill 调用工具入口

/tools
  - 查询工具注册表

/health
  - 服务和依赖健康检查

/internal/tasks/:taskId/tool-calls
  - 工作台查看工具调用历史

/internal/approvals
  - 创建、查询、处理人工确认

/internal/compensation-jobs
  - 查看和处理失败补偿
```

MCP 是给 Agent 的工具协议；内部 REST API 是给工作台、运维台和治理台使用。两者可以共用底层 Tool Execution Service。

## 15. 最小数据库表

连接层第一版至少需要：

```text
tool_definitions
  - 工具注册表

tool_policies
  - 权限和风险策略

tool_calls
  - 每次工具调用事实

tool_call_events
  - 工具调用生命周期事件

approvals
  - 人工确认和审批

idempotency_records
  - 幂等记录

connector_definitions
  - 外部系统连接器定义

connector_credentials_ref
  - 凭据引用，不保存明文密钥

compensation_jobs
  - 失败补偿任务

audit_log
  - 跨模块审计事件
```

凭据应放在 secret manager 或部署环境的安全配置中，数据库只保存引用和元数据。

## 16. 测试策略

连接层必须测试优先。

### 16.1 单元测试

覆盖：

1. input schema validation。
2. permission policy evaluation。
3. risk classification。
4. state transition guard。
5. idempotency key behavior。
6. error sanitization。

### 16.2 集成测试

覆盖：

1. MCP tool call → policy → connector → audit log。
2. 重复写入请求不会重复执行。
3. 权限不足时拒绝调用。
4. 外部系统失败时进入补偿队列。
5. 人工确认后才允许 L2 写回。

### 16.3 契约测试

每个 Connector 都要维护 contract fixture：

1. 外部系统成功响应样例。
2. 外部系统错误响应样例。
3. 字段缺失样例。
4. 权限失败样例。
5. 限流和超时样例。

### 16.4 安全测试

覆盖：

1. Agent 伪造 actor_id 被拒绝。
2. Agent 伪造 approval_ref 被拒绝。
3. 跨租户 object_id 被拒绝。
4. 输入中包含额外字段被拒绝或忽略。
5. 错误信息不泄露密钥、连接串、SQL 或外部 token。

## 17. 第一阶段可执行任务清单

1. 定义第一个场景的工具清单，按 L0-L3 分级。
2. 为每个工具写 input / output schema。
3. 建立 `tool_definitions`、`tool_calls`、`audit_log`、`approvals`、`idempotency_records` 表。
4. 实现 MCP Gateway 的鉴权、schema 校验、审计和统一 response envelope。
5. 实现 2-3 个只读工具。
6. 实现 1-2 个平台内部写入工具。
7. 为写工具加入幂等约束。
8. 在工作台展示工具调用历史和 AI 建议来源。
9. 加入一个 L2 外部写回工具，但默认必须人工确认。
10. 建立 connector fake adapter，用于本地和 CI 测试。

## 18. 验收标准

第一版连接层完成时，应满足：

1. Agent 无法绕过 MCP Gateway 访问业务系统。
2. 每次工具调用都能追溯到 task、actor、skill、tool、输入摘要、输出摘要和状态。
3. 只读工具能返回带来源和权限过滤的上下文。
4. 写工具必须通过 schema、权限、风险和幂等校验。
5. L2 写回必须有人类确认记录。
6. 外部系统失败不会造成任务静默丢失，而是进入可见的失败状态或补偿队列。
7. 测试覆盖关键权限、幂等、错误和审计路径。
