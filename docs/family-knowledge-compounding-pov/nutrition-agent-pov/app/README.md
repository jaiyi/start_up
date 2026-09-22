# 家庭营养状态 MCP 服务

> 本目录用于后续实现 `family-nutrition-state-mcp`，负责为 WeKnora Agent 提供受控的动态状态读写工具。

## 1. 服务职责

```text
1. 暴露 MCP 工具；
2. 校验工具输入；
3. 执行库存、菜单、反馈等业务逻辑；
4. 读写独立 Postgres；
5. 记录审计日志；
6. 导出 Markdown 状态快照。
```

## 2. 不做什么

```text
不直接写 WeKnora 内部数据库；
不让 Agent 执行任意 SQL；
不绕过用户确认直接修改强状态；
不保存 API Key、SSH 密码或 WeKnora 登录凭证。
```

## 3. 推荐代码结构

```text
app/
├── README.md
├── src/
│   ├── domain/
│   ├── application/
│   ├── ports/
│   ├── adapters/
│   │   ├── postgres/
│   │   ├── markdown/
│   │   └── weknora/
│   ├── mcp/
│   │   ├── tools/
│   │   └── schemas/
│   ├── jobs/
│   └── utils/
└── tests/
    ├── unit/
    ├── integration/
    └── contract/
```

## 4. 第一版 MCP 工具

只读：

```text
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

写入：

```text
record_purchase_after_confirmation
create_planned_consumption
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
export_state_snapshot_to_markdown
```

## 5. 写入要求

所有写入工具必须要求：

```text
family_id
actor_id
confirmation_id 或明确确认文本
idempotency_key
request_id / trace_id
结构化 payload
```

并写入：

```text
mcp_tool_calls
audit_log
```
