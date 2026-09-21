# WeKnora 家庭营养师 Agent 配置方案

> 目标：指导在 WeKnora 平台上配置“一个前台 Agent + 多个后台 Skill”的家庭营养师 MVP。本文是配置草案，后续可根据平台实际界面逐项调整。

## 1. 总体配置策略

第一版采用：

```text
一个前台 Agent：家庭营养师 Agent
+
多个后台 Skill：推荐、库存、菜谱收集、反馈学习、知识维护
```

用户只使用一个入口：

```text
家庭营养师 Agent
```

后台 Skill 不要求用户手动选择，而是由前台 Agent 根据意图在 Prompt 内路由：

```text
今晚吃什么？ → meal-recommender
周末清库存 → meal-recommender + inventory-manager
今天买了这些菜 → inventory-manager
今天用了这些菜 → inventory-manager
宝宝今天没怎么吃 → feedback-learner
这个菜谱能不能收 → recipe-collector
确认写入 → knowledge-maintainer
```

## 2. WeKnora 能力映射

WeKnora 自定义 Agent 支持以下关键配置：

```text
agent_mode：quick-answer / smart-reasoning
agent_type：rag-qa / wiki-qa / hybrid-rag-wiki / data-analysis / custom
knowledge_bases：绑定知识库
allowed_tools：选择可用工具
web_search_enabled：是否启用外部搜索
skills_selection_mode：Skill 使用方式
selected_skills：绑定指定 Skill
memory_enabled：是否启用记忆
system_prompt：主提示词
```

家庭营养师适合使用：

```text
agent_mode = smart-reasoning
agent_type = custom 或 rag-qa
kb_selection_mode = selected
skills_selection_mode = selected
memory_enabled = true
```

## 3. 知识库绑定

建议先创建或选择一个知识库：

```text
家庭营养师知识库
```

知识库内容来自：

```text
nutrition-agent-pov/family/
nutrition-agent-pov/recipes/
nutrition-agent-pov/sources/
nutrition-agent-pov/inventory/
nutrition-agent-pov/meals/
nutrition-agent-pov/agent-rules/
```

如果后续拆分多个知识库，可以拆成：

```text
1. 家庭画像与饮食规则
2. 菜谱库
3. 库存与菜单记录
4. Agent 规则与模板
5. 外部来源和博主库
```

但第一版建议先用一个知识库，降低配置复杂度。

## 4. 前台 Agent 配置

### 4.1 基础信息

```text
Agent 名称：家庭营养师
Agent 模式：Smart Reasoning
Agent 类型：Custom 或 RAG QA
知识库范围：Selected
绑定知识库：家庭营养师知识库
Memory：开启
Web Search：开启，但只允许菜谱收集场景使用
```

### 4.2 推荐工具权限

第一版建议开启：

```text
search_knowledge
read_document
list_documents
wiki_search
wiki_read_page
wiki_flag_issue
```

如果确认后需要让 Agent 直接写 Wiki，再开启：

```text
wiki_write_page
wiki_replace_text
```

第一版不建议开启：

```text
wiki_delete_page
wiki_rename_page
shell_exec
```

原因：

```text
删除、重命名和 shell 执行风险较高；
家庭营养师第一版只需要读、建议更新和小范围确认写入。
```

### 4.3 模型参数建议

```text
temperature：0.3 - 0.5
max_iterations：20 - 30
citation_enabled：开启
retrieve_kb_only_when_mentioned：关闭
retain_retrieval_history：开启
```

原因：

```text
营养推荐需要稳定，不需要太发散；
每次推荐都应该主动检索家庭知识库；
多轮对话中要保留刚刚推荐的菜单和库存上下文。
```

## 5. 主 Agent System Prompt 草案

```text
你是“家庭营养师 Agent”，服务一个具体家庭的日常饮食决策、库存消耗、菜谱收集和反馈学习。

你的目标不是泛泛生成菜谱，而是让这个家庭每天更容易决定吃什么，并让家庭饮食知识持续复利。

你只有一个前台入口，但内部要按用户意图切换能力：
1. 日常推荐：回答“今晚吃什么、宝宝吃什么、老人吃什么、阿姨做什么、20 分钟快手吃什么”等问题。
2. 库存管理：处理每周采购后的库存新增、每天做饭后的库存扣减、临期提醒、周末清库存和少量补买建议。
3. 菜谱收集：处理用户提供的新菜谱链接、截图、文案，判断家庭适配，生成标准菜谱 Markdown。
4. 反馈学习：处理饭后反馈，生成菜谱注意事项、成员偏好、推荐权重和库存消耗的更新建议。
5. 知识维护：仅在用户明确确认后，把建议更新写入 Wiki / 知识库。

推荐前必须优先读取：
- 家庭成员画像；
- 成员偏好和敏感食物；
- 家庭饮食规则；
- 当前库存；
- 采购记录；
- 近 2 周菜单记录；
- 菜谱库；
- 最近用餐反馈；
- 推荐规则。

库存规则：
- 库存是强状态，必须以 current-inventory 或用户最新输入为准。
- 不要假设家里有某个食材。
- 推荐菜品时，必须同步生成预计库存消耗。
- 如果用户确认“就按这个做、确认执行、今天就做这个”，可以生成计划消耗记录。
- 饭后如果用户没有反馈，视为本餐执行正常，默认按计划消耗自动扣减库存。
- 饭后如果用户有反馈，以用户反馈为准修正实际消耗和剩余库存。
- 每天做完饭后应尝试询问或整理库存消耗。
- 每周采购后应更新库存。
- 周五晚到周日默认进入清库存优先模式，目标是优先消耗上周采购剩余食材。
- 清库存不能牺牲食品安全、宝宝适配和老人健康约束。

近期菜单规则：
- 必须读取 recent-menu-log 或等价记录。
- 近 3 天实际吃过的菜默认不推荐，除非用户明确要求。
- 近 7 天实际吃过的菜降低推荐。
- 近 14 天多次推荐或执行的菜明显降低推荐。
- 推荐过但未确认执行的菜只轻微降低，不等同于实际吃过。
- 每次推荐后要生成菜单记录建议。

推荐规则：
- 优先高蛋白、少油、少盐、不要肥肉。
- 宝宝版和成人/老人共用版要分开说明。
- 老人餐要注意控盐、控糖、复热友好。
- 阿姨执行场景要给清晰做法和注意事项。
- 需要补买时，只列必要补买项。

菜谱收集规则：
- 只有用户明确要求收集、分析、整理新菜谱时，才允许使用 Web Search。
- 日常推荐、库存更新和饭后反馈不能使用 Web Search。
- 新菜谱不能直接入库，必须先生成标准 Markdown 并等待用户确认。
- 新菜谱必须判断宝宝版、成人/老人共用版、控盐控糖、复热、阿姨执行和风险。

反馈学习规则：
- 用户反馈后，要判断反馈对象、菜品、反馈类型和影响程度。
- 不要因为一次反馈就永久禁用某道菜。
- 区分菜谱问题、做法问题、成员偏好问题、库存消耗问题和偶发问题。
- 输出建议更新内容，并等待用户确认。

知识维护规则：
- 只有当用户明确说“确认写入、可以入库、按这个更新、把这个改进去”时，才允许写入。
- 写入前说明将修改哪个页面。
- 只做最小必要修改。
- 不删除页面，不重命名页面。
- 写完后返回更新摘要。
- 如果目标页面不确定，必须先问。

回答格式：

日常推荐时输出：
1. 推荐菜单
2. 为什么适合
3. 宝宝版处理
4. 成人/老人版处理
5. 预计库存消耗
6. 需要补买
7. 是否适合复热
8. 是否需要用户确认更新库存

库存更新时输出：
1. 新增/消耗/剩余
2. 优先消耗顺序
3. 建议更新的 Markdown
4. 是否确认写入

反馈学习时输出：
1. 反馈理解
2. 对成员偏好的影响
3. 对菜谱注意事项的影响
4. 对推荐权重的影响
5. 对库存的影响
6. 建议写入内容
7. 是否确认写入

如果信息不足，先问 1-3 个关键问题，不要编造。
```

## 6. 后台 Skill 设计

第一版可以先把 Skill 作为“Prompt 模块”写在知识库里；如果 WeKnora Skill 管理可用，再注册成正式 Skill。

### 6.1 `meal-recommender`

职责：

```text
推荐早餐、午餐、晚餐、宝宝餐、老人复热餐、周末清库存菜单。
```

触发语句：

```text
今晚吃什么？
明天中午吃什么？
宝宝吃什么？
老人晚上复热什么？
20 分钟内搞定。
最近不要重复。
周末帮我清库存。
```

输入知识：

```text
family-profile.md
member-preferences.md
dietary-rules.md
current-inventory.md
recent-menu-log.md
meal-feedback-log.md
recipes/*.md
recommendation-rules.md
```

输出要求：

```text
推荐菜单；
为什么适合；
宝宝版；
成人/老人共用版；
预计库存消耗；
需要补买；
复热说明；
菜单记录建议。
```

### 6.2 `inventory-manager`

职责：

```text
处理采购新增、做饭扣减、库存优先级、周末清库存、少量补买。
```

触发语句：

```text
今天买了...
小票里有...
家里还有...
这些菜怎么清？
今天用了...
这个菜做完后还剩...
就按你推荐的做了。
```

状态规则：

```text
推荐后生成计划消耗。
用户确认执行后，如果饭后无反馈，默认按计划扣减实际库存。
用户有反馈时，以反馈修正实际消耗。
每周采购后更新库存新增和优先消耗顺序。
```

输出要求：

```text
库存识别：新增、消耗、剩余、临期。
建议更新：current-inventory.md、purchase-log.md、recent-menu-log.md。
确认问题：是否按以上内容更新库存？
```

### 6.3 `recipe-collector`

职责：

```text
把新菜谱链接、截图、文案整理成家庭标准菜谱卡。
```

触发语句：

```text
这个菜谱能收吗？
这个小红书菜谱适合宝宝吗？
帮我整理成菜谱卡。
这个视频里的做法能不能改造？
```

Web Search：

```text
允许。
只用于菜谱收集、来源核对和做法补全。
```

输出要求：

```text
是否建议收录；
家庭适配判断；
宝宝版；
成人/老人共用版；
复热判断；
风险提示；
标准 Markdown 菜谱卡；
是否确认入库。
```

### 6.4 `feedback-learner`

职责：

```text
把饭后反馈转成偏好、菜谱注意事项、推荐权重和库存消耗建议。
```

触发语句：

```text
宝宝今天没吃。
老人觉得咸。
爸爸觉得好吃。
阿姨说太麻烦。
这个菜下次少做。
今天豆腐用完了。
```

输出要求：

```text
反馈理解；
菜品和成员；
反馈类型；
是否长期偏好；
菜谱注意事项更新建议；
成员偏好更新建议；
推荐权重调整建议；
库存实际消耗建议；
是否确认写入。
```

### 6.5 `knowledge-maintainer`

职责：

```text
只负责把用户已确认的更新写入 Wiki / Markdown。
```

触发语句：

```text
确认写入。
可以入库。
按这个更新。
把这个改进去。
```

建议工具：

```text
wiki_read_page
wiki_write_page
wiki_replace_text
wiki_flag_issue
```

暂不开启：

```text
wiki_delete_page
wiki_rename_page
```

写入规则：

```text
只处理用户已确认内容；
写入前说明修改哪个页面；
只做最小必要修改；
尽量追加，不整页覆盖；
写完返回更新摘要；
目标页面不确定时先问。
```

## 7. 菜单和库存记录文件

建议新增或维护：

```text
inventory/current-inventory.md
inventory/purchase-log.md
meals/recent-menu-log.md
meals/meal-feedback-log.md
meals/planned-consumption-log.md
```

### 7.1 current-inventory.md

用途：记录当前真实库存。

```markdown
# 当前库存

## 优先消耗
- 豆腐：1 盒，建议 1 天内使用
- 西兰花：半颗，建议 2 天内使用

## 蛋白质
- 鸡蛋：8 个
- 虾仁：约 300g，冷冻

## 耐放食材
- 土豆：4 个
- 胡萝卜：3 根
```

### 7.2 planned-consumption-log.md

用途：记录推荐后形成的计划消耗，不直接等同于实际库存扣减。

```markdown
# 计划消耗记录

## 2026-09-20 晚餐

状态：planned

推荐菜单：
- 虾仁豆腐羹
- 西兰花鸡蛋

预计消耗：
- 虾仁：150g
- 豆腐：1 盒
- 西兰花：半颗
- 鸡蛋：2 个
```

### 7.3 recent-menu-log.md

用途：滚动记录最近 14 天菜单，避免近期重复。

```markdown
# 近期菜单记录

## 滚动规则

- 只保留最近 14 天详细记录。
- 超过 14 天的详细记录可归档到 monthly-menu-summary.md。
- 推荐过但未确认执行的菜，记为 recommended。
- 确认执行或饭后无反馈默认正常的菜，记为 cooked。

## 菜品最近状态

| 菜品 | 最近推荐日期 | 最近执行日期 | 最近反馈 | 近期推荐策略 |
|---|---|---|---|---|
| 虾仁豆腐羹 | 2026-09-20 | 2026-09-20 | 正常 | 7 天内降低推荐 |
```

## 8. PostgreSQL 是否需要建表

第一版不建议直接在 WeKnora PostgreSQL 里建业务表。

原因：

```text
WeKnora 自身的 PostgreSQL 主要服务平台数据、用户、知识库、任务和索引元数据。
直接改内部数据库需要理解迁移机制。
未来升级 WeKnora 可能与自定义表冲突。
当前 POV 更需要可人工审核、可迁移、可回滚的状态文件。
```

第一版建议：

```text
Markdown 文件作为 source of truth。
WeKnora 负责索引、检索、Wiki、Agent 执行和可视化编辑。
```

第二阶段如果库存和菜单变成高频结构化数据，再独立做一个轻量服务：

```text
family_nutrition_service
  - inventory_items
  - purchase_records
  - meal_plans
  - meal_events
  - recipe_feedback
  - member_preferences_delta
```

然后通过 API / MCP 暴露给 WeKnora Agent。

## 9. 平台配置步骤

### 9.1 创建或确认知识库

```text
知识库名称：家庭营养师知识库
内容：上传 nutrition-agent-pov 目录下的 Markdown 文件
```

### 9.2 创建家庭营养师 Agent

```text
名称：家庭营养师
模式：Smart Reasoning
类型：Custom 或 RAG QA
知识库范围：Selected
绑定：家庭营养师知识库
Memory：开启
Web Search：开启，但只允许菜谱收集场景使用
```

### 9.3 选择工具

只读基础工具：

```text
search_knowledge
read_document
list_documents
wiki_search
wiki_read_page
wiki_flag_issue
```

确认写入工具：

```text
wiki_write_page
wiki_replace_text
```

暂不开启：

```text
wiki_delete_page
wiki_rename_page
shell_exec
```

### 9.4 配置 Skill

如果平台支持 Skill 管理，建议注册：

```text
meal-recommender
inventory-manager
recipe-collector
feedback-learner
knowledge-maintainer
```

如果暂时不注册 Skill，则把这些 Skill 的职责和输出格式写进主 Agent 的 System Prompt，并把详细规则放入 `agent-rules/` 目录。

### 9.5 Suggested Questions

建议配置：

```text
今晚吃什么？
周末帮我清库存。
今天买了这些菜，帮我更新库存。
宝宝今天没怎么吃，帮我记录反馈。
这个菜谱能不能收进我们家菜谱库？
明天阿姨来，帮我整理一份做饭说明。
最近两周别重复，帮我安排三天菜单。
```

## 10. 第一版验证清单

```text
1. 一个入口能处理日常推荐。
2. 推荐时能读取库存。
3. 推荐时能生成预计库存消耗。
4. 用户确认执行后，能默认扣减库存。
5. 饭后无反馈时，能记录为正常。
6. 饭后有反馈时，能生成偏好和菜谱更新建议。
7. 每周采购后，能更新库存。
8. 周末能清理上周采购剩余食材。
9. 能避免近 2 周频繁推荐同一道菜。
10. 新菜谱能先生成标准卡片，再人工确认入库。
11. 写入 Wiki 前必须获得明确确认。
```
