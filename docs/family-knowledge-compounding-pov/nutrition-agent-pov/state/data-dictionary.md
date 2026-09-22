# 动态状态数据字典

> 本文档定义 Family Nutrition 动态状态库的第一版 Postgres 契约。它是开发和部署时理解数据库的入口，不包含真实家庭数据、密码、Token 或连接串。

## 1. 总体定位

动态状态库是家庭营养师 Agent 的状态 source of truth，负责保存会频繁变化、需要事务一致性的内容：

```text
库存当前值
库存变化流水
采购记录
菜单计划
计划消耗
实际做饭记录
饭后反馈
MCP 工具调用幂等记录
审计日志
```

稳定知识仍放在 Markdown + Git + WeKnora 知识库中，例如菜谱、饮食规则、家庭长期画像、Prompt 和 Skill 文档。

## 2. 关键原则

1. `family_id` 是动态状态隔离边界。
2. 除 `families` 外，业务表都必须带 `family_id`。
3. 子表通过复合外键引用父表的 `(family_id, id)`，避免跨家庭误关联。
4. 库存采用 snapshot + event ledger：
   - `inventory_items.quantity` 代表当前可查询库存；
   - `inventory_events` 代表库存为什么变化。
5. planned 不等于 cooked：
   - `planned_consumptions` 只表示预计会用什么；
   - 它不会直接扣减库存；
   - 只有确认做饭后的 `meal_events` 和对应库存事件才会改变库存。
6. 写入工具必须幂等。
7. 写入工具必须可审计。
8. 运行时数据库账号必须最小权限；Milestone 2 默认只能执行健康检查函数。
9. 长期偏好沉淀回 Markdown 前必须人工确认。
10. 示例数据只能使用 demo 数据，不记录真实健康、家庭、账号或密钥信息。

## 3. Schema

所有表放在独立 schema：

```sql
family_state
```

使用 `pgcrypto` 的 `gen_random_uuid()` 生成 UUID。

## 4. 表说明

### 4.1 `families`

家庭租户表，是动态状态隔离的根。

| 字段 | 说明 |
| --- | --- |
| `id` | 家庭 ID |
| `display_name` | 展示名，demo 中使用 `Demo Family` |
| `timezone` | 家庭所在时区，默认 `Asia/Shanghai` |
| `notes` | 非敏感备注 |
| `created_at` / `updated_at` / `archived_at` | 生命周期字段 |

注意：真实部署时，一个家庭对应一个 `family_id`。Agent 工具调用必须显式带上它，后续服务层也要校验它。

### 4.2 `actors`

操作主体表，记录是谁触发了状态变化。

| 字段 | 说明 |
| --- | --- |
| `family_id` | 所属家庭 |
| `actor_type` | `human` / `agent` / `system` |
| `display_name` | 操作主体名称 |
| `external_ref` | 可选外部系统引用 |

用途：采购、确认做饭、反馈、系统自动任务都要能追溯到 actor。

### 4.3 `family_members`

家庭成员表，用于餐食推荐和反馈关联。

| 字段 | 说明 |
| --- | --- |
| `member_role` | `adult` / `baby` / `elder` / `guest` |
| `dietary_constraints` | JSON 结构，保存敏感饮食限制时要特别谨慎 |

注意：`dietary_constraints` 可能涉及健康和儿童信息，属于敏感个人数据。导出 Markdown 快照时要控制粒度。

### 4.4 `inventory_items`

库存当前快照表。

| 字段 | 说明 |
| --- | --- |
| `item_name` | 食材名 |
| `category` | `vegetable` / `protein` / `staple` / `fruit` / `dairy` / `seasoning` / `frozen` / `other` |
| `quantity` | 当前库存数量，必须 `>= 0` |
| `unit` | 单位，如 `g`、`个`、`袋` |
| `storage_location` | `fridge` / `freezer` / `pantry` / `room_temperature` / `unknown` |
| `purchased_at` / `expires_at` | 采购日期和保质期 |
| `last_event_at` | 最近一次库存事件时间 |

用途：支持“先看库存再推荐”和“周末清库存”。

### 4.5 `inventory_events`

库存变化流水表。

| 字段 | 说明 |
| --- | --- |
| `inventory_item_id` | 对应库存项 |
| `actor_id` | 操作主体 |
| `event_type` | `purchase` / `consume` / `adjust` / `discard` / `expire` |
| `quantity_delta` | 库存变化量，不能为 0；采购必须为正数，消耗、丢弃、过期必须为负数，调整可以正负 |
| `source_ref_type` / `source_ref_id` | 来源，如采购记录、做饭事件、手动调整 |
| `request_id` / `trace_id` | 请求追踪 |

原则：即使当前库存被修正，也要保留事件流水，方便回放和审计。

### 4.6 `purchase_records`

一次采购的主记录。

| 字段 | 说明 |
| --- | --- |
| `purchased_on` | 采购日期 |
| `source` | `manual` / `receipt` / `agent_suggestion` / `import` |
| `store_name` | 商家，可为空 |
| `total_amount` / `currency` | 金额，可为空 |
| `request_id` / `trace_id` | 请求追踪 |

### 4.7 `purchase_items`

采购明细。

| 字段 | 说明 |
| --- | --- |
| `purchase_record_id` | 所属采购记录 |
| `inventory_item_id` | 可选关联库存项 |
| `item_name` | 采购食材名 |
| `quantity` | 采购数量，必须 `> 0` |
| `unit` | 单位 |

### 4.8 `meal_plans`

菜单计划主表。

| 字段 | 说明 |
| --- | --- |
| `plan_date` | 计划日期 |
| `meal_scene` | `breakfast` / `lunch` / `dinner` / `snack` / `baby_meal` |
| `status` | `planned` / `confirmed` / `skipped` / `cancelled` |
| `recommendation_reason` | 推荐原因 |
| `avoid_repeat_window_days` | 防重复推荐窗口 |

注意：计划不是执行。计划本身不会扣库存。

### 4.9 `meal_plan_items`

计划中的菜品。

| 字段 | 说明 |
| --- | --- |
| `meal_plan_id` | 所属菜单计划 |
| `recipe_ref` | Markdown 菜谱引用，如 `recipes/008-冬瓜牛肉汤.md` |
| `recipe_title` | 菜名快照 |
| `dish_role` | `main` / `side` / `soup` / `staple` / `snack` |
| `target_members` | 面向成员列表，JSON 数组 |

当前不建 recipe 表，菜谱仍由 Markdown 管理。

### 4.10 `planned_consumptions`

计划消耗表。

| 字段 | 说明 |
| --- | --- |
| `meal_plan_item_id` | 对应计划菜品 |
| `inventory_item_id` | 可选库存项 |
| `item_name` | 预计使用食材 |
| `planned_quantity` | 预计使用数量，必须 `> 0` |
| `unit` | 单位 |

重要：planned 不等于 cooked，本表不会直接扣减库存。只有用户确认实际做了，后续写工具才会创建 `meal_events` 和 `inventory_events`。

### 4.11 `meal_events`

实际做饭事件。

| 字段 | 说明 |
| --- | --- |
| `meal_plan_id` | 可选关联菜单计划 |
| `cooked_at` | 实际做饭时间 |
| `meal_scene` | 餐次 |
| `status` | `cooked` / `partially_cooked` / `skipped` |

约束：同一个家庭的同一个 `meal_plan_id` 只能被确认一次，避免重复扣库存。

### 4.12 `meal_event_items`

实际做出的菜品。

| 字段 | 说明 |
| --- | --- |
| `meal_event_id` | 所属实际做饭事件 |
| `meal_plan_item_id` | 可选关联计划菜品 |
| `recipe_ref` / `recipe_title` | 菜谱引用和标题快照 |
| `actual_servings` | 实际份数，可为空 |

### 4.13 `meal_feedback`

饭后反馈表。

| 字段 | 说明 |
| --- | --- |
| `meal_event_id` | 对应实际做饭事件 |
| `family_member_id` | 可选成员 |
| `rating` | `liked` / `neutral` / `disliked` / `no_feedback` |
| `feedback_text` | 反馈文本 |
| `suggested_preference_update` | 候选长期偏好变更 |
| `requires_human_review` | 是否需要人工确认后沉淀到 Markdown |

如果饭后没有反馈，业务层可以记录 `no_feedback`，表示“一切正常”，但仍不自动生成长期偏好。

### 4.14 `mcp_tool_calls`

MCP 工具调用幂等表。

| 字段 | 说明 |
| --- | --- |
| `tool_name` | 工具名 |
| `idempotency_key` | 幂等键 |
| `request_hash` | 输入参数 hash，用于检测同 key 不同请求 |
| `request_id` / `trace_id` | 请求追踪 |
| `confirmation_text` | 用户确认文本快照 |
| `status` | `started` / `succeeded` / `failed` / `replayed` |
| `input_payload` / `output_payload` | 输入输出快照，必须脱敏 |

唯一约束：`(family_id, tool_name, idempotency_key)`。

### 4.15 `audit_log`

审计日志表。

| 字段 | 说明 |
| --- | --- |
| `actor_id` | 操作主体 |
| `mcp_tool_call_id` | 可选关联工具调用 |
| `action` | 行为名称 |
| `entity_type` / `entity_id` | 被操作对象 |
| `before_snapshot` / `after_snapshot` | 变更前后快照，必须脱敏 |
| `metadata` | 其他上下文 |
| `request_id` / `trace_id` | 请求追踪 |

原则：后续每个写工具都应该在同一个数据库事务中写业务表和审计日志。

## 5. 当前暂缓的表

### `write_confirmations`

暂缓原因：确认流程还没有真实产品交互。当前先把确认文本记录在 `mcp_tool_calls.confirmation_text` 和 `audit_log.metadata`。

### `preference_observations`

暂缓原因：偏好学习的粒度还需要真实反馈校准。当前先把候选偏好写在 `meal_feedback.suggested_preference_update`，并用 `requires_human_review` 提醒人工确认。

### `state_exports`

暂缓原因：Markdown 导出属于 Milestone 6 的备份与导出能力。

## 6. 敏感数据边界

不要写入以下信息：

```text
SSH 密码
WeKnora 登录密码
LLM / Embedding API Key
Bearer Token
Cookie
数据库真实密码
完整连接串
```

家庭成员健康、儿童饮食、老人饮食限制都属于敏感个人数据。数据库可以保存必要字段，但导出、日志和错误信息要做最小化处理。

## 7. 与后续 Milestone 的关系

Milestone 1 保证数据库结构能被创建和验证。

Milestone 2 新增运行时权限边界和 MCP 数据库健康检查：

```text
1. 通过 0002_runtime_permissions.sql 创建 family_nutrition_runtime no-login group role；
2. 通过 infra/postgres/create-runtime-app-role.sql 创建实际登录 app/runtime 用户；
3. app/runtime 用户默认只授予 `family_state.check_runtime_health(text[])` 的 `EXECUTE` 权限；
4. MCP 服务使用 app/runtime 用户连接数据库，不使用 owner/bootstrap 用户；
5. app/runtime 用户不能直接 `SELECT`、`INSERT`、`UPDATE` 或 `DELETE` 业务表；
6. /health 和 health_check 只做只读 schema readiness 检查。
```

后续阶段：

```text
Milestone 3：只读业务工具
Milestone 4：写入工具 + 幂等 + 审计事务
Milestone 5：WeKnora Agent 接入
Milestone 6：备份、导出、上线检查
```
