# 动态状态层

> 本目录记录家庭营养师 Agent 的动态状态模型、数据库 schema、迁移、测试数据和 Markdown 导出规范。

## 1. 定位

动态状态不再以 WeKnora 知识库源文档为 source of truth，而由独立 Postgres 维护。

```text
Postgres：库存、采购、计划消耗、实际做饭、反馈、近期菜单
Markdown：导出快照、人工审阅、Git 归档、WeKnora 索引摘要
```

## 2. 状态范围

```text
current inventory
purchase records
planned consumption
meal plans
meal executions
meal feedback
recent menu repeat avoidance
inventory adjustment audit
```

## 3. 数据建模原则

```text
1. 用事件流水记录变化，不只保存当前值；
2. 用当前快照支持快速查询；
3. planned 不等于 cooked；
4. 写入必须幂等；
5. 所有写入必须可审计；
6. 长期偏好沉淀到 Markdown 前必须人工确认；
7. runtime app role 使用最小权限，Milestone 2 默认只能执行健康检查函数。
```

## 4. 当前 Milestone 状态

Milestone 1 已完成：

```text
- data-dictionary.md
- migrations/0001_init_family_state.sql
- seeds/0001_demo_family.sql
- fixtures/demo-family-state.json
```

Milestone 2 新增：

```text
- migrations/0002_runtime_permissions.sql
- runtime no-login group role: family_nutrition_runtime
- runtime login app role 创建脚本：../infra/postgres/create-runtime-app-role.sql
```

Milestone 2 的权限策略：

```text
owner/bootstrap 用户：只用于初始化数据库、执行 migration、创建 runtime app role。
runtime app 用户：只给 MCP 服务运行时使用，Milestone 2 只允许执行 `family_state.check_runtime_health(text[])`，不能直接读取或写入业务表。
```

## 5. 规划目录

```text
state/
├── README.md
├── data-dictionary.md
├── schemas/
├── migrations/
│   ├── 0001_init_family_state.sql
│   └── 0002_runtime_permissions.sql
├── seeds/
├── fixtures/
└── exports/
    └── markdown/
```

后续 Milestone 3 会在 MCP 服务中实现只读业务工具；Milestone 4 才会按工具逐步加入写权限、事务、幂等和审计逻辑。
