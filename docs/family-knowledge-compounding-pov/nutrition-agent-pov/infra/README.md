# 家庭营养状态服务部署规划

> 本目录记录同机 Docker Postgres + MCP 服务的部署规划。实际服务器部署目录建议为 `/opt/family-nutrition-state`。

## 1. 与 WeKnora 分离部署

WeKnora 当前部署目录：

```bash
/opt/WeKnora
```

家庭营养状态服务建议部署目录：

```bash
/opt/family-nutrition-state
```

不要把家庭营养业务表建进 WeKnora 内部 PostgreSQL，也不要直接修改 WeKnora 的 compose 文件。

## 2. 目标容器

Milestone 1 已启动独立数据库：

```text
family-nutrition-postgres
```

Milestone 2 新增 MCP 服务容器：

```text
family-nutrition-mcp-server
```

默认网络边界：

```text
Postgres 5432：只在 Docker 网络内访问，不暴露公网。
MCP 3030：只绑定服务器本机 127.0.0.1，先不直接暴露公网。
```

后续接入 WeKnora 时，优先让 WeKnora 与 MCP 在同机或受控内网通信；不要把数据库端口开放到公网。

## 3. 规划文件

```text
infra/
├── README.md
├── docker-compose.family-state.example.yml
├── env.example
└── postgres/
    ├── README.md
    └── create-runtime-app-role.sql
```

相关应用和数据库文件：

```text
app/
state/migrations/
state/seeds/
state/fixtures/
```

## 4. 安全原则

```text
1. .env 不进 Git；
2. Postgres 不绑定公网地址；
3. MCP 服务启用 Bearer token 鉴权；
4. DB app/runtime 用户不具备 DDL 权限；
5. Milestone 2 的 DB app/runtime 用户只允许执行健康检查函数，不直接读取业务表；
6. 迁移账号和运行账号分离；
7. MCP 容器不接收 owner/bootstrap 数据库密码；
8. 每日 pg_dump；
9. 备份同步到服务器外部位置。
```

## 5. Milestone 1 已完成内容

```text
1. 准备服务器目录 /opt/family-nutrition-state；
2. 创建服务器私有 .env；
3. 启动独立 Postgres；
4. 执行 0001 数据库迁移；
5. 执行 demo seed；
6. 检查 family_state 的 15 张表；
7. 验证 demo family、demo inventory、demo meal plan；
8. 完成初始备份。
```

## 6. Milestone 2 部署目标

Milestone 2 的目标不是实现库存业务工具，而是证明 MCP 服务能安全连接 Postgres：

```text
1. 应用读取 FAMILY_NUTRITION_DATABASE_URL；
2. MCP 服务使用 runtime app 用户连接数据库；
3. runtime app 用户默认只能执行健康检查函数；
4. /health 返回数据库和 schema 状态；
5. health_check MCP 工具返回相同健康信息；
6. /tools 仍只暴露 health_check；
7. 不暴露 raw_sql、query_database、execute_sql、shell_exec 等危险工具。
```

部署完成后，服务器上应看到：

```text
family-nutrition-postgres      healthy
family-nutrition-mcp-server    healthy
```

本机访问应看到：

```bash
curl -i -H "Authorization: Bearer $FAMILY_NUTRITION_MCP_AUTH_TOKEN" http://127.0.0.1:3030/health
```

返回结果包含：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "family-nutrition-state-mcp",
    "milestone": "2",
    "database": {
      "status": "ok",
      "schema": "ready"
    }
  },
  "error": null
}
```

## 7. 后续 Milestone

```text
Milestone 3：先实现只读业务工具，让 Agent 能查看库存、近期菜单、计划消耗和反馈摘要。
Milestone 4：再实现写入工具，要求用户确认、幂等、事务和审计。
Milestone 5：接入 WeKnora Agent。
Milestone 6：加备份、导出、上线检查。
```

详细服务器操作见：

```text
infra/postgres/README.md
```
