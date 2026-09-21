# meal-recommender

> 日常推荐、宝宝餐、老人复热餐、阿姨执行菜单、周末清库存菜单。

## 职责

```text
基于家庭画像、饮食规则、当前库存、近期菜单、饭后反馈和菜谱库，推荐下一餐或未来几餐。
```

## 触发场景

```text
今晚吃什么？
宝宝吃什么？
老人晚上复热什么？
阿姨明天做什么？
周末帮我清库存。
最近两周别重复。
```

## 依赖文件

```text
family/family-profile.md
family/member-preferences.md
family/dietary-rules.md
inventory/current-inventory.md
inventory/purchase-log.md
meals/recent-menu-log.md
meals/meal-feedback-log.md
recipes/*.md
agent-rules/recommendation-rules.md
```

## 输出

```text
推荐菜单；
为什么适合；
宝宝版处理；
成人/老人版处理；
预计库存消耗；
需要补买；
复热说明；
菜单记录建议；
是否确认执行。
```
