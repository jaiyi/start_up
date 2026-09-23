# 阶段 4：Postgres + MCP 动态状态系统执行计划

## 目标

在 `docs/family-knowledge-compounding-pov/nutrition-agent-pov/app` 下实现一个独立的 Family Nutrition MCP Service，并配套同机 Docker Postgres 动态状态库。该系统作为家庭营养师 Agent 的动态状态 source of truth，第一版优先负责库存、菜单计划、实际做饭、饭后反馈和审计；Markdown 快照导出、采购专用工具和复杂统计能力按后续真实需求扩展。

稳定知识仍由 Git Markdown + WeKnora 知识库承载；动态状态由独立 Postgres 承载；WeKnora Agent 只能通过 MCP 工具读写动态状态。

## 核心原则

1. 不复用 WeKnora 内部 PostgreSQL。
2. 不修改 WeKnora 自身的部署编排。
3. 家庭营养师状态服务使用独立部署目录，具体路径以部署 runbook 为准。
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

第一版不预先铺满完整业务域，只固定“库存 + 餐食执行 + 反馈”的最小垂直切片。迁移表以测试驱动逐步增加，避免在真实 POV 验证前背上过重的迁移、鉴权、审计和测试负担。

首批只覆盖这些概念：

- 家庭与操作者：`families`、`actors`
- 库存快照与库存流水：`inventory_items`、`inventory_events`
- 菜单计划与菜品明细：`meal_plans`、`meal_plan_items`
- 实际执行与饭后反馈：`meal_events`、`meal_feedback`
- 工具调用与审计：`mcp_tool_calls`、`audit_log`

暂缓独立建表，等测试和真实用例需要时再补：

- `family_members`
- `purchase_records` / `purchase_items`（第一版可先由 `inventory_events` 表达采购入库）
- `planned_consumptions`（第一版可由 `meal_plans` / `meal_plan_items` 表达计划消耗）
- `meal_event_items`
- `preference_observations`
- `write_confirmations`
- `state_exports`

关键约束：

- 所有业务表包含 `family_id`。
- 幂等唯一约束使用 `family_id + tool_name + idempotency_key`。
- 库存事件保留流水，当前库存由 `inventory_items` 快照承载。
- 推荐和计划都不直接扣库存。
- 只有已确认执行的餐食，才允许通过 `confirm_meal_execution` 或后续反馈修正工具扣减库存。
- 如果某餐已被用户明确确认执行，且饭后在约定时间内没有反馈，可按“正常执行”自动记录默认反馈并扣减计划库存；未确认执行的推荐菜单不能自动扣库存。

## MCP 工具第一版

第一版 MCP 工具只服务最小用户闭环：看库存、确认做饭、记录反馈。采购、偏好学习、Markdown 导出、复杂统计等能力后续按测试和真实使用需求增加。

只读工具：

- `get_current_inventory`
- `get_inventory_risks`
- `list_recent_meals`

写入工具：

- `record_inventory_event_after_confirmation`
- `confirm_meal_execution`
- `record_meal_feedback`

后续再按真实需求补充：

- `record_purchase_after_confirmation`
- `create_planned_consumption`
- `list_pending_planned_consumptions`
- `get_meal_feedback_summary`
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

当前部署入口统一参考：`docs/family-knowledge-compounding-pov/deployment/weknora-tencent-cloud.md`。本文不重复记录具体 SSH 地址、端口、用户名或服务器拓扑，避免产品执行计划和部署 runbook 信息漂移。

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

本地完成后，在代码仓根目录下进入 `nutrition-agent-pov/app` 执行：

```bash
cd docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
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

部署操作不在本文内展开，统一参考：`docs/family-knowledge-compounding-pov/deployment/weknora-tencent-cloud.md`。本文只保留产品和工程验收口径，避免把具体主机、端口、用户名、目录创建命令和 `.env` 生成细节复制到多个文件里。

本阶段需要在部署 runbook 中完成并验证：

```text
1. 在服务器上创建独立家庭营养师状态服务目录。
2. 使用服务器本地 `.env` 保存真实数据库密码和 MCP token。
3. 启动独立 Docker Postgres。
4. 确认 Postgres 不暴露公网端口。
5. 确认代码仓、Markdown、WeKnora 知识库和导出快照都不包含真实密钥。
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
```

后续再补充 `list_pending_planned_consumptions` 和 `get_meal_feedback_summary`。

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
record_inventory_event_after_confirmation
confirm_meal_execution
record_meal_feedback
```

后续再补充 `record_purchase_after_confirmation`、`create_planned_consumption`、`adjust_inventory_after_feedback` 和 `export_state_snapshot_to_markdown`。

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
第 3 次操作：登录腾讯云，按部署 runbook 创建家庭营养师状态服务目录并启动 Postgres
第 4 次开发：完成 MCP 连接 Postgres、DB-backed health_check 和只能执行健康检查函数的 runtime role
第 5 次操作：部署 MCP 服务到腾讯云并验证 /health、/tools
第 6 次开发：完成只读业务工具
第 7 次开发：完成写入工具、幂等、审计
第 8 次操作：接入 WeKnora Agent
第 9 次：备份、导出、上线验收
```

## TDD 执行顺序

下面是唯一的阶段 4 canonical 执行顺序，与前面的“小白操作手册”保持同一套 Milestone 编号。

### Milestone 0：最小 MCP 服务骨架

目标：先证明 MCP 服务能独立启动、鉴权、返回健康检查，并且只暴露白名单工具。这个阶段不要求真实 WeKnora 接入，也不连接业务数据库。

1. 在 `app/` 初始化最小 TypeScript 项目。
2. 编写契约测试：只允许暴露白名单工具，不暴露任意 SQL 工具。
3. 实现最小 `health_check` 工具和鉴权中间层。
4. 准备本地运行命令和 Dockerfile 骨架。
5. 验证无 token / 错 token / 正确 token 的行为。

验收：MCP 服务可启动；工具清单可查询；鉴权失败不进入业务逻辑；错误不泄露密钥或 stack trace。

### Milestone 1：状态契约与数据库迁移

目标：先固定第一版动态状态的最小数据库结构和不变量。

1. 写 `state/data-dictionary.md`。
2. 创建 SQL migrations。
3. 写 `migrations.test.ts`。
4. 写 seed / fixture。
5. 实现 migration runner 或明确本地迁移命令。
6. 拆分迁移账号和运行账号说明。

第一版只覆盖这些概念：家庭与操作者、库存快照与库存流水、菜单计划与菜品明细、实际执行与饭后反馈、工具调用与审计。

验收：真实 Postgres 集成测试能建表；关键唯一键、外键、family 隔离字段、幂等约束存在。

### Milestone 2：MCP 服务连接 Postgres

目标：让 MCP 服务能连接到独立 Postgres，但仍只暴露健康检查。

1. 写数据库连接配置测试。
2. 写 runtime role 权限测试。
3. 验证 app/runtime 用户默认只能执行健康检查函数，不直接读取或写入业务表。
4. 健康检查返回 `database.status: ok` 和 `database.schema: ready`。
5. `/tools` 仍只暴露 `health_check`。

验收：MCP 服务可用运行账号连接 Postgres；schema 未就绪时能给出清晰错误；业务表不会通过通用 SQL 工具暴露。

### Milestone 3：只读工具

目标：让 Agent 可以读取真实动态状态，但不能修改状态。

1. 写 `mcp-tools.contract.test.ts`，固定工具白名单。
2. 为只读工具建立 Zod schema。
3. 实现 Postgres adapter 和 repository 方法。
4. 写 read tools integration tests。
5. 实现：
   - `get_current_inventory`
   - `get_inventory_risks`
   - `list_recent_meals`

验收：所有只读工具按 family 隔离；排序、过滤、limit 生效；不返回其他家庭数据；不暴露 SQL、连接串或内部表结构。

### Milestone 4：写入工具与事务幂等

目标：打通第一版库存事件、确认执行和饭后反馈的强状态闭环。

先写领域层纯函数和 schema 测试，再实现数据库事务。第一版写入工具只包括：

1. `record_inventory_event_after_confirmation`
   - 测试：首次入库/修正、重复写入幂等、同 key 不同 payload 冲突、跨家庭隔离、事务回滚。
2. `confirm_meal_execution`
   - 测试：确认执行扣库存、重复确认不重复扣、未确认推荐不扣库存、库存不足回滚、并发同 meal 只成功一次。
3. `record_meal_feedback`
   - 测试：反馈事件、宝宝/老人/阿姨反馈归一化、敏感健康观察、幂等；已确认执行且超时无反馈时，允许记录默认正常反馈并按计划扣减库存。

验收：所有写工具都有成功、失败、幂等、审计测试；推荐和计划本身不会扣库存；库存不会重复扣减；失败不会留下部分写入。

### Milestone 5：接入 WeKnora Agent

目标：前面都跑通后，再把 MCP 服务接到 WeKnora。

需要在 WeKnora 配置：

1. MCP 服务地址。
2. MCP 鉴权 token。
3. 允许工具列表。
4. Agent system prompt。
5. 工具权限。

验收：WeKnora Agent 能调用只读工具查询库存和近期菜单；写入工具必须在用户明确确认后才执行；禁止任意 SQL、`shell_exec`、无鉴权 MCP 工具和公网数据库连接。

### Milestone 6：备份、导出、上线检查

目标：让系统可以长期使用。

1. 完善 `infra/docker-compose.family-state.example.yml`。
2. 完善 `infra/env.example`，只保留示例值。
3. 增加备份/恢复说明。
4. 增加导出快照机制，定期把 Postgres 中的库存、菜单和反馈导出到 Markdown。
5. 导出前做敏感信息扫描和脱敏。
6. 写最小 e2e：库存入库/修正 → 生成菜单计划 → 确认执行 → 饭后反馈或默认正常反馈 → 查询状态 → 幂等重放。

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
5. 创建首批 SQL migrations、seed、fixture 和迁移测试。
6. 更新 `state/data-dictionary.md`。

暂不接入真实 WeKnora，不写真实家庭数据，不写生产 `.env`。
