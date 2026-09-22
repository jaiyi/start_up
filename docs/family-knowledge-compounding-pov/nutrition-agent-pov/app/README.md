# 家庭营养状态 MCP 服务

> 本目录用于实现 `family-nutrition-state-mcp`，负责为 WeKnora Agent 提供受控的动态状态读写工具。

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

当前还没有接入真实 Postgres，也还没有实现库存、采购、菜单和反馈业务工具。

Milestone 1 新增数据库基础契约：

```text
- 独立 Docker Postgres 示例配置
- family_state schema 初始 migration
- demo-only seed / fixture
- 动态状态数据字典
- 静态 migration / infra 测试
- 可选真实 Postgres 集成测试
```

Milestone 1 的重点是让数据库结构可复现、可审查、可测试；MCP 服务连接数据库会在 Milestone 2 完成。

## 4. 本地运行

进入目录：

```bash
cd /Users/lijiayi/lianshan/next_start_up/docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
```

安装依赖：

```bash
npm install
```

运行测试：

```bash
npm test
npm run typecheck
npm run build
npm run test:coverage
```

如果本机 Docker 已启动，可以额外运行真实 Postgres 集成测试：

```bash
npm run test:integration
```

如果提示找不到 container runtime，说明 Docker 没有启动；这不会影响默认测试，但需要等 Docker 可用后再验证真实数据库 migration。

本地启动：

```bash
MCP_AUTH_TOKEN=local-dev-token npm run dev
```

另开一个终端测试健康检查：

```bash
curl -i http://127.0.0.1:3030/health
curl -i -H 'Authorization: Bearer local-dev-token' http://127.0.0.1:3030/health
curl -i -H 'Authorization: Bearer local-dev-token' http://127.0.0.1:3030/tools
```

预期：

```text
不带 token：401
带正确 token：200
/tools 只返回 health_check
```

## 5. 推荐代码结构

```text
app/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── vitest.config.ts
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

## 6. 第一版 MCP 工具

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

## 7. 写入要求

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

## 8. Milestone 1 数据库文件

Milestone 1 的数据库文件位于：

```text
../state/data-dictionary.md
../state/migrations/0001_init_family_state.sql
../state/seeds/0001_demo_family.sql
../state/fixtures/demo-family-state.json
../infra/docker-compose.family-state.example.yml
../infra/env.example
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

本阶段默认测试不依赖 Docker；真实 Postgres 集成测试单独用 `npm run test:integration` 执行。
