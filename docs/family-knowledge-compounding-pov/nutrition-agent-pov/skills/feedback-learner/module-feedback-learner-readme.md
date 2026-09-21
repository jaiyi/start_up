# feedback-learner

> 把饭后反馈转成偏好、菜谱注意事项、推荐权重和库存修正建议。

## 职责

```text
理解用户的一句话饭后反馈，并沉淀为可确认、可写入、可追踪的家庭饮食知识更新建议。
```

## 触发场景

```text
宝宝今天没怎么吃。
老人觉得咸。
爸爸觉得很好吃。
阿姨说太麻烦。
下次少做这个。
今天豆腐用完了。
```

## 依赖文件

```text
family/member-preferences.md
recipes/*.md
inventory/current-inventory.md
meals/recent-menu-log.md
meals/meal-feedback-log.md
agent-rules/feedback-update-rules.md
```

## 输出

```text
反馈理解；
涉及成员和菜品；
反馈类型；
长期偏好判断；
菜谱注意事项更新；
成员偏好更新；
推荐权重调整；
库存修正；
是否确认写入。
```
