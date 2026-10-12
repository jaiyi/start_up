# WeKnora Agent 配置

> 用途：记录“家庭营养师”前台 Agent 在 WeKnora 平台上的配置，确保平台配置可复现。

## 1. 基础配置

```text
Agent 名称：家庭营养师
Agent 模式：Smart Reasoning
Agent 类型：Custom 或 RAG QA
知识库范围：Selected
绑定知识库：Family / 家庭营养师知识库
Memory：开启
Web Search：开启，但通过 Prompt 限制只在菜谱收集场景使用
MCP：接入 Family Nutrition MCP Service
```

## 2. Prompt

System Prompt 使用：

```text
prompts/main-agent-system-prompt.md
```

后台能力 Prompt 使用：

```text
prompts/meal-recommender.prompt.md
prompts/inventory-manager.prompt.md
prompts/recipe-collector.prompt.md
prompts/feedback-learner.prompt.md
prompts/knowledge-maintainer.prompt.md
```

如果 WeKnora 平台暂时不能配置多个 Skill Prompt，就把主 Prompt 作为 Agent System Prompt，把各 Skill Prompt 上传到知识库或复制进 Agent 规则区。

## 3. 知识库绑定

建议上传稳定知识和能力说明：

```text
nutrition-agent-pov/family/
nutrition-agent-pov/recipes/
nutrition-agent-pov/sources/
nutrition-agent-pov/agent-rules/
nutrition-agent-pov/prompts/
nutrition-agent-pov/skills/
```

`inventory/` 和 `meals/` 可以上传由 Postgres 导出的 Markdown 摘要快照，但不作为实时状态源。

## 4. MCP 工具绑定

Family Nutrition MCP Service 是 Agent 读写动态状态的唯一受控入口。第一版建议绑定：

只读工具：

```text
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

写入工具：

```text
record_purchase_after_confirmation
create_planned_consumption
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
export_state_snapshot_to_markdown
```

配置原则：

```text
Agent 不直接连接 Postgres；
Agent 不执行任意 SQL；
写入工具必须要求用户确认、idempotency_key 和审计字段；
Postgres 不暴露公网端口；
MCP 服务必须启用鉴权。
```

## 5. Suggested Questions

```text
今晚吃什么？
周末帮我清库存。
今天买了这些菜，帮我更新库存。
宝宝今天没怎么吃，帮我记录反馈。
这个菜谱能不能收进我们家菜谱库？
明天阿姨来，帮我整理一份做饭说明。
最近两周别重复，帮我安排三天菜单。
```

## 6. 推荐模型参数

```text
temperature：0.3 - 0.5
max_iterations：20 - 30
citation_enabled：开启
retrieve_kb_only_when_mentioned：关闭
retain_retrieval_history：开启
```

## 7. 后台并发建议

服务器 `.env` 建议保留：

```env
WEKNORA_MODEL_MAX_CONCURRENCY=5
WEKNORA_WIKI_ASYNQ_CONCURRENCY=1
```

含义：

```text
WEKNORA_MODEL_MAX_CONCURRENCY：约束单模型后台任务最大并发，降低 429 风险。
WEKNORA_WIKI_ASYNQ_CONCURRENCY：限制 Wiki 异步任务 worker 并发。
```

## 8. 配置变更流程

```text
1. 先改本目录下的 prompts/、skills/、weknora/ 文档。
2. 稳定知识再复制到 WeKnora 平台。
3. 动态状态工具变更先更新 MCP 服务和 tool-permissions.md。
4. 用测试问题验证回答和工具调用。
5. 记录问题和修正。
6. 再提交 Git。
```
