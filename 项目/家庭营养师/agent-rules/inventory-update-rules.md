# 库存更新规则

> 目标：定义家庭营养师 Agent 如何通过 MCP 处理采购新增、推荐计划消耗、饭后默认扣减和反馈修正。

## 1. 库存是强状态

```text
Postgres 是当前库存、采购、计划消耗和实际消耗的 source of truth。
Agent 不直接读写 SQL，也不把 Markdown 库存快照当作事务权威。
所有库存读写必须通过 Family Nutrition MCP 工具完成。
如果 MCP 返回库存缺失、过期或不确定，Agent 必须先问用户，不得假设。
```

## 2. 采购新增

用户提供采购清单、小票或口述时，Agent 应：

```text
1. 标准化食材名称；
2. 识别数量和单位；
3. 判断保存方式；
4. 判断建议消耗期限；
5. 生成采购入库的结构化 payload；
6. 说明将新增哪些库存项和优先消耗顺序；
7. 等待用户确认后调用 record_purchase_after_confirmation 写入 Postgres。
```

写入时必须携带：

```text
family_id；
actor_id；
confirmation_id 或明确确认文本；
idempotency_key；
request_id / trace_id；
结构化采购明细。
```

## 3. 推荐后的计划消耗

```text
推荐菜单后只生成 planned consumption，不直接扣减库存。
```

计划消耗应通过 MCP 建议或写入：

```text
create_planned_consumption
```

同时可以在需要时导出 Markdown 快照：

```text
inventory/planned-consumption-log.md
meals/recent-menu-log.md
```

这些 Markdown 文件只是 Postgres 的导出摘要，不是实时状态源。

## 4. 确认执行

当用户说：

```text
就按这个做。
今晚做这个。
确认执行。
阿姨按这个做。
```

Agent 可以把菜单状态从 `recommended` 更新为 `planned`，并通过 MCP 记录计划执行信息。

## 5. 饭后无反馈默认正常

如果用户已经确认执行，且饭后没有额外负面反馈，则默认：

```text
本餐执行正常；
通过 confirm_meal_execution 按计划消耗扣减库存；
菜单进入 Postgres meal_events，状态为 cooked；
不新增负向反馈；
菜谱推荐权重不做负向调整。
```

## 6. 饭后有反馈

有反馈时，以用户反馈为准：

```text
1. 识别实际消耗和剩余；
2. 通过 adjust_inventory_after_feedback 修正库存；
3. 通过 record_meal_feedback 写入反馈事件；
4. 如涉及长期偏好或菜谱修改，生成 Markdown / Wiki 更新建议并等待用户确认。
```

## 7. 周末清库存

周五晚到周日，推荐优先级调整为：

```text
1. 优先通过 get_inventory_risks 获取上周采购剩余、临期和高风险食材；
2. 优先消耗绿叶菜、菌菇、鲜肉、鱼虾、豆制品；
3. 优先推荐能组合消耗多种食材的汤、炖菜、烩饭、蒸丸子、炒杂蔬；
4. 只允许少量补买关键蛋白、主食或调味必需品；
5. 不使用状态不明或不适合宝宝/老人的食材。
```
