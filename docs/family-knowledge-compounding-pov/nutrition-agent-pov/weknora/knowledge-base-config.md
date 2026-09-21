# WeKnora 知识库配置

> 用途：记录哪些文件应进入 WeKnora 知识库，以及同步时的注意事项。

## 1. 知识库名称

```text
家庭营养师知识库
```

## 2. 建议纳入索引的目录

```text
family/
recipes/
sources/
inventory/
meals/
agent-rules/
prompts/
skills/
```

## 3. 暂不纳入或谨慎纳入

```text
app/：后续代码目录，除非要让 Agent 理解代码结构。
scripts/：脚本目录，除非要让 Agent 解释维护脚本。
ops/：运维文档可纳入，但不要包含凭证。
```

## 4. 同步原则

```text
Markdown 源文件先在 Git 中维护；
同步到 WeKnora 后用于检索和 Wiki 展示；
平台侧手工修改后，要及时回写到本目录；
不要让平台页面成为唯一版本。
```

## 5. 索引注意事项

```text
recipes/ 菜谱数量多，但每个文件较小，适合单文件索引。
inventory/ 和 meals/ 是强状态，应确保同步最新版本。
prompts/ 和 skills/ 用于让 Agent 理解自己的行为边界。
```
