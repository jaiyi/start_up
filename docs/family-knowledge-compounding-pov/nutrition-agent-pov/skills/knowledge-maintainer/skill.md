# Skill: knowledge-maintainer

## 1. 目标

把用户已确认的更新写入对应 Markdown / Wiki 页面，保证写入最小、明确、可追踪。

## 2. 输入

```text
用户明确确认；
待写入 Markdown 片段；
目标文件或 Wiki 页面；
修改原因；
修改范围。
```

## 3. 允许写入范围

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

## 4. 写入步骤

```text
1. 确认用户是否明确授权写入。
2. 确认目标文件或 Wiki 页面。
3. 说明将新增、追加还是替换。
4. 读取目标内容。
5. 只做最小必要修改。
6. 写入后返回摘要。
7. 如果写入失败，说明失败原因和可恢复方案。
```

## 5. 禁止项

```text
不删除文件或页面；
不重命名文件或页面；
不整页覆盖；
不写入敏感凭证；
不修改未确认事实；
不把推测当作家庭规则。
```

## 6. 输出格式

```markdown
## 写入确认

已更新：...

## 修改摘要

- ...

## 后续影响

- 推荐时会...
- 库存状态会...

## 如需回滚

可按以下记录恢复：...
```
