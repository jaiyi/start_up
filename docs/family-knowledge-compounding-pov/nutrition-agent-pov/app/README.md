# 家庭营养状态 MCP 服务

> 本目录实现 `family-nutrition-state-mcp`，负责为 WeKnora Agent 提供受控的动态状态工具。Milestone 4 已在独立 Postgres 上开放首批只读业务工具和确认后写入工具。

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
不保存 API Key、SSH 密码或 WeKnora 登录凭证；
不把 owner/bootstrap 数据库密码交给运行时 MCP 容器。
```

## 3. 当前 Milestone 状态

Milestone 0 已完成最小可运行骨架：

```text
- TypeScript / Vitest 项目初始化
- 最小 HTTP 服务
- MCP Server 工厂
- health_check 工具注册
- /health 健康检查
- /tools 工具清单
- /mcp Streamable HTTP 入口
- Bearer token 鉴权
- 统一响应 envelope
- 错误信息脱敏
```

Milestone 1 已完成数据库基础契约：

```text
- 独立 Docker Postgres 示例配置
- family_state schema 初始 migration
- demo-only seed / fixture
- 动态状态数据字典
- 静态 migration / infra 测试
- 可选真实 Postgres 集成测试
```

Milestone 2 已完成 MCP 服务连接 Postgres 的最小闭环：

```text
- FAMILY_NUTRITION_DATABASE_URL / DATABASE_URL 配置校验
- pg Pool 连接配置
- DB-backed /health
- DB-backed MCP health_check
- 启动时检查 family_state schema 是否 ready
- runtime app role 只能执行健康检查函数的 EXECUTE-only 权限 migration
- Docker Compose 同时启动 Postgres 和 MCP 服务
```

Milestone 3 已完成首批只读业务工具：

```text
- get_current_inventory：读取当前有效库存
- get_inventory_risks：基于库存和过期时间计算风险
- list_recent_meals：读取近期实际做饭记录
- list_pending_planned_consumptions：读取计划消耗及其执行状态
- get_meal_feedback_summary：读取饭后反馈摘要
- runtime app role 仍不能直接 SELECT / INSERT / UPDATE / DELETE 业务表，只能 EXECUTE 已批准的只读函数
- 数据库函数会通过 runtime_family_access 按 session_user 二次校验 family_id
- get_inventory_risks 使用专用数据库候选函数先按风险优先级筛选，避免普通库存分页漏掉高风险食材
```

Milestone 4 已完成首批确认后写入工具：

```text
- record_purchase_after_confirmation：确认后记录采购并增加库存
- confirm_meal_execution：确认实际做饭/跳过，并在做饭时扣减库存
- record_meal_feedback：确认后记录饭后反馈和待人工审阅的偏好候选
- adjust_inventory_after_feedback：确认后执行库存调整、丢弃或过期处理
- 写入工具必须携带 confirmed=true、confirmation_text、actor_id 和 idempotency_key
- 数据库通过 mcp_tool_calls 记录幂等调用，通过 audit_log 记录审计事件
- runtime app role 仍不能直接 SELECT / INSERT / UPDATE / DELETE 业务表，只能 EXECUTE 已批准函数
```

当前可用工具清单见第 7 节。

## 4. 本地运行

进入目录：

```bash
cd /Users/lijiayi/lianshan/next_start_up/docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
```

安装依赖：

```bash
npm install
```

运行默认测试：

```bash
npm test
npm run typecheck
npm run build
npm run test:coverage
```

默认测试不依赖 Docker；真实 Postgres 集成测试单独执行：

```bash
npm run test:integration
```

如果提示找不到 container runtime，说明 Docker 没有启动；这不会影响默认测试，但需要等 Docker 可用后再验证真实数据库 migration 和 runtime role 权限。

## 5. 本地启动服务

Milestone 2 以后，服务启动必须能连接 Postgres，所以本地启动至少需要：

```bash
MCP_AUTH_TOKEN=local-dev-secret-token-for-family-nutrition \
FAMILY_NUTRITION_ALLOWED_FAMILY_IDS=11111111-1111-1111-1111-111111111111 \
DATABASE_URL=postgresql://family_nutrition_app:local-password@127.0.0.1:5432/family_nutrition \
npm run dev
```

如果本机没有运行 Postgres，服务会拒绝启动并返回脱敏后的数据库不可用错误。

另开一个终端测试健康检查：

```bash
curl -i http://127.0.0.1:3030/health
curl -i -H 'Authorization: Bearer local-dev-secret-token-for-family-nutrition' http://127.0.0.1:3030/health
curl -i -H 'Authorization: Bearer local-dev-secret-token-for-family-nutrition' http://127.0.0.1:3030/tools
```

预期：

```text
不带 token：401
带正确 token 且数据库 ready：200
带正确 token 但数据库不可用或 schema 缺失：503
- /tools 返回 health_check、5 个只读业务工具和 4 个确认后写入工具
```

健康检查成功时，响应数据会包含：

```json
{
  "status": "ok",
  "service": "family-nutrition-state-mcp",
  "milestone": "4",
  "database": {
    "status": "ok",
    "schema": "ready",
    "latencyMs": 1
  }
}
```

## 6. 推荐代码结构

```text
app/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── vitest.config.ts
├── vitest.integration.config.ts
├── Dockerfile
├── src/
│   ├── config/
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

Milestone 2 已经开始采用 ports/adapters 分层：

```text
ports/database-health.ts
  定义数据库健康检查接口。

adapters/postgres/create-postgres-pool.ts
  从 AppConfig 创建 pg Pool。

adapters/postgres/postgres-health-checker.ts
  用只读 SQL 检查 family_state schema 和核心表是否齐全。

application/check-service-health.ts
  把数据库健康状态聚合成服务健康状态。
```

MCP 服务源代码新增：

```text
ports/family-state-reader.ts
  定义当前库存、库存风险候选项、近期餐食、计划消耗、饭后反馈等只读状态接口。

adapters/postgres/postgres-family-state-reader.ts
  只调用 family_state schema 中已授权的 SECURITY DEFINER 读取函数。

domain/inventory-risk.ts
  基于当前库存计算过期、临期、积压等风险信号。

mcp/schemas/read-only-state-schemas.ts
  定义五个只读业务工具的 Zod 输入边界。

ports/family-state-writer.ts
  定义采购记录、确认做饭、饭后反馈、库存调整等写入状态接口。

adapters/postgres/postgres-family-state-writer.ts
  只调用 family_state schema 中已授权的 SECURITY DEFINER 写入函数，不直接写业务表。

mcp/schemas/write-state-schemas.ts
  定义四个确认后写入工具的 Zod 输入边界，强制 confirmed=true、confirmation_text 和 idempotency_key。

mcp/tools/register-write-state-tools.ts
  注册四个写入业务 MCP 工具。
```

## 7. 第一版 MCP 工具规划

Milestone 4 当前暴露：

```text
health_check
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
record_purchase_after_confirmation
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
```

其中 5 个业务读取工具只读、幂等、非破坏性；4 个业务写入工具必须显式确认、幂等并记录审计。数据库 runtime role 通过 `0003_read_only_business_functions.sql` 和 `0004_write_business_functions.sql` 中的 `SECURITY DEFINER` 函数访问批准字段，不具备业务表直接读写权限。

后续工具：

```text
create_planned_consumption
export_state_snapshot_to_markdown
```

## 8. 写入要求

所有写入工具必须要求：

```text
family_id
actor_id
confirmation_text
idempotency_key
request_id / trace_id
结构化 payload
```

并写入：

```text
mcp_tool_calls
audit_log
```

Milestone 4 写入工具通过已批准数据库函数执行事务、幂等和审计；runtime app role 仍没有业务表级直接读写权限。成功写入会记录 `mcp_tool_calls` 和 `audit_log`；畸形输入或业务约束失败会随事务整体回滚，不保留部分业务副作用。

## 9. 数据库与部署文件

核心文件位于：

```text
../state/data-dictionary.md
../state/migrations/0001_init_family_state.sql
../state/migrations/0002_runtime_permissions.sql
../state/migrations/0003_read_only_business_functions.sql
../state/migrations/0004_write_business_functions.sql
../state/seeds/0001_demo_family.sql
../state/fixtures/demo-family-state.json
../infra/docker-compose.family-state.example.yml
../infra/env.example
../infra/postgres/create-runtime-app-role.sql
../infra/postgres/README.md
```

核心表包括：

```text
families
actors
family_members
inventory_items
inventory_events
purchase_records
purchase_items
meal_plans
meal_plan_items
planned_consumptions
meal_events
meal_event_items
meal_feedback
mcp_tool_calls
audit_log
```

暂缓到后续阶段的表：

```text
write_confirmations
preference_observations
state_exports
```

## 10. 配置变量

本地开发可用短变量名，服务器部署优先用长变量名：

```text
MCP_AUTH_TOKEN 或 FAMILY_NUTRITION_MCP_AUTH_TOKEN
FAMILY_NUTRITION_ALLOWED_FAMILY_IDS
DATABASE_URL 或 FAMILY_NUTRITION_DATABASE_URL
DATABASE_POOL_MAX
DATABASE_CONNECTION_TIMEOUT_MS
DATABASE_IDLE_TIMEOUT_MS
DATABASE_STATEMENT_TIMEOUT_MS
PORT
```

真实密码、Token、连接串只允许放在服务器 `.env`，不要提交 Git、不要写进 Markdown、不要上传到 WeKnora。
