# Postgres 部署与迁移说明

> 本文档面向第一次部署数据库的执行者，目标是在腾讯云同一台机器上，为家庭营养师 Agent 准备独立 Postgres。不要把真实密码、Token、连接串写进 Git 或发给 Claude。

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

Migration 是数据库结构脚本。当前第一版是：

```text
state/migrations/0001_init_family_state.sql
```

它负责创建 schema、表、外键、唯一约束和索引。

### Seed

Seed 是演示数据脚本。当前第一版是：

```text
state/seeds/0001_demo_family.sql
```

它只包含 demo 数据，用于验证数据库能正常工作。

## 3. 本地或服务器部署步骤

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

### Step 3：编辑 `.env`

在服务器上编辑：

```bash
nano /opt/family-nutrition-state/.env
```

把所有 `change-me-*` 替换为真实强密码或 token。不要把这些真实值复制到 Markdown、聊天窗口或 WeKnora 知识库。

### Step 4：启动 Postgres

```bash
cd /opt/family-nutrition-state
sudo docker compose up -d
```

查看容器状态：

```bash
sudo docker compose ps
```

健康状态应变为 `healthy`。

### Step 5：执行 migration

```bash
sudo docker compose exec family-nutrition-postgres \
  psql -U "$FAMILY_NUTRITION_POSTGRES_OWNER_USER" \
  -d "$FAMILY_NUTRITION_POSTGRES_DB" \
  -f /migrations/0001_init_family_state.sql
```

如果 shell 没有自动加载 `.env`，可以先执行：

```bash
set -a
. /opt/family-nutrition-state/.env
set +a
```

再运行 migration 命令。

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

应该能看到 `families`、`inventory_items`、`meal_plans`、`mcp_tool_calls`、`audit_log` 等表。

## 4. 安全注意事项

1. 不要开放公网 `5432`。
2. 不要把 `.env` 提交到 Git。
3. 不要把真实数据库密码发给 Claude。
4. 不要把真实 Token 写进 Markdown。
5. 不要让 Agent 直接执行 SQL。
6. 后续 MCP 工具只能暴露经过 schema 校验的业务操作。
7. 错误日志不要打印完整连接串。

## 5. 常见问题

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

### 为什么要分 owner 用户和 app 用户？

owner/bootstrap 用户用于建表和迁移，权限较高。app/runtime 用户后续只给 MCP 服务运行时使用，应该只有最小读写权限。

Milestone 1 先把变量和文档准备好；Milestone 2 会在 MCP 服务连接数据库时继续收紧运行权限。

### 为什么 planned_consumptions 不扣库存？

计划只是“可能会做”。如果推荐了菜单但当天没做，直接扣库存会污染真实状态。只有用户确认已经做饭，才进入 `meal_events`，再由写工具生成对应的 `inventory_events`。

## 6. Milestone 1 完成标志

1. Postgres 容器能启动并健康。
2. migration 能成功执行。
3. demo seed 能成功执行。
4. 表结构包含 family 隔离、幂等和审计基础。
5. 默认配置不暴露公网数据库端口。
6. 仓库中没有真实密码、Token 或连接串。
