# WeKnora 工具权限配置

> 用途：给“家庭营养师”单一前台 Agent 配置最小必要工具权限。`meal-recommender`、`inventory-manager`、`feedback-learner` 等只是 Prompt 内部能力模块，不是多个独立 Agent。

## 1. 默认开启的知识库只读工具

```text
search_knowledge
read_document
list_documents
wiki_search
wiki_read_page
wiki_flag_issue
```

用途：

```text
检索家庭知识库；
读取菜谱和规则；
查找 Wiki 页面；
标记需要人工处理的问题。
```

## 2. Family Nutrition MCP 只读工具

建议开启以下只读工具：

```text
health_check
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

用途：

```text
检查 MCP / Postgres 状态；
读取当前库存；
识别临期、过期、积压和周末优先消耗食材；
读取近期菜单，避免重复推荐；
读取待确认或待执行的计划消耗；
读取饭后反馈摘要。
```

只读工具不会修改数据库，可以允许 Agent 主动调用。

## 3. 确认后才使用的 MCP 写入工具

Milestone 4 已上线以下写入工具：

```text
record_purchase_after_confirmation
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
```

建议配置：

```text
开启工具；
保留“需人工审核”或等价审核开关；
仅允许在用户明确确认后调用。
```

使用条件：

```text
用户已经明确确认；
写入摘要已展示给用户；
包含 family_id；
包含 actor_id；
包含 confirmed=true；
包含 confirmation_text；
包含 idempotency_key，避免重复写入；
包含 request_id / trace_id（如果工具 schema 支持）；
工具只执行预定义业务动作，不允许执行任意 SQL。
```

当前未上线、不要配置的后续工具：

```text
create_planned_consumption
export_state_snapshot_to_markdown
```

## 4. 确认后才使用的 Wiki 写入工具

```text
wiki_write_page
wiki_replace_text
```

使用条件：

```text
用户明确说“确认写入 / 可以入库 / 按这个更新 / 把这个改进去”；
目标页面明确；
修改范围明确；
写入内容已经展示给用户；
写入对象是稳定知识或人工整理页面，不是实时库存事务。
```

## 5. 禁用工具

```text
wiki_delete_page
wiki_rename_page
shell_exec
任意 SQL 执行工具
无鉴权 MCP 工具
公网暴露的数据库连接
```

原因：

```text
删除和重命名难恢复；
shell 执行权限过大；
家庭营养师 MVP 不需要这些能力；
动态状态必须通过受控 MCP 工具写入；
Postgres 不应公网暴露。
```

## 6. Web Search 策略

允许场景：

```text
用户明确要求收集、分析或整理新菜谱；
需要核对外部菜谱来源；
需要补全用户提供的不完整菜谱做法。
```

禁止场景：

```text
日常推荐；
库存更新；
饭后反馈；
已有菜谱库足够回答的问题。
```

## 7. 敏感信息边界

```text
不要写入 SSH 密码；
不要写入 WeKnora 登录密码；
不要写入 LLM / Embedding API Key；
不要写入 Token、Cookie 或密钥；
不要在 WeKnora 内部数据库中创建家庭营养业务表。
```
