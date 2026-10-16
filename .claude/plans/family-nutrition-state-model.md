# 家庭营养师计划消耗状态模型实施计划

## 结论

采用现有数据库迁移、只读函数、适配器和测试已经实现的三层 canonical 模型：

```text
meal_plans
  └── meal_plan_items
        └── planned_consumptions
```

职责分别是：

- `meal_plans`：某个家庭、日期、餐次的菜单计划及计划生命周期；
- `meal_plan_items`：计划中的菜品、菜谱快照、成员和排序；
- `planned_consumptions`：某道计划菜品预计消耗的具体库存食材、数量和单位；
- `meal_events` / `meal_event_items`：用户确认后的实际执行记录；
- `inventory_events`：实际库存变化流水。

`planned_consumptions` 不是与 `meal_plans` / `meal_plan_items` 二选一的替代模型，而是餐食计划下的食材级子表。它不扣库存，也不等于实际消耗。

## 修改范围

1. 更新 `项目/家庭营养师/STRUCTURE.md`，删除“第一版暂缓独立建 planned_consumptions”的过时表述，改为三层模型和 source-of-truth 说明。
2. 更新 `项目/家庭营养师/设计/family-nutrition-phase-4-execution-plan.md`，统一数据模型和 MCP 工具路线；将 `planned_consumptions` 作为已经存在的计划消耗查询能力，不再描述为可由菜单表临时表达或后续再补。
3. 检查并必要时更新 `项目/家庭营养师/设计/family-nutrition-state-architecture.md`、`设计/weknora-agent-configuration-plan.md`、`state/data-dictionary.md`、`state/README.md`、`app/README.md`、Prompt/Rule/Skill 文档中的口径，让“计划菜品”和“预计食材消耗”保持一致。
4. 保持现有 SQL schema、`read_pending_planned_consumptions`、TypeScript reader、MCP 工具名和测试契约不变，避免无必要迁移。
5. 对有冲突的旧措辞进行最小改写，不重写完整长文档，不改变已经验证的运行行为。

## 验证

- 全项目搜索 `planned_consumptions`、`meal_plans`、`meal_plan_items`，确认不存在“第一版暂缓”“不单独建表”或“由两张菜单表表达计划消耗”等冲突口径；
- 检查 Markdown 内部链接和表格结构；
- 运行 `git diff --check`；
- 在 `项目/家庭营养师/app` 运行现有测试与构建（若依赖/环境允许），至少运行与迁移和只读状态工具相关的测试；
- 审阅 diff，确保只同步文档口径，未意外修改业务代码或删除测试。

## 不在本批次处理

- 不新增 `create_planned_consumption` 写入工具；现有设计规定推荐计划写入与确认机制仍需保持人工确认和审计；
- 不改变 planned → cooked → inventory event 的状态转换；
- 不处理 `nutrition-agent-pov` 历史路径、理想汽车案例或长期自动维护机制。
