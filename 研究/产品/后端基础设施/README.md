# 后端基础设施 / Agent-facing BaaS 产品分析

本目录用于分析面向 Web、Mobile、AI 应用和 Agent 的后端基础设施产品，包括 BaaS、数据库即服务、认证、对象存储、Serverless / Edge Functions、Realtime、应用部署和 Agent-facing Backend。

## 分类边界

```text
AI 编程 Agent / 应用代码
        │
        ▼
后端基础设施 / BaaS
        ├── Auth
        ├── Database
        ├── Storage
        ├── Functions / Compute
        ├── API / Realtime
        └── Hosting / Deployment
```

这类产品负责为应用提供数据和后端能力，不自动等同于：

- **Agent Runtime / Harness**：负责模型循环、Session / Run / Step、工具策略、任务恢复、人审、Trace 和评测；
- **Knowledge Base**：负责稳定知识、文档、切片、索引、引用和知识治理；
- **Data Governance Platform**：负责跨系统数据目录、血缘、质量、合规和统一治理；
- **业务系统**：负责生产业务事实、关键状态和权威动作。

MCP 可以成为后端与 Agent 之间的连接协议，但 **MCP 接入不等于 Agent Runtime**，Agent 能调用后端工具也不等于后端已经具备企业级任务治理能力。

## 当前分析对象

| 产品文档 | 产品 / 能力 | 类型判断 | 核心问题 |
|---|---|---|---|
| `insforge.md` | InsForge | 面向 AI coding agents 的开源后端平台 / Agent-facing BaaS | 后端资源是否能被 AI 编程 Agent 读取、配置、部署和调试，以及这种 Agent-native 入口是否形成超越传统 BaaS 的差异化 |

## 评估维度

1. **Agent 接入**：是否支持 MCP、CLI、Skills、SDK、API、OpenAPI；Agent 能读什么、改什么、部署什么？
2. **数据库**：底层数据库、SQL、迁移、RLS、索引、向量、备份、导出和回滚。
3. **身份与权限**：最终用户、项目管理员、服务身份和 Agent 身份是否分离。
4. **对象存储**：Bucket、ACL、签名 URL、S3 兼容性、备份和文件处理。
5. **后端执行**：Functions、Compute、队列、定时任务、超时、重试、密钥和网络边界。
6. **事件与实时**：Realtime、Webhook、广播、Presence、幂等、重试和对账。
7. **部署形态**：云托管、自托管、离线、内网、容器编排、云端依赖和版本差异。
8. **观测与治理**：日志、审计、调用链、敏感字段脱敏、成本、错误率、延迟和导出。
9. **迁移能力**：是否能迁移到普通 PostgreSQL、S3、其他 BaaS 或自有业务系统。
10. **Agent 安全**：schema 校验、allowlist、dry-run、审批、最小权限、写操作回读和回滚。

## 研究结论的基本原则

```text
BaaS 提供应用后端能力；
Agent Runtime 管理 Agent 执行；
Knowledge Base 管理稳定知识；
业务数据库 / 业务系统保存权威业务事实。
```

评估产品时，应避免因为产品使用“AI-native”“Agent-ready”或提供 MCP，就把它直接归为完整的 Agent 平台或企业数据平台。
