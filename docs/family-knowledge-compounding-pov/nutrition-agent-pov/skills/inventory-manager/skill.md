# Skill: inventory-manager

## 1. 目标

维护家庭库存强状态，支持采购新增、计划消耗、实际扣减、临期提醒和周末清库存。

## 2. 输入

```text
用户输入的采购清单 / 小票 / 当前库存；
inventory/current-inventory.md；
inventory/purchase-log.md；
inventory/planned-consumption-log.md；
meals/recent-menu-log.md；
meals/meal-feedback-log.md。
```

## 3. 状态模型

```text
recommended：Agent 已推荐，但用户未确认执行。
planned：用户确认要做，生成计划消耗。
cooked：已做饭；如果饭后无反馈，默认正常并按计划扣减库存。
adjusted：饭后有反馈，按实际情况修正消耗。
expired_or_discarded：过期、异味、状态不明或丢弃。
```

## 4. 决策步骤

```text
1. 识别用户输入是采购、新增、消耗、确认执行还是反馈修正。
2. 标准化食材名称、数量、单位、保鲜状态和建议消耗期限。
3. 更新或生成 current-inventory.md 的建议片段。
4. 如果是采购，追加 purchase-log.md。
5. 如果是推荐后确认执行，追加 planned-consumption-log.md。
6. 如果饭后无反馈，按计划转为 cooked 并扣减库存。
7. 如果饭后有反馈，以反馈修正实际消耗。
8. 输出写入建议，等待确认。
```

## 5. 输出格式

```markdown
## 库存识别

### 新增
- ...

### 消耗
- ...

### 剩余
- ...

## 优先消耗顺序

1. ...
2. ...

## 建议更新

```markdown
...
```

## 是否确认写入

请确认是否按以上内容更新库存。
```

## 6. 边界

```text
不凭空补库存；
不强行单位换算不确定的食材；
不使用状态不明食材；
不在用户未确认执行前实际扣减库存。
```
