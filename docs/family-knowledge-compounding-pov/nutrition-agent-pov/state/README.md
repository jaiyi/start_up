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
6. 长期偏好沉淀到 Markdown 前必须人工确认。
```

## 4. 规划目录

```text
state/
├── README.md
├── data-dictionary.md
├── schemas/
├── migrations/
├── seeds/
├── fixtures/
└── exports/
    └── markdown/
```

当前阶段已经进入 Milestone 1：维护数据字典、初始 SQL migration、demo seed 和测试 fixture。MCP 服务连接数据库会在 Milestone 2 实现。
