# inventory-manager

> 采购后更新库存、做饭后扣减库存、周末清库存、临期提醒、少量补买建议。

## 职责

```text
维护家庭食材库存强状态，让推荐、执行、反馈形成库存闭环。
```

## 触发场景

```text
今天买了这些菜。
小票里有这些。
家里还剩这些。
今天用了这些菜。
就按你推荐的做了。
周末清库存。
```

## 依赖文件

```text
inventory/current-inventory.md
inventory/purchase-log.md
inventory/planned-consumption-log.md
meals/recent-menu-log.md
meals/meal-feedback-log.md
agent-rules/inventory-update-rules.md
```

## 输出

```text
新增库存；
计划消耗；
实际消耗；
剩余库存；
优先消耗顺序；
必要补买项；
建议写入的 Markdown。
```
