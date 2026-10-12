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
agent-rules/
prompts/
skills/

可选：
inventory/：Postgres 导出的库存摘要快照
meals/：Postgres 导出的菜单和反馈摘要快照
```

## 3. 暂不纳入或谨慎纳入

```text
state/：数据库迁移、schema 和测试数据，除非要让 Agent 理解状态结构。
app/：MCP 服务代码目录，除非要让 Agent 理解代码结构。
infra/：部署示例可纳入，但不要包含真实 `.env` 或凭证。
scripts/：脚本目录，除非要让 Agent 解释维护脚本。
ops/：运维文档可纳入，但不要包含凭证。
```

## 4. 同步原则

```text
稳定知识 Markdown 源文件先在 Git 中维护；
同步到 WeKnora 后用于检索和 Wiki 展示；
动态状态通过 MCP 写入 Postgres，再按需导出 Markdown 快照；
平台侧手工修改后，要及时回写到本目录；
不要让平台页面成为唯一版本。
```

## 5. 索引注意事项

```text
recipes/ 菜谱数量多，但每个文件较小，适合单文件索引。
inventory/ 和 meals/ 只是 Postgres 导出的摘要快照，不是强状态源。
prompts/ 和 skills/ 用于让 Agent 理解自己的行为边界。
infra/env.example 只能使用占位值，不能包含真实密钥。
```
