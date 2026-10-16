# Milestone 2：MCP 服务连接 Postgres 实施计划

## 目标

在已经完成服务器部署的独立 Postgres 基础上，让 `family-nutrition-state-mcp` 服务具备数据库连接能力，并通过 authenticated `/health` 与 MCP `health_check` 验证：

```text
MCP Service -> Postgres family_state schema
```

本阶段仍然不接入 WeKnora、不实现库存/采购/菜单/反馈业务工具，只完成安全连接、健康检查、最小权限 runtime role、Docker Compose 与部署文档。

## 范围

### 本阶段做

1. App 配置增加 Postgres runtime 配置。
2. 增加共享 `pg.Pool`，避免每个请求新建连接。
3. 增加数据库健康检查：连接可用、`family_state` schema 存在、核心表存在。
4. `/health` 返回服务状态 + 数据库状态。
5. MCP `health_check` 返回同样的 DB-backed 健康状态。
6. 增加 runtime app role SQL/psql 脚本，先只授予最小只读权限。
7. 更新 Docker Compose，让 MCP 服务和 Postgres 处于同一 Docker network。
8. 更新 beginner-friendly 部署文档。
9. 按 TDD 增加/更新单元测试、契约测试和可选 Testcontainers 集成测试。

### 本阶段不做

1. 不实现 `get_current_inventory` 等业务读工具。
2. 不实现任何写工具。
3. 不给 MCP app role 授予写权限。
4. 不接入 WeKnora Agent。
5. 不暴露任意 SQL / shell 工具。
6. 不修改 WeKnora 内部数据库或 `/opt/WeKnora/docker-compose.yml`。
7. 不提交真实 `.env`、数据库密码、MCP token 或连接串。

## 设计决策

### 1. 配置命名

部署侧继续使用：

```text
FAMILY_NUTRITION_MCP_AUTH_TOKEN
FAMILY_NUTRITION_DATABASE_URL
```

App 侧为了兼容 Milestone 0 的本地开发，也保留：

```text
MCP_AUTH_TOKEN
DATABASE_URL
```

读取优先级：

```text
mcpAuthToken = FAMILY_NUTRITION_MCP_AUTH_TOKEN || MCP_AUTH_TOKEN
postgresUrl = FAMILY_NUTRITION_DATABASE_URL || DATABASE_URL
```

校验规则：

- token 必须非空。
- database URL 必须非空。
- `set-on-server-only` 这类占位值必须拒绝。
- URL 必须是 `postgres://` 或 `postgresql://`。
- 错误信息不得包含完整 URL、密码或 token。

### 2. 健康检查返回结构

推荐结构：

```ts
{
  status: 'ok' | 'degraded',
  service: 'family-nutrition-state-mcp',
  milestone: '2',
  database: {
    status: 'ok' | 'unavailable',
    schema: 'ready' | 'missing' | 'unknown',
    latencyMs: number
  }
}
```

HTTP 行为：

- 数据库健康：`GET /health` 返回 `200`。
- 数据库不可用或 schema 缺失：`GET /health` 返回 `503`，但响应仍使用统一 envelope，且不泄露 DB 连接细节。
- 未鉴权：仍返回 `401`，并且不能触发数据库检查。

MCP 行为：

- `health_check` 仍然是唯一 MCP 工具。
- `health_check` 返回 DB-backed structured content。
- 不增加 SQL 工具。

### 3. Postgres 权限策略

新增一个 runtime role 权限脚本：

```text
state/migrations/0002_runtime_permissions.sql
```

职责：

- 创建/维护无登录权限的 runtime group role，例如 `family_nutrition_runtime`。
- 授予：
  - database connect
  - `family_state` schema usage
  - 当前阶段需要的 `SELECT` 权限
- 不授予：
  - schema/table create
  - insert/update/delete/truncate
  - drop/alter
  - superuser/createdb/createrole/replication

另新增部署脚本：

```text
infra/postgres/create-runtime-app-role.sql
```

职责：

- 使用 psql variables 创建/更新 login role。
- 密码从服务器 `.env` 传入，不写入 Git。
- 将 login role 加入 runtime group role。

### 4. Docker Compose

更新：

```text
infra/docker-compose.family-state.example.yml
```

新增服务：

```text
family-nutrition-mcp-server
```

关键要求：

- `build: ./app`
- `depends_on.family-nutrition-postgres.condition: service_healthy`
- 与 Postgres 同网络：`family-nutrition-state`
- MCP 端口默认只绑定本机：`127.0.0.1:3030:3030`
- Postgres 继续不暴露公网 `5432`
- MCP 容器只拿 runtime database URL 和 MCP token，不拿 owner password

## 文件变更计划

### App 源码

1. 修改 `app/src/config/load-config.ts`
   - 增加 database URL、pool max、connection timeout、idle timeout 配置。
   - 支持部署变量和本地变量别名。
   - 增加安全校验与 sanitized error。

2. 新增 `app/src/ports/database-health.ts`
   - 定义数据库健康检查接口和结果类型。
   - 便于 HTTP/MCP 使用 fake checker 做测试。

3. 新增 `app/src/adapters/postgres/create-postgres-pool.ts`
   - 创建共享 `pg.Pool`。
   - 使用小 pool 默认值，避免小云主机连接过多。
   - 不在日志中输出连接串。

4. 新增 `app/src/adapters/postgres/postgres-health-checker.ts`
   - 执行只读健康检查 SQL。
   - 验证 schema/table readiness。
   - 捕获错误并返回安全状态，不把 raw DB error 传给客户端。

5. 新增 `app/src/application/check-service-health.ts`
   - 组合 service health + database health。
   - 输出固定结构。

6. 修改 `app/src/mcp/server.ts`
   - 将静态 `HEALTH_CHECK_RESPONSE` 改为依赖注入 health service。
   - `/health` 调用 DB-backed health。
   - `/mcp` 注册 DB-backed `health_check`。
   - 保持鉴权先于业务逻辑。

7. 修改 `app/src/mcp/tool-registry.ts`
   - 仍只暴露 `health_check`。
   - 更新描述为检查 MCP 服务和 Postgres 状态数据库。

8. 修改 `app/src/index.ts`
   - async 启动。
   - 创建 Postgres pool。
   - 启动前可执行一次 readiness check。
   - 增加 SIGINT/SIGTERM graceful shutdown，关闭 HTTP server 和 pg pool。
   - 日志不输出 secrets。

### 数据库/infra

9. 新增 `state/migrations/0002_runtime_permissions.sql`
   - 最小权限 runtime group role。
   - read-only grants。

10. 新增 `infra/postgres/create-runtime-app-role.sql`
    - 使用 psql variables 创建/更新 app login role。
    - 不包含真实密码。

11. 修改 `infra/docker-compose.family-state.example.yml`
    - 增加 MCP service。
    - 保持 Postgres private。
    - MCP localhost-only 暴露。

12. 修改 `infra/env.example`
    - 增加 DB pool/timeout 示例变量。
    - 明确真实值只放服务器 `.env`。

13. 修改 `app/.env.example`
    - 增加本地开发用安全占位配置。

### 文档

14. 修改 `app/README.md`
    - 更新 Milestone 2 状态、运行方式、health payload、测试命令。

15. 修改 `infra/README.md`
    - 说明 MCP 服务容器、端口、与 Postgres 网络关系。

16. 修改 `infra/postgres/README.md`
    - 增加 Milestone 2 服务器部署步骤：备份、上传 app、创建 runtime role、构造 server-only DB URL、启动 MCP、curl 验证。

17. 修改 `state/data-dictionary.md`
    - 增加 runtime role / 当前只读权限说明。

18. 修改 `product/family-nutrition-phase-4-execution-plan.md`
    - 将当前口径同步为：Milestone 2 = MCP 连接 Postgres 与 DB-backed health。

## TDD 测试计划

### RED：先写/改测试

1. `app/tests/unit/config.test.ts`
   - 缺少 DB URL 失败。
   - placeholder DB URL 失败。
   - 非 postgres URL 失败。
   - 合法 DB URL 成功。
   - deployment token alias 生效。
   - 错误输出不包含 password / full URL。

2. 新增 `app/tests/unit/service-health.test.ts`
   - DB healthy -> service status ok。
   - DB unavailable -> service status degraded。
   - DB error 不泄露 secret。

3. 修改 `app/tests/contract/http-runtime.contract.test.ts`
   - 未鉴权 `/health` 不调用 DB checker。
   - 鉴权 `/health` DB healthy 返回 200。
   - 鉴权 `/health` DB unhealthy 返回 503。
   - 响应不包含 DB URL / password / token。

4. 修改 `app/tests/contract/mcp-tools.contract.test.ts`
   - 工具 allowlist 仍只有 `health_check`。
   - 仍禁止 SQL/shell 工具。

5. 新增/修改 integration tests：
   - `app/tests/integration/runtime-role.postgres.test.ts`
   - 使用 Testcontainers：应用 0001、0002、创建 app role、用 app role 连接。
   - 验证 app role 可以执行 health read query。
   - 验证 app role 不能 create table、不能 insert/update/delete。

6. 修改 `app/vitest.integration.config.ts`
   - include 所有 `tests/integration/*.postgres.test.ts`。

### GREEN：实现

按上面的文件变更计划逐步实现，保证默认 `npm test` 不依赖 Docker。

### REFACTOR：整理

- 确认函数小而清晰。
- 连接池只创建一次。
- 错误处理集中脱敏。
- docs 与实际命令一致。

## 验证命令

默认验证：

```bash
cd docs/family-knowledge-compounding-pov/nutrition-agent-pov/app
npm test
npm run typecheck
npm run build
npm run test:coverage
```

可选真实 Postgres 集成验证，只有 Docker 可用时运行：

```bash
npm run test:integration
```

安全检查：

```bash
git diff --check
git status --short
```

## 服务器部署验收目标

实现并提交后，服务器上会按步骤完成：

1. 备份当前 Milestone 1 数据库。
2. 上传更新后的 app、compose、migration、infra scripts。
3. 更新 `/opt/family-nutrition-state/.env`，补齐 app user 和 database URL。
4. 执行 `0002_runtime_permissions.sql`。
5. 执行 `create-runtime-app-role.sql`。
6. `sudo docker compose up -d --build family-nutrition-mcp-server`。
7. 验证未鉴权：

```bash
curl -i http://127.0.0.1:3030/health
```

应返回 401。

8. 验证鉴权 health：

```bash
curl -i \
  -H "Authorization: Bearer $FAMILY_NUTRITION_MCP_AUTH_TOKEN" \
  http://127.0.0.1:3030/health
```

应返回 200，并包含：

```text
service = family-nutrition-state-mcp
milestone = 2
database.status = ok
```

9. 验证 tool list：

```bash
curl -i \
  -H "Authorization: Bearer $FAMILY_NUTRITION_MCP_AUTH_TOKEN" \
  http://127.0.0.1:3030/tools
```

应只看到 `health_check`。

10. 确认 Postgres 没有公网暴露。

## 风险与控制

1. **环境变量容易填错**
   - 文档给出明确 `.env` 字段和 Docker network host：`family-nutrition-postgres`。

2. **DB 连接错误泄露连接串**
   - 所有错误 response 使用 sanitizer；新增测试覆盖。

3. **runtime app role 权限过大**
   - Milestone 2 只给 SELECT；集成测试验证不能 DDL/写入。

4. **MCP 服务早于 Postgres 启动**
   - Compose `depends_on` + app startup readiness check。

5. **小云主机连接数过高**
   - 默认 pool max 控制在 2-5。

6. **误以为已经能被 WeKnora 使用业务状态**
   - 文档明确：本阶段只验证连接和健康检查，WeKnora 接入在后续 Milestone。

## 完成标准

- 默认测试、类型检查、构建、覆盖率全部通过。
- Docker 可用时集成测试通过。
- `/tools` 仍只暴露 `health_check`。
- `/health` 和 MCP `health_check` 是 DB-backed。
- Postgres runtime app role 只读、无 DDL/写权限。
- Compose 包含 Postgres + MCP service，Postgres 不暴露公网。
- 文档包含小白可执行的服务器部署步骤。
- 没有真实 secrets 被提交。