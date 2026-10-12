# Milestone 4 写入工具实施计划

## 目标

在 Milestone 3 只读能力基础上，新增首批“用户确认后才可写入”的 MCP 工具，让 WeKnora Agent 能安全更新家庭营养动态状态。

本阶段实现 4 个工具：

1. `record_purchase_after_confirmation`
2. `confirm_meal_execution`
3. `record_meal_feedback`
4. `adjust_inventory_after_feedback`

本阶段不做：

- 不开放任意 SQL；
- 不给 runtime app 用户表级 `INSERT` / `UPDATE` / `DELETE` 权限；
- 不自动改写 Markdown 长期偏好库；
- 不实现 `create_planned_consumption` 和 `export_state_snapshot_to_markdown`，这两个留到后续阶段。

## 关键安全约束

每个写工具都必须满足：

- 输入必须包含 `family_id`；
- 输入必须包含 `actor_id`；
- 输入必须包含 `idempotency_key`；
- 输入必须包含明确确认字段：`confirmed: true` 和非空 `confirmation_text`；
- MCP handler 先做 Zod schema 校验；
- MCP handler 再做 app 层 `FAMILY_NUTRITION_ALLOWED_FAMILY_IDS` 校验；
- Postgres `SECURITY DEFINER` 函数内部再调用 `family_state.assert_runtime_family_access(target_family_id)`；
- 每次成功写入必须写 `mcp_tool_calls` 和 `audit_log`；
- 幂等键相同且请求 hash 相同：返回首次成功结果，不重复扣库存/重复插入；
- 幂等键相同但请求 hash 不同：拒绝执行；
- 库存扣减不能导致 `inventory_items.quantity < 0`。

## 文件设计

新增/修改文件：

### 数据库

- 新增 `state/migrations/0004_write_business_functions.sql`
  - 新增 helper：请求 hash / 幂等处理 / 审计写入可复用函数（如适合保持在 SQL 内部）；
  - 新增 4 个 `SECURITY DEFINER` 写函数；
  - 对 `PUBLIC` revoke；
  - 只向 `family_nutrition_runtime` grant 这 4 个函数的 `EXECUTE`。

### TypeScript 端口与适配器

- 新增 `src/ports/family-state-writer.ts`
  - 定义 4 个写入 input/output 类型；
  - 定义 `FamilyStateWriter` port。

- 新增 `src/adapters/postgres/postgres-family-state-writer.ts`
  - 只调用 `family_state.*` 写函数；
  - 不直接写业务表；
  - 做 DB row 到应用 output 的映射。

### MCP schema/tool

- 新增 `src/mcp/schemas/write-state-schemas.ts`
  - UUID-shape 校验沿用现有策略；
  - 日期做真实 calendar 校验；
  - 数量必须正数；
  - `confirmed: z.literal(true)`；
  - `confirmation_text` 非空且长度限制；
  - `idempotency_key` 非空且长度限制。

- 新增 `src/mcp/tools/register-write-state-tools.ts`
  - 注册 4 个写工具；
  - annotations 使用 `readOnlyHint: false`，`destructiveHint` 对扣减/丢弃类工具为 true；
  - 每个 handler：parse → assertFamilyAllowed → writer 调用 → structuredContent/text。

### 服务装配

- 修改 `src/mcp/server.ts`
  - `AppContext` 加 `familyStateWriter`；
  - 注册写工具；
  - version 从 `0.3.0` 升到 `0.4.0`；
  - health output `milestone` 从 `3` 升到 `4`。

- 修改 `src/index.ts`
  - 创建 `createPostgresFamilyStateWriter(pool)` 并注入。

- 修改 `src/mcp/tool-registry.ts`
  - 加 4 个写工具，`readOnly: false`。

- 修改 `src/application/check-service-health.ts`
  - milestone 升为 `4`。

- 修改 `src/adapters/postgres/postgres-health-checker.ts`
  - 增加 Milestone 4 必需函数检查；
  - 继续检查 Milestone 3 read functions；
  - 确认 runtime 用户能执行 4 个写函数。

- 修改 `package.json`
  - version 升到 `0.4.0`。

### 文档

- 更新 `app/README.md`
- 更新 `state/README.md`
- 更新 `state/data-dictionary.md`
- 更新 `infra/postgres/README.md`
- 必要时更新 `deployment/weknora-tencent-cloud.md`，只写部署事实和无密配置，不写真实 token / DB URL。

## 写入函数语义

### 1. record_purchase_after_confirmation

输入：

- `family_id`
- `actor_id`
- `idempotency_key`
- `confirmed: true`
- `confirmation_text`
- `purchased_on`
- `source`
- 可选 `store_name` / `total_amount` / `currency` / `notes`
- `items[]`：`item_name`、`category`、`quantity`、`unit`、`storage_location`、可选 `purchased_at` / `expires_at` / `unit_price` / `notes`

行为：

- 创建 `purchase_records`；
- 创建 `purchase_items`；
- 按 `(family_id, item_name, unit, storage_location)` 找库存项：存在则增加数量，不存在则创建；
- 每个 item 写一条 `inventory_events(event_type='purchase')`；
- 写审计；
- 返回 purchase record、item count、inventory changes。

### 2. confirm_meal_execution

输入：

- `family_id`
- `actor_id`
- `idempotency_key`
- `confirmed: true`
- `confirmation_text`
- 可选 `meal_plan_id`
- `cooked_at`
- `meal_scene`
- `status`: `cooked` / `partially_cooked` / `skipped`
- `items[]`：菜名、可选计划菜品 ID、实际份数
- `consumptions[]`：库存项 ID、实际消耗数量、单位、可选计划消耗 ID

行为：

- 创建 `meal_events`；
- 创建 `meal_event_items`；
- 若 status 是 `cooked` 或 `partially_cooked`，按 consumptions 扣减库存并写 `inventory_events(event_type='consume')`；
- 若 status 是 `skipped`，不扣库存；
- 同一个 `meal_plan_id` 已经确认时走幂等/冲突保护；
- 写审计。

### 3. record_meal_feedback

输入：

- `family_id`
- `actor_id`
- `idempotency_key`
- `confirmed: true`
- `confirmation_text`
- `meal_event_id`
- 可选 `family_member_id`
- `rating`
- 可选 `feedback_text`
- 可选 `suggested_preference_update`
- `requires_human_review`

行为：

- 创建 `meal_feedback`；
- 不直接改 Markdown 偏好库；
- 写审计；
- 返回 feedback id 和 review flag。

### 4. adjust_inventory_after_feedback

输入：

- `family_id`
- `actor_id`
- `idempotency_key`
- `confirmed: true`
- `confirmation_text`
- `inventory_item_id`
- `adjustment_type`: `adjust` / `discard` / `expire`
- `quantity_delta`：adjust 可正可负；discard/expire 必须负数
- `unit`
- `reason`

行为：

- 校验库存项属于该 family；
- 校验扣减后不为负；
- 更新 `inventory_items.quantity` / `last_event_at` / `updated_at`；
- 写 `inventory_events`；
- 写审计；
- 返回 before/after quantity。

## TDD 步骤

1. RED：写 `write-state-schemas.test.ts`
   - 确认字段必填；
   - invalid UUID/date/quantity 拒绝；
   - `confirmed` 只能是 true；
   - `items`/`consumptions` 空数组拒绝。

2. RED：写 `write-state-tools.test.ts`
   - 注册 4 个工具；
   - disallowed family 在 writer 前被拒绝；
   - writer 被调用参数正确；
   - 输出 structuredContent 和 text content 一致；
   - annotations 标识写入/破坏性。

3. RED：写 `postgres-family-state-writer.test.ts`
   - adapter 只调用 approved SQL functions；
   - 不出现直接 `INSERT INTO family_state.inventory_items` 等业务表写 SQL；
   - row mapping 正确；
   - values 顺序正确。

4. RED：扩展 `migrations.static.test.ts`
   - 有 `0004_write_business_functions.sql`；
   - 4 个写函数存在；
   - 每个函数 `SECURITY DEFINER`；
   - 每个函数调用 `assert_runtime_family_access`；
   - 每个函数写 `mcp_tool_calls` 和 `audit_log`；
   - revoke public；
   - grant execute only；
   - 无 broad table grants。

5. RED：新增 `write-runtime-functions.postgres.test.ts`
   - runtime role 能通过函数写入采购并增加库存；
   - 相同 idempotency key + same hash 不重复写入；
   - 相同 idempotency key + different hash 被拒绝；
   - 越权 family 被拒绝；
   - confirm meal 会扣库存并写 meal_event；
   - skipped meal 不扣库存；
   - 扣减超过库存被拒绝；
   - feedback 能写入但不改 Markdown；
   - runtime direct table writes 仍失败。

6. GREEN：实现 migration、port、adapter、schema、tools、server wiring。

7. 验证：
   - `npm run typecheck`
   - `npm test`
   - `npm run test:coverage`
   - `npm run build`
   - `npm run test:integration`（本机 Docker 可用时）

8. Review：
   - 用 code-reviewer agent 检查安全/幂等/权限/测试覆盖；
   - 修复 CRITICAL/HIGH，尽量修 MEDIUM。

## 部署计划

部署时仍一步一步执行：

1. sync `app/`、`state/`、`infra/` 到 `/opt/family-nutrition-state`；
2. 执行 `0004_write_business_functions.sql`；
3. 重跑 runtime role script，确认 family access 保留；
4. 重建并重启 MCP server；
5. 验证 `/health` 为 milestone 4；
6. 验证 `/tools` 出现 10 个工具；
7. 先调用 `record_meal_feedback` 做低风险写入测试；
8. 再测试采购入库；
9. 最后测试做饭扣库存和反馈后库存调整；
10. WeKnora Agent 端只绑定需要的写工具，且 prompt 中强调“必须复述确认后才能调用写工具”。
