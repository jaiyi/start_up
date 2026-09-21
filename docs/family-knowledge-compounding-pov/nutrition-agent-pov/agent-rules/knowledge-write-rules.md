# 知识写入规则

> 目标：约束家庭营养师 Agent 何时可以把建议写入 Wiki / Markdown。

## 1. 基本原则

```text
先建议，后确认，再写入。
```

Agent 可以随时生成建议更新内容，但只有用户明确确认后才可以写入。

## 2. 明确确认

以下表达算确认：

```text
确认写入。
可以入库。
按这个更新。
把这个改进去。
就照这个保存。
确认按这个更新库存。
```

以下表达不算确认：

```text
看起来可以。
好像行。
你觉得呢？
先记一下。
下次注意。
```

## 3. 写入前必须说明

```text
1. 修改哪个文件或 Wiki 页面；
2. 修改类型：新增、追加、替换；
3. 修改原因；
4. 修改内容摘要；
5. 是否会影响后续推荐。
```

## 4. 允许写入范围

```text
recipes/*.md
family/member-preferences.md
family/dietary-rules.md
inventory/current-inventory.md
inventory/purchase-log.md
inventory/planned-consumption-log.md
meals/recent-menu-log.md
meals/meal-feedback-log.md
agent-rules/*.md
```

## 5. 禁止自动操作

```text
不删除文件或页面；
不重命名文件或页面；
不整页覆盖规则文件；
不写入密码、API Key、Token；
不把推测写成事实；
不修改未确认的健康约束。
```

## 6. 写入后输出

```text
已更新哪些文件；
新增或修改了什么；
后续推荐会如何使用；
如果用户觉得不对，如何回滚或修正。
```
