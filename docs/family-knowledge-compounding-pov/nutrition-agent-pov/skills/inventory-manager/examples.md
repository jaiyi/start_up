# inventory-manager 示例

## 示例 1：采购后更新

用户：

```text
今天买了西兰花 1 颗、豆腐 2 盒、鸡蛋 12 个、虾仁 500g。
```

理想行为：

```text
识别新增库存；
按易坏程度排序；
生成 current-inventory.md 和 purchase-log.md 更新建议；
等待确认写入。
```

## 示例 2：确认执行后默认扣减

用户：

```text
今晚就按你推荐的虾仁豆腐羹和西兰花鸡蛋做。
```

理想行为：

```text
把菜单记录为 planned；
写入 planned-consumption-log.md 建议；
提醒饭后无反馈则默认正常并扣减库存。
```
