# 阶段 4：Postgres + MCP 动态状态系统执行计划

## 目标

在 `docs/family-knowledge-compounding-pov/nutrition-agent-pov/app` 下实现一个独立的 Family Nutrition MCP Service，并配套同机 Docker Postgres 动态状态库。该系统作为家庭营养师 Agent 的动态状态 source of truth，负责库存、采购、计划消耗、实际做饭、饭后反馈、审计和 Markdown 快照导出。

稳定知识仍由 Git Markdown + WeKnora 知识库承载；动态状态由独立 Postgres 承载；WeKnora Agent 只能通过 MCP 工具读写动态状态。

## 核心原则

1. 不复用 WeKnora 内部 PostgreSQL。
2. 不修改 `/opt/WeKnora/docker-compose.yml`。
3. 独立部署目录使用 `/opt/family-nutrition-state`。
4. Postgres 不暴露公网端口。
5. MCP 服务必须鉴权。
6. Agent 不执行任意 SQL。
7. 所有写工具必须经过 schema 校验、用户确认、幂等保护和审计。
8. 所有动态状态按 `family_id` 强制隔离。
9. Markdown 只作为导出快照，不作为事务权威。
10. `.env`、SSH、WeKnora、LLM、数据库和 MCP 密钥不得进入 Git、日志或导出快照。

## 技术栈

优先采用 TypeScript / Node.js：

- Node.js 22 LTS
- TypeScript 5.x
- `@modelcontextprotocol/sdk`
- Zod
- PostgreSQL 16
- `pg`
- SQL migration files
- Vitest
- Testcontainers 或 Docker Postgres integration test
- Pino structured logging
- Docker Compose

## 目录落点

```text
docs/family-knowledge-compounding-pov/nutrition-agent-pov/
├── app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── ports/
│   │   ├── adapters/
│   │   │   ├── postgres/
│   │   │   └── markdown/
│   │   ├── mcp/
│   │   │   ├── schemas/
│   │   │   ├── tools/
│   │   │   └── tool-registry.ts
│   │   ├── jobs/
│   │   └── utils/
│   └── tests/
│       ├── contract/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── state/
│   ├── data-dictionary.md
│   ├── migrations/
│   ├── schemas/
│   ├── seeds/
│   ├── fixtures/
│   └── exports/markdown/
└── infra/
    ├── docker-compose.family-state.example.yml
    ├── env.example
    └── postgres/
```

## 数据模型第一版

第一版迁移先覆盖 15 张核心表：

- `families`
- `actors`
- `family_members`
- `inventory_items`
- `inventory_events`
- `purchase_records`
- `purchase_items`
- `meal_plans`
- `meal_plan_items`
- `planned_consumptions`
- `meal_events`
- `meal_event_items`
- `meal_feedback`
- `mcp_tool_calls`
- `audit_log`

后续再按真实使用反馈补充：

- `preference_observations`
- `write_confirmations`
- `state_exports`

关键约束：

- 所有业务表包含 `family_id`。
- 幂等唯一约束使用 `family_id + tool_name + idempotency_key`。
- 库存事件保留流水，当前库存由 `inventory_items` 快照承载。
- 实际扣库存只能发生在 `confirm_meal_execution` 或 `adjust_inventory_after_feedback`。
- `planned_consumptions` 只表示计划，不直接扣库存。

## MCP 工具第一版

只读工具：

- `get_current_inventory`
- `get_inventory_risks`
- `list_recent_meals`
- `list_pending_planned_consumptions`
- `get_meal_feedback_summary`

写入工具：

- `record_purchase_after_confirmation`
- `create_planned_consumption`
- `confirm_meal_execution`
- `record_meal_feedback`
- `adjust_inventory_after_feedback`
- `export_state_snapshot_to_markdown`

所有写入工具统一必填：

- `family_id`
- `actor_id`
- `confirmation_id` 或明确确认文本
- `idempotency_key`
- `request_id`
- `trace_id`
- 结构化 payload

统一响应 envelope：

```text
success: boolean
data: object | null
error: { code, message } | null
metadata: { request_id, trace_id, audit_id? }
```

建议错误码：

- `VALIDATION_ERROR`
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `IDEMPOTENCY_CONFLICT`
- `INVENTORY_CONFLICT`
- `INTERNAL_ERROR`

## 小白视角执行路线

这套系统不是直接塞进 WeKnora，而是在同一台腾讯云主机上新增一个独立目录和独立 Docker 服务。

当前已知前提：

```text
本地代码仓：/Users/lijiayi/lianshan/next_start_up
WeKnora 部署文档：docs/family-knowledge-compounding-pov/deployment/weknora-tencent-cloud.md
腾讯云登录方式：ssh -p 36000 lijiayi@82.157.94.221
WeKnora 服务器目录：/opt/WeKnora
家庭营养师状态服务目录：/opt/family-nutrition-state
```

理解方式：

```text
本地代码仓
  用来写代码、写测试、写配置模板、写部署文档、提交 Git

腾讯云服务器
  用来运行 Docker、运行 Postgres、运行 MCP 服务、让 WeKnora 访问 MCP 服务
```

最小上线顺序不要一次做完，而是逐步验证：

```text
Milestone 0：先证明 MCP 服务能跑起来
Milestone 1：让 Postgres 数据库能跑起来
Milestone 2：让 MCP 服务能连接 Postgres
Milestone 3：先实现只读工具
Milestone 4：再实现写入工具
Milestone 5：接入 WeKnora Agent
Milestone 6：加备份、导出、上线检查
```

## 小白操作手册

### Milestone 0：准备最小 MCP 服务

目标：先做一个最小服务，只证明：

```text
MCP 服务可以启动
可以返回健康检查
有 token 鉴权
没有 token 会拒绝
错误信息不会泄露密钥
```

这个阶段不需要真实库存业务，也不需要连接真实 WeKnora。

本地完成后，可执行：

```bash
cd /Users/lijiayi/lianshan/next_start_up/docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
npm install
npm test
npm run build
```

完成标准：

```text
测试通过
服务可以本地启动
无 token 调用失败
正确 token 调用成功
没有暴露任意 SQL 工具
没有真实密钥进入代码仓
```

### Milestone 1：准备独立 Docker Postgres

目标：在服务器上新增一个独立 Postgres，专门给家庭营养师动态状态用；同时在代码仓中固定第一版 schema、demo seed、fixture、数据字典和迁移测试。

服务器目标目录：

```bash
/opt/family-nutrition-state
```

服务器目录结构：

```text
/opt/family-nutrition-state
├── docker-compose.yml
├── .env
├── postgres-data/
├── backups/
└── app/
```

登录服务器：

```bash
ssh -p 36000 lijiayi@82.157.94.221
```

创建目录：

```bash
sudo mkdir -p /opt/family-nutrition-state
sudo chown -R lijiayi:lijiayi /opt/family-nutrition-state
cd /opt/family-nutrition-state
```

创建服务器专用 `.env`。

如果服务器没有 `nano`，可以用 `vi`，也可以直接用 heredoc 生成文件。真实密码和 token 只放在服务器，不发给 Claude，不写进 Markdown，不提交 Git：

```bash
cd /opt/family-nutrition-state
OWNER_PASSWORD="$(openssl rand -base64 32)"
APP_PASSWORD="$(openssl rand -base64 32)"
MCP_TOKEN="$(openssl rand -base64 32)"

cat > .env <<EOF
FAMILY_NUTRITION_POSTGRES_DB=family_nutrition
FAMILY_NUTRITION_POSTGRES_OWNER_USER=family_nutrition_owner
FAMILY_NUTRITION_POSTGRES_OWNER_PASSWORD=${OWNER_PASSWORD}
FAMILY_NUTRITION_POSTGRES_APP_USER=family_nutrition_app
FAMILY_NUTRITION_POSTGRES_APP_PASSWORD=${APP_PASSWORD}
FAMILY_NUTRITION_MIGRATION_DATABASE_URL=postgresql://family_nutrition_owner:${OWNER_PASSWORD}@family-nutrition-postgres:5432/family_nutrition
FAMILY_NUTRITION_DATABASE_URL=postgresql://family_nutrition_app:${APP_PASSWORD}@family-nutrition-postgres:5432/family_nutrition
FAMILY_NUTRITION_MCP_AUTH_TOKEN=${MCP_TOKEN}
DATABASE_POOL_MAX=2
DATABASE_CONNECTION_TIMEOUT_MS=2000
DATABASE_IDLE_TIMEOUT_MS=10000
DATABASE_STATEMENT_TIMEOUT_MS=3000
EOF

chmod 600 .env
```

启动服务：

```bash
sudo docker compose up -d
sudo docker compose ps
```

完成标准：

```text
Postgres 容器能启动
Postgres 没有暴露公网端口
数据卷存在
.env 只在服务器上
代码仓里没有真实密码
```

### Milestone 2：MCP 服务连接 Postgres

目标：让 MCP 服务能连接到独立 Postgres。

这个阶段仍然不做完整库存逻辑，只做：

```text
服务启动
数据库连接成功
使用 app/runtime 用户连接 Postgres
app/runtime 用户默认只能执行健康检查函数，不直接读取或写入业务表
健康检查能返回 database.status: ok 和 database.schema: ready
/tools 仍只暴露 health_check
```

服务器上最终要能看到：

```text
family-nutrition-postgres      running
family-nutrition-mcp-server    running
```

### Milestone 3：只读工具

目标：先让 Agent 可以“看状态”，但不能改状态。

只读工具包括：

```text
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

优先做只读，是因为读错了可以修，写错了可能重复扣库存、重复入库。

完成后可验证：

```text
现在库存里有什么？
哪些食材要优先消耗？
最近两周吃过什么？
还有哪些计划消耗没执行？
某道菜反馈怎么样？
```

### Milestone 4：写入工具

目标：开始允许 Agent 修改动态状态。

写入工具包括：

```text
record_purchase_after_confirmation
create_planned_consumption
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
export_state_snapshot_to_markdown
```

每次写入都必须有：

```text
family_id
actor_id
用户确认
idempotency_key
request_id
trace_id
结构化 payload
```

关键业务规则：

```text
推荐之后不扣库存
计划之后不扣库存
只有确认做了才扣库存
饭后反馈先记录事件
库存修正必须再次明确来源和确认
```

### Milestone 5：接入 WeKnora Agent

目标：前面都跑通后，再把 MCP 服务接到 WeKnora。

需要在 WeKnora 配置：

```text
MCP 服务地址
MCP 鉴权 token
允许工具列表
Agent system prompt
工具权限
```

允许工具必须使用白名单；禁止任意 SQL、`shell_exec`、无鉴权 MCP 工具和公网数据库连接。

### Milestone 6：备份、导出、上线检查

目标：让系统可以长期使用。

需要完成：

```text
每日备份 Postgres
定期导出 Markdown 快照
检查快照不含密钥
检查 Postgres 不暴露公网
检查 .env 没进 Git
准备恢复流程
```

## 推荐执行节奏

```text
第 1 次开发：完成 Milestone 0 本地骨架和测试
第 2 次开发：完成 Milestone 1 Postgres compose、migration、data dictionary
第 3 次操作：登录腾讯云，创建 /opt/family-nutrition-state 并启动 Postgres
第 4 次开发：完成 MCP 连接 Postgres、DB-backed health_check 和只能执行健康检查函数的 runtime role
第 5 次操作：部署 MCP 服务到腾讯云并验证 /health、/tools
第 6 次开发：完成只读业务工具
第 7 次开发：完成写入工具、幂等、审计
第 8 次操作：接入 WeKnora Agent
第 9 次：备份、导出、上线验收
```

## TDD 执行顺序

### Milestone 0：MCP 接入可行性验证

目标：先证明 WeKnora 能以目标 transport 调用一个最小 MCP 服务。

1. 在 `app/` 初始化最小 TypeScript 项目。
2. 编写契约测试：只允许暴露白名单工具，不暴露任意 SQL 工具。
3. 实现最小 `ping` / `health` 工具和鉴权中间层。
4. 准备本地运行命令和 Dockerfile 骨架。
5. 验证无 token / 错 token / 正确 token 的行为。

验收：MCP 服务可启动；工具清单可查询；鉴权失败不进入业务逻辑；错误不泄露密钥或 stack trace。

### Milestone 1：状态契约与数据库迁移

目标：先固定数据库结构和动态状态不变量。

1. 写 `state/data-dictionary.md`。
2. 创建 SQL migrations。
3. 写 `migrations.test.ts`。
4. 写 seed / fixture。
5. 实现 migration runner 或明确本地迁移命令。
6. 拆分迁移账号和运行账号说明。

验收：真实 Postgres 集成测试能建表；关键唯一键、外键、family 隔离字段、幂等约束存在。

### Milestone 2：契约测试 + schema 校验

目标：固定 MCP 工具边界。

1. 写 `mcp-tools.contract.test.ts`。
2. 写 `write-tool-schemas.contract.test.ts`。
3. 为所有工具建立 Zod schema。
4. 禁止未知字段和危险字段，如 `sql`、`raw_sql`、`query`、`connection_string`。
5. 统一错误 envelope。

验收：所有工具 schema 测试通过；写工具缺确认、缺 idempotency、缺 request/trace 必须失败。

### Milestone 3：领域层纯函数

目标：先不用数据库实现可测试的业务规则。

1. 写 purchase、planned consumption、meal execution、feedback、idempotency、audit 单元测试。
2. 实现不可变的领域计算函数。
3. 固定单位、日期、数量、风险排序、库存扣减、反馈归一化规则。

验收：单元测试通过；不修改原始输入对象；planned consumption 不扣库存；库存扣减不允许负数。

### Milestone 4：Postgres repository + 只读工具

目标：让 Agent 可以读取真实动态状态。

1. 实现 Postgres adapter。
2. 实现 repository 方法。
3. 写 read tools integration tests。
4. 实现：
   - `get_current_inventory`
   - `get_inventory_risks`
   - `list_recent_meals`
   - `list_pending_planned_consumptions`
   - `get_meal_feedback_summary`

验收：所有只读工具按 family 隔离；排序、过滤、limit 生效；不返回其他家庭数据。

### Milestone 5：写入工具与事务幂等

目标：打通采购、计划、确认执行、反馈、库存修正的强状态闭环。

按 RED → GREEN 顺序分别实现：

1. `record_purchase_after_confirmation`
   - 测试：首次入库、重复入库幂等、同 key 不同 payload 冲突、跨家庭隔离、事务回滚。
2. `create_planned_consumption`
   - 测试：创建计划不扣库存、库存不足 warning、pending 查询、幂等。
3. `confirm_meal_execution`
   - 测试：确认执行扣库存、重复确认不重复扣、库存不足回滚、并发同 meal 只成功一次。
4. `record_meal_feedback`
   - 测试：反馈事件、宝宝/老人/阿姨反馈归一化、敏感健康观察、幂等。
5. `adjust_inventory_after_feedback`
   - 测试：少用加回、多用追加扣减、不能导致负库存、必须绑定 meal/feedback 来源。

验收：所有写工具都有成功、失败、幂等、审计测试；库存不会重复扣减；失败不会留下部分写入。

### Milestone 6：Markdown 导出、Docker、备份和端到端验收

目标：让系统具备可部署和可运营能力。

1. 实现 `export_state_snapshot_to_markdown`。
2. 导出前做敏感信息扫描和脱敏。
3. 完善 `infra/docker-compose.family-state.example.yml`。
4. 完善 `infra/env.example`，只保留示例值。
5. 增加备份/恢复说明。
6. 写最小 e2e：采购 → 计划消耗 → 确认执行 → 饭后反馈 → 库存修正 → 查询状态 → 幂等重放。

验收：Docker 本地可启动；Postgres 不绑定公网；导出不含密钥；e2e 闭环通过；测试覆盖率达到 80%+。

## 安全验收清单

上线前必须确认：

1. 所有 MCP 写工具统一鉴权。
2. 所有动态状态按 `family_id` 强制隔离。
3. 所有输入通过 schema 校验并拒绝未知字段。
4. 所有写操作需要用户确认。
5. 所有写操作具备幂等性。
6. 库存相关操作具备事务和并发控制。
7. Postgres 不公开暴露。
8. MCP 运行时数据库账号最小权限。
9. 审计日志覆盖成功、失败、拒绝、越权、导出。
10. `.env`、SSH、WeKnora、LLM、数据库密钥和 MCP token 不进入 Git、日志或导出快照。

## 第一轮实施范围

批准后第一轮只做 Milestone 0 和 Milestone 1 的骨架：

1. 初始化 `app` TypeScript/Vitest 项目。
2. 添加 MCP 工具注册契约测试。
3. 添加鉴权和错误 envelope 测试。
4. 添加最小 MCP server 骨架。
5. 创建首批 SQL migrations 和迁移测试。
6. 更新 `state/data-dictionary.md`。

暂不接入真实 WeKnora，不写真实家庭数据，不写生产 `.env`。
