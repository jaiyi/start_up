# WeKnora 工具权限配置

> 用途：给家庭营养师 Agent 配置最小必要工具权限。

## 1. 默认开启的只读工具

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

## 2. MCP 只读工具

第一版建议允许家庭营养师 Agent 使用以下 Family Nutrition MCP 只读工具：

```text
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

用途：

```text
读取当前库存；
识别临期、过量和周末优先消耗食材；
读取近期菜单，避免重复推荐；
读取待确认或待执行的计划消耗；
读取饭后反馈摘要。
```

## 3. 确认后才使用的 Wiki 写入工具

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

## 4. 确认后才使用的 MCP 写入工具

```text
record_purchase_after_confirmation
create_planned_consumption
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
export_state_snapshot_to_markdown
```

使用条件：

```text
用户已经明确确认；
payload 已展示或可解释；
包含 family_id、actor_id、confirmation_id 或确认文本；
包含 idempotency_key，避免重复写入；
包含 request_id / trace_id，便于审计；
工具只执行预定义业务动作，不允许执行任意 SQL。
```

## 5. 第一版禁用工具

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
