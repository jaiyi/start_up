# Milestone 3：只读业务 MCP 工具实施计划

## 目标

在当前已经跑通的 `family-nutrition-state-mcp` + Postgres 基础上，实现第一组真正可被 WeKnora Agent 调用的**只读业务工具**：

1. `get_current_inventory`：查询当前库存。
2. `get_inventory_risks`：查询库存风险，如过期、临期、积压。
3. `list_recent_meals`：查询最近已做/已记录餐食。
4. `list_pending_planned_consumptions`：查询待执行计划消耗。
5. `get_meal_feedback_summary`：查询餐食反馈摘要。

本阶段仍然不做库存扣减、菜单写入、反馈写入等写操作；Agent 只能读取状态，不能直接修改 Postgres。

## 核心设计判断

### 1. 继续保持 runtime 最小权限

当前 `family_nutrition_runtime` 不能直接 `SELECT` 业务表，这是正确边界。Milestone 3 不应为了方便直接授予：

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA family_state TO family_nutrition_runtime;
```

而是新增 `0003` migration，通过窄口径 `SECURITY DEFINER` 函数开放只读能力：

- `family_state.read_current_inventory(...)`
- `family_state.read_recent_meals(...)`
- `family_state.read_pending_planned_consumptions(...)`
- `family_state.read_meal_feedback_rows(...)`

runtime role 只拿这些函数的 `EXECUTE` 权限，仍然不能直接读表、写表或建对象。

### 2. App 内部按端口/适配器分层

新增一个业务读取端口，MCP 工具不直接拼 SQL：

```text
MCP tool -> application/domain -> FamilyStateReader port -> Postgres SECURITY DEFINER function
```

这样后续如果要换权限策略、加缓存、或把风险规则迁到配置表，MCP 层不用大改。

### 3. `get_inventory_risks` 使用纯领域逻辑计算

库存风险不是单纯 SQL 查询。计划先在 TypeScript 中做纯函数计算：

- 已过期：`expired`
- 临期：`expiring_soon`
- 无过期日但长时间未动：`aging_stock`
- 数量较高且临期：`possible_overstock`

阈值集中放在 domain 常量里，避免散落硬编码，后续可迁移到家庭偏好配置。

### 4. 反馈工具默认做摘要，不暴露过多原文

`meal_feedback.feedback_text` 可能包含孩子健康、家庭偏好等敏感信息。本阶段工具应返回摘要和有限 recent examples，原文做长度限制，不在错误日志里输出。

## 文件变更计划

### 数据库

1. 新增：
   - `state/migrations/0003_read_only_business_functions.sql`

   内容包括：
   - 创建只读 SQL 函数。
   - 每个函数使用 `SECURITY DEFINER`。
   - 每个函数设置安全 `search_path`。
   - `REVOKE ALL ... FROM PUBLIC`。
   - `GRANT EXECUTE ... TO family_nutrition_runtime`。
   - 再次显式撤销 runtime role 对表的写权限和直接 `SELECT` 权限。

### App 源码

2. 新增：
   - `app/src/ports/family-state-reader.ts`

   定义只读模型和端口方法，例如：
   - `getCurrentInventory(input)`
   - `listRecentMeals(input)`
   - `listPendingPlannedConsumptions(input)`
   - `listMealFeedbackRows(input)`

3. 新增：
   - `app/src/adapters/postgres/postgres-family-state-reader.ts`

   只调用 `0003` 中授予的 SQL functions，使用参数化查询，不拼接用户输入。

4. 新增：
   - `app/src/domain/inventory-risk.ts`

   实现库存风险纯函数，输入库存 items，输出风险列表。保持不可变，不修改输入对象。

5. 新增：
   - `app/src/mcp/schemas/read-only-state-schemas.ts`

   用 Zod 定义输入/输出 schema：
   - `family_id` 必须是 UUID。
   - `limit` 有上限。
   - 日期窗口、分类、存储位置等做明确校验。

6. 新增：
   - `app/src/mcp/tools/register-read-only-state-tools.ts`

   注册五个只读 MCP tools。每个工具：
   - `readOnlyHint: true`
   - `destructiveHint: false`
   - `idempotentHint: true`
   - `openWorldHint: false`
   - 返回 `structuredContent` 和 JSON text content。

7. 修改：
   - `app/src/mcp/server.ts`

   扩展 `AppContext`：
   - 继续保留 `databaseHealthChecker`。
   - 新增 `familyStateReader`。
   - 调用 `registerReadOnlyStateTools(...)`。

8. 修改：
   - `app/src/mcp/tool-registry.ts`

   `/tools` 返回 `health_check` + 五个 Milestone 3 只读业务工具。

9. 修改：
   - `app/src/index.ts`

   创建并注入 `createPostgresFamilyStateReader(pool)`。

### 文档

10. 修改：
    - `app/README.md`
    - 必要时更新 `STRUCTURE.md` 或部署文档。

    说明：Milestone 3 已支持只读状态工具；仍不支持任何写工具。

## TDD 测试计划

### 先写失败测试（RED）

1. 更新工具 allowlist 契约测试：
   - `app/tests/contract/mcp-tools.contract.test.ts`
   - `app/tests/contract/http-runtime.contract.test.ts`

   期望 `/tools` 返回 6 个工具：`health_check` + 五个业务只读工具。

2. 新增 schema 单元测试：
   - `app/tests/unit/read-only-state-schemas.test.ts`

   覆盖：
   - 非法 UUID 被拒绝。
   - 超大 limit 被拒绝。
   - 非法日期窗口被拒绝。

3. 新增库存风险单元测试：
   - `app/tests/unit/inventory-risk.test.ts`

   覆盖：
   - 已过期。
   - 临期。
   - 正常库存。
   - 无过期日。
   - 输入对象不被修改。

4. 新增静态 migration 测试：
   - `app/tests/integration/migrations.static.test.ts`

   断言：
   - 存在 `0003_read_only_business_functions.sql`。
   - 包含 `SECURITY DEFINER`。
   - 包含 `REVOKE ... FROM PUBLIC`。
   - 包含 `GRANT EXECUTE ... TO family_nutrition_runtime`。
   - 不包含 broad `GRANT SELECT ON ALL TABLES`。

5. 新增 Postgres runtime 权限集成测试：
   - `app/tests/integration/read-only-runtime-functions.postgres.test.ts`

   使用 `0001`、`0002`、`0003`、demo seed：
   - runtime role 可以执行只读函数。
   - runtime role 仍不能直接 `SELECT family_state.inventory_items`。
   - runtime role 仍不能 `INSERT/UPDATE/DELETE`。
   - demo family 可以读到菠菜、鸡蛋、计划消耗、已做餐食和反馈摘要基础数据。

### 再实现（GREEN）

按数据库 migration -> port/adapter -> domain -> MCP registrar -> wiring 的顺序实现，让测试逐步通过。

### 最后重构与验证（IMPROVE）

运行：

```bash
cd docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
npm test
npm run typecheck
npm run build
npm run test:coverage
npm run test:integration
```

如果本机 Docker/Testcontainers 不可用，则记录 `npm run test:integration` 的阻塞原因，并至少完成 unit/contract/typecheck/build。

## 成功标准

- `/tools` 能看到 6 个工具。
- WeKnora Agent 可调用五个业务只读工具。
- 所有工具都有 Zod 输入校验。
- 所有工具都是 read-only / non-destructive / idempotent。
- runtime role 只能执行批准的只读函数，不能直接读表或写表。
- demo seed 数据能通过新工具读出。
- 代码不泄露 token、数据库密码、完整连接串。
- 覆盖率保持 80%+，构建和类型检查通过。

## 本阶段不做

- 不实现库存扣减。
- 不实现采购记录写入。
- 不实现菜单计划写入。
- 不实现反馈写入。
- 不开放 SQL 查询工具。
- 不把 Postgres 5432 或 MCP 3030 暴露到公网。
- 不把真实 `.env`、token、数据库 URL 写入 Git。