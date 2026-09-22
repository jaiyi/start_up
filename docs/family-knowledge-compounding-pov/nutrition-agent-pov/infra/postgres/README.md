# Postgres 部署与迁移说明

> 本文档面向第一次部署数据库的执行者，目标是在腾讯云同一台机器上，为家庭营养师 Agent 准备独立 Postgres 和 MCP 服务。不要把真实密码、Token、连接串写进 Git 或发给 Claude。

## 1. 本目录的作用

生产服务器建议使用独立目录：

```bash
/opt/family-nutrition-state
```

它和 WeKnora 的目录分开：

```text
/opt/WeKnora                  # WeKnora 自己的服务，不改它
/opt/family-nutrition-state   # 家庭营养师动态状态服务
```

这样做的好处：

1. 不污染 WeKnora 内部数据库。
2. 不修改 WeKnora 的 docker compose。
3. 后续 MCP 服务、Postgres、备份可以独立维护。
4. 出问题时边界更清晰。

## 2. 重要概念

### Postgres 容器

Postgres 是保存动态状态的数据库。Docker 容器让它用固定版本 `postgres:16` 启动，避免每台机器安装方式不同。

### MCP 服务容器

MCP 服务是 Agent 和数据库之间的安全边界。WeKnora Agent 后续不会直接连数据库，而是调用 MCP 暴露的白名单工具。

Milestone 2 当前只开放：

```text
health_check
```

它用于确认 MCP 服务和 Postgres schema 都已经 ready。

### 数据目录

```text
./postgres-data:/var/lib/postgresql/data
```

左边是服务器目录，右边是容器内部目录。Postgres 真正的数据保存在服务器的 `postgres-data`，容器重启不会丢。

### 备份目录

```text
./backups:/backups
```

后续 Milestone 6 会用它保存 `pg_dump` 备份。

### Migration

Migration 是数据库结构脚本。当前包括：

```text
state/migrations/0001_init_family_state.sql
state/migrations/0002_runtime_permissions.sql
```

`0001` 创建 schema、表、外键、唯一约束和索引。

`0002` 创建 runtime no-login group role，并授予只读权限。

### Runtime app role

MCP 服务运行时不使用 owner/bootstrap 数据库账号，而使用权限更小的 app/runtime 账号。

Milestone 2 中 app/runtime 账号只允许执行健康检查函数：

```text
可以：EXECUTE family_state.check_runtime_health(text[])，用于健康检查。
不可以：直接 SELECT / INSERT / UPDATE / DELETE family_state 业务表。
```

后续只读工具上线时，再按具体工具和表逐步增加最小所需权限。

创建 app/runtime 登录账号的脚本是：

```text
infra/postgres/create-runtime-app-role.sql
```

这个脚本必须通过服务器 `.env` 注入用户名和密码，不能在 SQL 文件里硬编码真实密码。

### Seed

Seed 是演示数据脚本。当前第一版是：

```text
state/seeds/0001_demo_family.sql
```

它只包含 demo 数据，用于验证数据库能正常工作。

## 3. Milestone 1：Postgres 已完成步骤

如果是全新部署，先完成这些步骤；如果服务器已经完成 Milestone 1，可以直接跳到 Milestone 2。

### Step 1：准备目录

在服务器上执行：

```bash
sudo mkdir -p /opt/family-nutrition-state
sudo chown -R "$USER":"$USER" /opt/family-nutrition-state
cd /opt/family-nutrition-state
```

### Step 2：复制文件

从仓库中复制以下内容到服务器目录：

```text
infra/docker-compose.family-state.example.yml -> /opt/family-nutrition-state/docker-compose.yml
infra/env.example                           -> /opt/family-nutrition-state/.env
state/migrations/                           -> /opt/family-nutrition-state/state/migrations/
state/seeds/                                -> /opt/family-nutrition-state/state/seeds/
```

注意：`.env` 是服务器私有文件，不要提交 Git。

### Step 3：创建或编辑 `.env`

如果服务器没有 `nano`，不要紧，可以用 `vi`：

```bash
vi /opt/family-nutrition-state/.env
```

也可以用下面这种方式在服务器上生成随机值并写入 `.env`。命令里的真实随机值只会留在服务器 `.env`，不要复制到聊天窗口：

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

如果 `.env` 已经存在，不要覆盖已有 owner 密码。只补缺失项即可。

### Step 4：启动 Postgres

```bash
cd /opt/family-nutrition-state
sudo docker compose up -d family-nutrition-postgres
sudo docker compose ps
```

健康状态应变为 `healthy`。

### Step 5：执行 migration 0001

先让当前 shell 读取 `.env`：

```bash
set -a
. /opt/family-nutrition-state/.env
set +a
```

执行：

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -f /migrations/0001_init_family_state.sql
```

### Step 6：插入 demo seed

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -f /seeds/0001_demo_family.sql
```

### Step 7：检查表是否存在

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -c '\dt family_state.*'
```

应该能看到 `families`、`inventory_items`、`meal_plans`、`mcp_tool_calls`、`audit_log` 等 15 张表。

## 4. Milestone 2：MCP 服务连接 Postgres

Milestone 2 在 Milestone 1 的基础上新增 MCP 服务和 runtime app role。

### Step 1：更新服务器文件

把最新文件复制到服务器目录：

```text
app/                                      -> /opt/family-nutrition-state/app/
infra/docker-compose.family-state.example.yml -> /opt/family-nutrition-state/docker-compose.yml
state/migrations/0002_runtime_permissions.sql -> /opt/family-nutrition-state/state/migrations/0002_runtime_permissions.sql
infra/postgres/create-runtime-app-role.sql     -> /opt/family-nutrition-state/infra/postgres/create-runtime-app-role.sql
```

如果目录不存在，先创建：

```bash
mkdir -p /opt/family-nutrition-state/state/migrations
mkdir -p /opt/family-nutrition-state/infra/postgres
```

### Step 2：确认 `.env` 包含 Milestone 2 变量

服务器 `.env` 至少需要：

```env
FAMILY_NUTRITION_POSTGRES_DB=family_nutrition
FAMILY_NUTRITION_POSTGRES_OWNER_USER=family_nutrition_owner
FAMILY_NUTRITION_POSTGRES_OWNER_PASSWORD=服务器真实值
FAMILY_NUTRITION_POSTGRES_APP_USER=family_nutrition_app
FAMILY_NUTRITION_POSTGRES_APP_PASSWORD=服务器真实值
FAMILY_NUTRITION_MIGRATION_DATABASE_URL=postgresql://owner用户:owner密码@family-nutrition-postgres:5432/family_nutrition
FAMILY_NUTRITION_DATABASE_URL=postgresql://app用户:app密码@family-nutrition-postgres:5432/family_nutrition
FAMILY_NUTRITION_MCP_AUTH_TOKEN=服务器真实值
DATABASE_POOL_MAX=2
DATABASE_CONNECTION_TIMEOUT_MS=2000
DATABASE_IDLE_TIMEOUT_MS=10000
DATABASE_STATEMENT_TIMEOUT_MS=3000
```

这里的示例中文占位不要照抄；真实值只留在服务器。

确保权限是：

```bash
chmod 600 /opt/family-nutrition-state/.env
ls -l /opt/family-nutrition-state/.env
```

预期类似：

```text
-rw------- 1 lijiayi lijiayi ... .env
```

### Step 3：读取 `.env`

```bash
cd /opt/family-nutrition-state
set -a
. /opt/family-nutrition-state/.env
set +a
```

### Step 4：执行 runtime 权限 migration

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -f /migrations/0002_runtime_permissions.sql
```

### Step 5：创建或更新 app/runtime 登录角色

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -v app_user="$FAMILY_NUTRITION_POSTGRES_APP_USER" \
  -v app_password="$FAMILY_NUTRITION_POSTGRES_APP_PASSWORD" \
  -f /postgres-admin/create-runtime-app-role.sql
```

### Step 6：验证 runtime app 用户只能执行健康检查函数

先验证可以执行健康检查函数：

```bash
sudo docker compose exec family-nutrition-postgres \
  psql "$FAMILY_NUTRITION_DATABASE_URL" \
  -c "select * from family_state.check_runtime_health(array['families','actors','family_members','inventory_items','inventory_events','purchase_records','purchase_items','meal_plans','meal_plan_items','planned_consumptions','meal_events','meal_event_items','meal_feedback','mcp_tool_calls','audit_log']);"
```

预期会返回 `schema_exists = t`，并且 `existing_table_count = 15`。

再验证不能直接读取业务表：

```bash
sudo docker compose exec family-nutrition-postgres \
  psql "$FAMILY_NUTRITION_DATABASE_URL" \
  -c 'select count(*) from family_state.families;'
```

这条直接查表命令应该失败，出现权限不足相关报错。这是正确结果。

最后验证不能写入：

```bash
sudo docker compose exec family-nutrition-postgres \
  psql "$FAMILY_NUTRITION_DATABASE_URL" \
  -c "insert into family_state.families (display_name) values ('should fail');"
```

第二条命令应该失败，出现权限不足相关报错。这是正确结果。

### Step 7：启动 MCP 服务

```bash
sudo docker compose up -d --build family-nutrition-mcp-server
sudo docker compose ps
```

预期两个容器都健康：

```text
family-nutrition-postgres      healthy
family-nutrition-mcp-server    healthy
```

### Step 8：验证 `/health`

```bash
curl -i -H "Authorization: Bearer $FAMILY_NUTRITION_MCP_AUTH_TOKEN" \
  http://127.0.0.1:3030/health
```

预期 HTTP 200，并包含：

```json
{
  "status": "ok",
  "service": "family-nutrition-state-mcp",
  "milestone": "2",
  "database": {
    "status": "ok",
    "schema": "ready"
  }
}
```

### Step 9：验证 `/tools`

```bash
curl -i -H "Authorization: Bearer $FAMILY_NUTRITION_MCP_AUTH_TOKEN" \
  http://127.0.0.1:3030/tools
```

预期只看到：

```text
health_check
```

如果看到 `raw_sql`、`query_database`、`execute_sql` 或 `shell_exec`，说明配置错误，必须停止接入。

## 5. 安全注意事项

1. 不要开放公网 `5432`。
2. 不要把 `.env` 提交到 Git。
3. 不要把真实数据库密码发给 Claude。
4. 不要把真实 Token 写进 Markdown。
5. 不要让 Agent 直接执行 SQL。
6. MCP 工具只能暴露经过 schema 校验的业务操作。
7. 错误日志不要打印完整连接串。
8. Milestone 2 的 runtime app 用户只允许执行 `family_state.check_runtime_health(text[])`，不能直接读取或写入业务表。
9. MCP 服务对外只绑定 `127.0.0.1:3030`，接入 WeKnora 前不要开放公网。

## 6. 常见问题

### 为什么 compose 里没有 `5432:5432`？

因为 Postgres 默认只给同一个 Docker 网络里的 MCP 服务访问。对公网开放数据库端口会显著增加攻击面。

如果临时需要在服务器本机调试，可以只绑定本机：

```yaml
ports:
  - "127.0.0.1:5432:5432"
```

不要写成：

```yaml
ports:
  - "5432:5432"
```

### 为什么 MCP 服务端口绑定 `127.0.0.1:3030`？

Milestone 2 先只验证本机访问，避免还没接入 WeKnora 时就把工具入口暴露到公网。后续如果 WeKnora 需要访问 MCP，要根据实际网络拓扑决定是同机访问、内网访问，还是加反向代理和额外访问控制。

### 为什么要分 owner 用户和 app 用户？

owner/bootstrap 用户用于建表和迁移，权限较高。app/runtime 用户只给 MCP 服务运行时使用，应该最小权限。

Milestone 2 只做健康检查，所以 app/runtime 用户只授予 `EXECUTE` `family_state.check_runtime_health(text[])`。它不能直接读取或写入业务表。后续只读/写入工具上线时，再按具体业务操作逐步增加所需权限。

### 为什么 planned_consumptions 不扣库存？

计划只是“可能会做”。如果推荐了菜单但当天没做，直接扣库存会污染真实状态。只有用户确认已经做饭，才进入 `meal_events`，再由写工具生成对应的 `inventory_events`。

### 为什么 `/health` 也要鉴权？

健康检查里虽然不会返回密码，但它会暴露服务是否存在、schema 是否 ready 等运行状态。统一要求 Bearer token 可以减少被外部探测的风险。

## 7. Milestone 2 完成标志

1. Postgres 容器健康。
2. MCP 服务容器健康。
3. `0002_runtime_permissions.sql` 执行成功。
4. app/runtime 登录角色创建成功。
5. app/runtime 用户可以执行健康检查函数，但不能直接读取或写入业务表。
6. `/health` 带 token 返回 `status: ok`、`milestone: 2`、`database.schema: ready`。
7. `/tools` 只返回 `health_check`。
8. Postgres 没有暴露公网端口。
9. `.env` 权限是 `600`。
10. 仓库和文档中没有真实密码、Token 或连接串。
