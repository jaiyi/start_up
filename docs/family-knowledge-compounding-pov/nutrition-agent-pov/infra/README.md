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

Milestone 1 先启动独立数据库：

```text
family-nutrition-postgres
```

Milestone 2 再让 MCP 服务连接 Postgres：

```text
family-nutrition-mcp-server
```

Postgres 只允许同机 Docker 网络或本机调试访问，不暴露公网端口。

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

Milestone 1：

```text
1. 准备服务器目录 /opt/family-nutrition-state；
2. 从仓库复制 docker-compose / env 示例 / state migrations / state seeds；
3. 在服务器上创建真实 .env；
4. 启动独立 Postgres；
5. 执行数据库迁移；
6. 执行 demo seed；
7. 检查 family_state 表是否创建成功。
```

Milestone 2 之后：

```text
1. 启动 MCP 服务；
2. 让 MCP 服务使用 app/runtime 用户连接 Postgres；
3. 在 WeKnora Agent 配置 MCP；
4. 跑采购入库、推荐、确认执行、饭后反馈端到端测试；
5. 配置备份和恢复演练。
```

详细操作见：

```text
infra/postgres/README.md
```
