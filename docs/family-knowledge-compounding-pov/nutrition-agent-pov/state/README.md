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
7. runtime app role 使用最小权限；Milestone 4 允许执行健康检查、已批准只读业务函数和已批准确认后写入函数，仍不能直接读写业务表。
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

Milestone 3 新增：

```text
- migrations/0003_read_only_business_functions.sql
- get_current_inventory / get_inventory_risks / list_recent_meals / list_pending_planned_consumptions / get_meal_feedback_summary 的只读数据库函数边界
- runtime_family_access 按 runtime 登录角色绑定允许读取的 family_id
- read_inventory_risk_candidates 在数据库侧按风险优先级筛选库存风险候选项
```

Milestone 4 新增：

```text
- migrations/0004_write_business_functions.sql
- record_purchase_after_confirmation / confirm_meal_execution / record_meal_feedback / adjust_inventory_after_feedback 的确认后写入数据库函数边界
- mcp_tool_calls 幂等记录：同一 family_id + tool_name + idempotency_key 的相同成功请求会 replay，不同请求会拒绝；畸形输入或业务约束失败会随事务整体回滚
- audit_log 审计记录：写入工具在同一事务内记录业务变更和审计事件
- runtime app role 仍不能直接读写业务表，只能 EXECUTE 已批准函数
```

Milestone 4 的权限策略：

```text
owner/bootstrap 用户：只用于初始化数据库、执行 migration、创建 runtime app role。
runtime app 用户：只给 MCP 服务运行时使用，Milestone 4 只允许执行 `family_state.check_runtime_health(text[])`、0003 中批准的只读业务函数和 0004 中批准的确认后写入函数，不能直接读取或写入业务表。
```

## 5. 规划目录

```text
state/
├── README.md
├── data-dictionary.md
├── schemas/
├── migrations/
│   ├── 0001_init_family_state.sql
│   ├── 0002_runtime_permissions.sql
│   ├── 0003_read_only_business_functions.sql
│   └── 0004_write_business_functions.sql
├── seeds/
├── fixtures/
└── exports/
    └── markdown/
```

Milestone 4 已在 MCP 服务中实现首批确认后写入业务工具；后续阶段会继续补充菜单计划创建、Markdown 快照导出、备份和上线检查。
