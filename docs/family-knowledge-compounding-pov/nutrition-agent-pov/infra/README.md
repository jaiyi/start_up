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

```text
family-nutrition-postgres
family-nutrition-mcp-server
```

Postgres 只允许 MCP 服务访问，不暴露公网端口。

## 3. 规划文件

```text
infra/
├── README.md
├── docker-compose.family-state.example.yml
├── env.example
└── postgres/
```

## 4. 安全原则

```text
1. .env 不进 Git；
2. Postgres 不绑定公网地址；
3. MCP 服务启用鉴权；
4. DB app 用户不具备 DDL 权限；
5. 迁移账号和运行账号分离；
6. 每日 pg_dump；
7. 备份同步到服务器外部位置。
```

## 5. 后续部署步骤

```text
1. 准备服务器目录 /opt/family-nutrition-state；
2. 创建 .env；
3. 启动 Postgres；
4. 执行数据库迁移；
5. 启动 MCP 服务；
6. 在 WeKnora Agent 配置 MCP；
7. 跑采购入库、推荐、确认执行、饭后反馈端到端测试；
8. 配置备份和恢复演练。
```
