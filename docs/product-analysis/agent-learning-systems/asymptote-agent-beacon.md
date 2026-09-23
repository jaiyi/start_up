# Asymptote Labs Agent Beacon 产品调研

## 0. 一句话定位

Agent Beacon 是一个面向 AI 编码 Agent 的 **本地优先轨迹采集 + reviewed memory + 跨框架技能复用层**。

它不只是“知识库”，也不只是“日志系统”，而是试图解决一个新问题：

```text
一个 Agent 在 Claude Code / Cursor / Codex / OpenCode 等工具里解决过的问题，
不要在下一个 Agent、下一个工具、下一个会话里从零再学一遍。
```

更抽象地说，它代表了一类新的 Agent 应用模式：

```text
完整会话轨迹
→ 统一事件模型
→ 质量评估 / 高信号筛选
→ 候选记忆
→ 人审确认
→ MCP / Agent Skills 复用
→ 跨 Agent 框架迁移
```

---

## 1. 调研对象与资料来源

调研对象：

- GitHub：`Asymptote-Labs/agent-beacon`
- 本地仓库：`/tmp/agent-beacon`
- 相关文档：README、architecture、cross-harness-memory、memory CLI、MCP CLI、security、detections、telemetry schema、browser extension 等。

公开仓库中的核心表述是：

> Beacon captures agent session history across Claude Code, Cursor, Codex, OpenCode, and 20+ other harnesses, then turns useful workflows, corrections, and debugging patterns into reusable knowledge for future agents.

这和用户提到的模式一致：

```text
捕获编码代理完整会话；
Jev 对运行会话打分，筛选高信号流程；
转化为可复用技能；
经验可在 20+ 编码代理框架之间迁移。
```

---

## 2. 它属于什么产品类型

我建议把 Beacon 归入：

```text
Agent Learning Systems / Agent Memory Infrastructure / Agent Runtime Telemetry
```

它和前面分析过的 WorkBuddy、ADrive、WeKnora 不是同一层：

| 产品 / 类型 | 核心对象 | 主要解决的问题 |
|---|---|---|
| WorkBuddy 资料库 | Agent 生成的文档、表格、HTML、任务产物 | Agent 做完任务后的产物如何沉淀、协作、发布 |
| ADrive / 飞书云文档 | 企业文档、文件、表格、知识库、多维表格 | 企业协作资产如何组织、授权、协作、API 集成 |
| WeKnora | 源文档、知识库、Wiki、RAG、Agent 问答 | 已有知识如何被检索、引用、问答和工具调用 |
| Claude Code / Cursor 等 Coding Agent | 代码仓、工具调用、测试、提交 | Agent 如何完成具体工程任务 |
| Agent Beacon | Agent 会话轨迹、工具调用、修复路径、候选记忆 | Agent 做事过程如何被观察、评估、蒸馏和跨工具复用 |

最关键的区别：

```text
WorkBuddy / ADrive / WeKnora 管“知识和产物”。
Beacon 管“Agent 如何完成任务的过程”。
```

---

## 3. 核心能力拆解

### 3.1 跨框架会话采集

Beacon 支持本地 Agent、浏览器聊天、CI、云端 Agent、SDK instrumentation 等多个采集面。

公开 README 中列出的本地 Agent 覆盖包括 Claude Code、Cursor、Codex、OpenCode、Cline 等 20+ harness。采集字段包括：

- session；
- prompt；
- response；
- tool call；
- command；
- file activity；
- approval；
- MCP activity；
- token usage。

它的关键价值不是“支持某一个 Agent”，而是把不同 Agent 的私有历史统一成一个可查询、可评估的数据层。

### 3.2 统一 Telemetry Schema

Beacon 使用 OpenTelemetry 相关机制，并把不同 harness 的事件规范化成统一事件模型。

统一 schema 解决的问题是：

```text
不同工具对 prompt、tool、command、file、approval、MCP 的记录格式都不一样。
如果没有统一模型，后续检测、搜索、评估、复用都要按工具单独适配。
```

Beacon 统一后的事件会带有：

- `event`：发生了什么，例如 prompt.submitted、tool.invoked、command.executed、file.modified、approval.requested、mcp.tool_invoked；
- `harness`：来自哪个 Agent / IDE / CLI；
- `origin`：本地、CI、云端等来源；
- `run` / `session`：会话和运行上下文；
- `tool` / `command` / `file` / `mcp` / `approval` / `policy`：结构化实体；
- `content`：内容是否包含、脱敏、截断或省略；
- `harness.collection_method` / `event.fidelity`：采集方式与事件可信度。

这很重要，因为后续记忆评估和安全检测都依赖“可比较、可审计、可归因”的事件流。

### 3.3 本地优先存储

开源版本默认把运行轨迹写到本地 JSONL：

```text
用户模式：~/.beacon/endpoint/logs/runtime.jsonl
系统模式：/var/log/beacon-agent/runtime.jsonl
```

文档强调：

- collection、normalization、storage、correlation、detection 都可在本机运行；
- 默认不把数据发出去；
- 转发是显式配置的；
- 支持把 JSONL 转发到 Splunk、Datadog、Elastic、Sentinel、Falcon、S3、GCS 等客户自有系统。

这使 Beacon 更像一个“Agent 运行数据底座”，而不是单纯 SaaS 知识库。

### 3.4 会话回放和可观测性

Beacon 可以用：

```bash
beacon traces
beacon endpoint dashboard
```

查看本地会话历史、事件时间线、token usage、Agent inventory、detections、findings、memory 等。

这对于团队理解 Agent 真实行为很有价值：

- Agent 到底读了哪些文件？
- 执行过哪些命令？
- 有没有被拒绝的工具调用？
- 是否访问了敏感文件？
- 哪个工具 / 模型 / 会话消耗最多 token？
- 哪些步骤最终修复了问题？

### 3.5 安全检测

Beacon 还有 `beacon scan` 检测能力：使用 YAML + CEL 规则，对 runtime JSONL 做本地扫描。

它关注的风险包括：

- 凭证文件读取；
- secret read then network egress；
- curl-to-shell、sudoers 修改、持久化安装等危险命令；
- CI、依赖清单、授权代码等敏感编辑；
- prompt injection；
- approval / policy 绕过；
- Agent runtime control；
- 资源消耗异常。

这个能力说明 Beacon 不只是“让 Agent 更聪明”，也在做“Agent 安全可观测”。

---

## 4. Beacon + Jev 的记忆闭环

Beacon 的 `cross-harness-memory` 文档描述了一个 opt-in、本地优先的学习闭环：

```text
1. Capture traces from local agent harnesses.
2. Run beacon memory evaluations run on selected traces.
3. Review generated candidates.
4. Approve candidates into project memory.
5. Reuse approved memory through Beacon MCP or install it as an Agent Skill.
```

### 4.1 Jev 的角色

在这个流程里，Jev 不是常驻采集器，也不是自动改写 Agent 指令的系统。

它更像一个“低成本、高吞吐的轨迹评估器”：

```text
Beacon 先捕获 trace；
用户显式运行 beacon memory evaluations run；
Beacon 把有边界、已脱敏的 trace projection 发给 TypeSafe Jev；
Jev 回答一组 typed yes/no 概率问题；
Beacon 根据概率生成候选记忆；
人再审核、批准、拒绝或替换。
```

文档列出的典型评估问题包括：

- 这个 trace 是否成功完成了工程任务？
- 这个 trace 是否包含可复用的修正或调试模式？
- 这个可复用经验是否被具体 trace evidence 支持？

这说明 Jev 的作用不是“总结一切”，而是先做高信号筛选，降低人工评估和 LLM 评估成本。

### 4.2 人审门槛

Beacon 明确采用 review-gated 设计：

```text
Jev probabilities help rank and classify traces;
they do not automatically rewrite instructions, install skills, or execute actions.
```

也就是说：

- hooks 不会自动调用 Jev；
- dry-run 不会调用 Jev；
- 只有显式运行 `beacon memory evaluations run` 才可能调用 Jev；
- 候选记忆需要 reviewer 批准；
- Skill 安装也必须通过显式 CLI action。

这点非常关键，因为“从 Agent 轨迹自动学习”如果没有人审，很容易把错误经验、偶然路径、敏感信息或 prompt injection 一起固化成长期规则。

### 4.3 本地 memory.db

Beacon 会把学习产物存到本地：

```text
memory.db
```

位置在 endpoint log base directory 旁边。

它和可重建的 trace index 不同，是 durable local state。Approved memory 按 project scope 管理，不会默认跨项目全局共享。

### 4.4 复用方式：MCP 与 Agent Skills

Beacon 提供两类复用出口。

第一类是 MCP：

```text
beacon mcp serve
```

暴露只读工具：

- `search_memory`
- `get_memory`
- `get_memory_context`

这样未来的 Claude Code、Cursor 或其他 MCP-capable Agent 可以检索已批准的项目记忆。

第二类是 Agent Skills：

```bash
beacon memory skills preview <candidate-id>
beacon memory skills install <candidate-id>
```

安装路径：

```text
.agents/skills/<slug>/SKILL.md
```

这意味着一段经审核的成功经验可以变成项目内可版本化的 Skill，让不同 Agent 框架读取。

---

## 5. 典型架构

从产品架构看，可以概括为：

```text
Claude Code / Cursor / Codex / OpenCode / Cline / CI / Cloud Agent
        │
        │ hooks / plugin / OTLP / poll / browser extension / SDK
        ▼
Beacon local collector / beacon-hooks
        │
        ▼
Unified event schema
        │
        ├── runtime.jsonl                     # 本地轨迹事实表
        ├── local dashboard / traces          # 本地查看与回放
        ├── beacon scan                       # 本地安全检测
        ├── customer-managed forwarding       # SIEM / S3 / GCS / Datadog / Elastic...
        │
        ▼
beacon memory evaluations run                 # 显式评估，不是自动后台调用
        │
        ├── dry-run                           # 预估，不联网
        └── Jev / internal evaluator          # bounded redacted trace projection
        │
        ▼
候选记忆 candidates
        │
        ▼
人工 review：approve / reject / supersede
        │
        ▼
approved project memory in memory.db
        │
        ├── beacon mcp serve → search_memory / get_memory / get_memory_context
        └── beacon memory skills install → .agents/skills/<slug>/SKILL.md
```

这套架构的核心不是“存更多日志”，而是把日志变成：

```text
可评估、可审阅、可复用、可迁移的 Agent 经验资产。
```

---

## 6. 与 WorkBuddy / ADrive / WeKnora 的区别

### 6.1 与 WorkBuddy 资料库

WorkBuddy 资料库强调：

```text
Agent 做出的文档、表格、HTML、任务资料如何沉淀与协作。
```

Beacon 强调：

```text
Agent 完成任务的过程如何被记录、评估、学习和复用。
```

二者可以互补：

```text
Beacon 记录“怎么做成的”
WorkBuddy 沉淀“做成后的产物”
```

例如一个编码 Agent 修好了复杂 bug：

- Beacon 记录调试路径、命令、文件修改、失败尝试、最终修复；
- WorkBuddy 可以沉淀最终修复报告、复盘文档、发布说明。

### 6.2 与 ADrive / 飞书云文档

ADrive / 飞书云文档强调企业协作资产：

- 文档；
- 文件；
- 表格；
- Wiki；
- 权限；
- API。

Beacon 不替代这些协作资产层。它更像底层运行轨迹与经验提炼层。

如果放在企业系统里，可能是：

```text
Beacon 发现某个 Agent 解决问题的高质量流程
→ 提炼为 approved memory / Skill
→ 重要复盘结果进入飞书文档 / Wiki 做团队知识沉淀
```

### 6.3 与 WeKnora

WeKnora 关注：

```text
已有文档知识如何被切片、索引、检索、Wiki 化，并被 Agent 问答使用。
```

Beacon 关注：

```text
Agent 运行历史如何变成新的经验知识。
```

二者的互补关系是：

```text
WeKnora：稳定知识入口。
Beacon：运行经验生成器。
```

对于一个成熟系统，可能会形成：

```text
Git Markdown / Wiki / WeKnora：规范、流程、业务知识
Beacon runtime.jsonl / memory.db：Agent 执行过的高价值经验
MCP / Skills：把两类知识注入未来 Agent
```

---

## 7. 优势

### 7.1 跨 harness，而不是绑定单一 Agent

大部分 Agent 记忆都绑定在某个产品内部，例如某个 IDE、某个 Agent CLI、某个 SaaS 平台。

Beacon 的重要卖点是：

```text
Your agent session history belongs to you, not the harness.
```

这对企业尤其重要，因为团队可能同时使用 Claude Code、Cursor、Codex、OpenCode、Cline、云端 Agent 和 CI Agent。

### 7.2 本地优先，企业可控

Beacon 的开源版本默认本地写 JSONL，本地 dashboard，本地 scan，外发需要显式配置。

这对包含代码、客户数据、secret、内部系统路径的 Agent 会话很重要。

### 7.3 过程记忆比结果文档更细

很多真正有价值的经验存在于“过程”里：

- 哪个测试先失败；
- 哪个命令定位到问题；
- 哪个文件改了才修复；
- 哪条用户纠正反复出现；
- 哪个工具组合最有效；
- 哪个 Agent 行为风险高。

传统文档通常只记录最终结论，而 Beacon 能捕获完整过程。

### 7.4 人审门槛降低错误记忆风险

Jev / evaluator 只负责打分和候选筛选，最终是否写入 project memory 或安装 Skill 由人确认。

这比“自动把每次会话总结写进长期记忆”更安全。

### 7.5 同时服务效率与安全

Beacon 的同一套 telemetry 可以用于：

- Agent 经验学习；
- 会话回放；
- token 成本分析；
- MCP / Skill inventory；
- prompt injection / secret exfiltration / risky command 检测；
- SIEM / object storage / analytics pipeline。

这是一个比较完整的 Agent runtime governance 方向。

---

## 8. 短板与待验证点

### 8.1 完整会话轨迹非常敏感

Beacon 捕获的内容可能包括：

- 源代码；
- prompt 和 assistant response；
- shell 命令和输出；
- 文件路径和 diff；
- MCP 工具输入输出；
- 被拒绝或被批准的操作；
- token usage；
- 浏览器聊天内容。

即使有 redaction、truncation、metadata-only 等机制，也必须假设 trace 是高敏感数据。

企业落地时需要明确：

- 哪些内容可以采集？
- 谁能看？
- 保留多久？
- 是否允许外发到 Jev 或托管平台？
- 是否允许浏览器 extension 默认 full retention？
- secret redaction 是否覆盖企业自定义密钥格式？

### 8.2 轨迹质量不等于经验质量

一次成功 trace 可能包含偶然因素或错误假设。

例如：

- Agent 误打误撞修好了问题；
- 过程里有无效命令；
- 修复方式不适合长期规范；
- 用户当时的纠正只适用于某个临时上下文。

所以 review-gated 是必要的，但也意味着产品价值依赖 reviewer 的质量和流程。

### 8.3 跨框架 Skill 复用仍有语义落差

不同 Agent 对 Skill / MCP / Prompt / Tool 的支持程度不同。

即使 Beacon 能生成 `.agents/skills/<slug>/SKILL.md`，也还要验证：

- 各框架是否支持同样的 Skill 结构；
- Agent 是否会在正确任务里激活 Skill；
- Skill 内容是否过度绑定某个工具；
- MCP context retrieval 是否会造成上下文污染；
- 多个 Skill 之间是否冲突。

### 8.4 Jev 评估边界需要实测

从文档看，Jev 负责 typed yes/no 概率判断，帮助识别高信号 trace。

需要进一步实测的问题：

- Jev 对中文任务、中文代码注释、混合语言项目表现如何？
- 它对复杂工程任务成功与否的判断准确率如何？
- 成本相比直接用通用 LLM review trace 能降多少？
- 对长 trace 的 bounded projection 是否会丢掉关键证据？
- 企业能否部署内部兼容 evaluator 替代 hosted TypeSafe endpoint？

### 8.5 浏览器 extension 的 retention 默认值风险较高

浏览器扩展文档显示，其默认 `retention: full`，会把 claude.ai / ChatGPT 的完整 prompt 和 response 发给本地 collector 并写入 runtime.jsonl。

虽然这仍是本地路径，但对于个人账号、混合工作/私人浏览器 profile 来说，这个默认值很敏感。

企业部署必须把 retention policy 纳入管控。

---

## 9. 适用场景

### 9.1 编码 Agent 团队

适合多个工程师、多个 Agent 工具并行使用的团队：

- Claude Code；
- Cursor；
- Codex；
- OpenCode；
- Cline；
- CI 中的 Agent；
- 云端 Coding Agent。

价值：

```text
把个人 session 里的经验变成团队可复用工程记忆。
```

### 9.2 Agent 安全与治理团队

适合安全团队做 Agent runtime visibility：

- 哪些 Agent 在运行？
- 调用了哪些 MCP？
- 是否访问 secret？
- 是否做危险命令？
- 是否绕过 approval？
- 是否发生 prompt injection？
- 是否能接入 SIEM？

### 9.3 企业内部 Agent 平台

如果企业正在做统一 Agent 平台，Beacon 这类系统可以作为：

```text
Agent 运行审计层 + 经验学习层 + 跨框架记忆层
```

但要和企业现有身份、权限、数据分级、审计、日志留存、DLP 打通。

### 9.4 工业 / 医疗 / 金融等高价值流程

这些场景里，最终答案往往不如“推理和操作过程”重要。

例如工业诊断：

```text
Agent 查了哪些数据 → 做了哪些判断 → 调用了哪些工具 → 专家如何纠正 → 最终建议是否有效
```

这种高价值轨迹如果能被评估和沉淀，就可能形成行业 Know-how 复利。

---

## 10. 对家庭营养师项目的启示

家庭营养师项目不应直接把 Beacon 当成当前必需组件。

原因：

- 当前核心难点是家庭营养知识、库存、菜单、反馈和 Postgres + MCP 状态系统；
- 用户数据涉及健康、家庭、宝宝、老人偏好，敏感性高；
- 不适合把完整家庭对话轨迹发给外部 evaluator；
- WeKnora + Git Markdown + Postgres + MCP 已经足够支撑当前 POV。

但 Beacon 的设计原则非常值得借鉴：

### 10.1 重要记忆必须 review-gated

家庭营养师里的长期记忆，例如：

- 宝宝不吃某类食材；
- 老人血糖 / 血压相关限制；
- 家庭成员长期忌口；
- 用户明确形成的饮食原则；
- 周末清库存策略；
- 早餐必须两个快手菜；

都不应该由 Agent 自动悄悄写入长期状态，而应采用：

```text
观察到偏好 / 反馈
→ 生成候选记忆
→ 向用户确认
→ 写入 Postgres / Git Markdown 规则
→ 后续推荐复用
```

### 10.2 推荐过程也应可审计

未来可以给家庭营养师保留“推荐解释轨迹”：

- 为什么推荐这道菜？
- 用了哪些库存？
- 是否避开了近两周重复？
- 是否考虑了宝宝餐 / 老人限制？
- 是否符合早餐快手菜习惯？
- 是否有用户反馈被采纳？

这类似 Beacon 的 trace，但不一定需要完整通用 agent telemetry，可以做更轻量的 domain event log。

### 10.3 高质量菜单策略可以沉淀成 Skill / Rule

例如：

```text
周末清库存菜单生成策略
宝宝餐与成人餐共用食材但不同做法策略
早餐两个快手菜策略
近两周不重复策略
```

这些可以先沉淀在 Git Markdown，再由 WeKnora 检索和 MCP 工具执行。

---

## 11. 对连山产品的启示

Beacon 对连山更有战略启发。

连山如果定位为工业 Agent 平台，不能只做：

```text
知识库 + Chat + 报告生成
```

更高价值的方向是：

```text
工业 Agent 运行轨迹学习层
```

也就是：

```text
设备异常 / 质量波动 / 工艺优化任务
→ Agent 查询数据、调用工具、生成诊断、被专家纠正
→ 记录完整任务轨迹
→ 用规则 / 模型 / 专家评审筛选高价值流程
→ 蒸馏为行业 Skill、诊断 SOP、工艺规则、排障路径
→ 下次同类问题自动复用
```

这和连山现有工业 AI 平台能力可以结合：

| Beacon 启发 | 连山可转化方向 |
|---|---|
| 跨 harness trace | 跨工厂、跨产线、跨 Agent 的任务轨迹统一记录 |
| runtime JSONL / schema | 工业 Agent 操作事件 schema：查数、诊断、建议、审批、执行、反馈 |
| Jev evaluation | 低成本评估哪些任务轨迹值得复盘，不一定直接用 Jev，可自研领域评估器 |
| reviewed memory | 专家审核后的工艺经验、诊断流程、参数优化策略 |
| MCP / Skills 复用 | 工业工具调用策略、诊断 SOP、质量分析模板 |
| detections | 防止 Agent 越权查数、误调用控制系统、泄漏工艺数据 |

我认为这类模式对连山最重要的启发是：

```text
不仅要让 Agent 会做任务，还要让 Agent 做任务的过程可记录、可审查、可复用、可治理。
```

这会形成比普通知识库更强的行业壁垒，因为工业专家经验通常藏在“排查过程”和“现场判断链条”里。

---

## 12. 产品判断

Agent Beacon 代表的是 Agent 产品从“单次执行工具”走向“组织级经验复利系统”的趋势。

它的核心价值可以概括为三句话：

```text
1. 把不同 Agent 工具里的运行历史拿回来，变成组织自己的数据资产。
2. 用评估器和人审把高价值轨迹变成可靠记忆，而不是无差别自动总结。
3. 通过 MCP / Skill 把记忆重新注入未来 Agent，实现跨框架经验迁移。
```

对我们当前产品分析体系，建议把它放在独立类别：

```text
product-analysis/agent-learning-systems/
```

原因是它既不是 WorkBuddy 那种“产物资料库”，也不是 WeKnora 那种“文档知识库”，而是更底层、更过程化的：

```text
Agent runtime experience compounding layer
```

后续如果继续调研，可以把以下产品或方向纳入同类比较：

- AgentOps / LangSmith / Langfuse 等 Agent observability；
- Claude Code Skills / Cursor Rules / Codex instructions 等 Skill 体系；
- Devin / Factory / OpenHands 的 task memory；
- 企业内部 Agent audit / governance / DLP 产品；
- 针对工业 Agent 的领域评估器和经验复盘系统。
