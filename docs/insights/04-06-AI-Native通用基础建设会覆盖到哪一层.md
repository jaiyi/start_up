# 04-06 · AI Native 通用基础建设会覆盖到哪一层

> 讨论稿 / 会更新 · 最近更新 2026-09-30
>
> **一句话结论**：企业 AI Native 的通用基础建设会从模型网关、工具连接、知识检索、Agent 运行时、治理审计继续上移，最终覆盖到“通用任务控制面 / 人机协同运行时”；但它不会吃掉行业对象语义、领域任务模板、专家判据、经营归因和组织责任链。横向管“任务怎么安全可控地跑”，纵向管“任务怎么才算做对”。

---

## 0. 这篇回答什么

`02-横纵分层与迁移形态.md` 讲的是：

> 横向基建会被云厂商、开源和模型平台逐渐抹平；纵向资产要以框架无关的数据、知识、反馈、评价和样本形态沉淀。

`04-05-AI-Native任务闭环平台.md` 讲的是：

> 企业不应该围绕每条业务流重造一套系统，而应该在既有 ERP / MES / EAM / PLM / CRM / OA / 数仓 / 文档之上建设 AI Native 任务闭环平台。

这一篇继续回答一个更架构化的问题：

> 如果未来有比较通用的 AI Native 基础建设层，它会覆盖到哪一层？现在大家东拼西凑组件让任务先跑起来，这个阶段最终会收敛成什么？

判断：

```text
通用基础建设会覆盖到“通用任务控制面”。
再往上的业务语义、领域任务模板、专家判断标准、经营归因和组织责任链，仍然是纵向资产。
```

---

## 1. 现在为什么大家都在东拼西凑

当前很多企业 AI 应用的技术栈大概是：

```text
大模型 API
+ RAG 框架
+ 向量库
+ LangChain / Dify / Coze / AutoGen / CrewAI / Flowise
+ n8n / Zapier / 飞书流 / 企业微信 bot
+ 自研 API connector
+ 临时权限适配
+ 数据库查数脚本
+ 人工确认靠聊天
+ 日志先打到表里
```

这能跑 demo，也能跑一些轻量任务。问题是：

- 任务状态不统一；
- 权限边界不统一；
- 工具调用不可审计；
- 知识版本不可控；
- 反馈不能复用；
- 业务对象没有统一语义；
- AI 输出无法追责；
- 任务结果不能归因；
- 跨场景能力不能沉淀。

这很像早期 Web / 企业软件时代，大家自己拼：

```text
Nginx + Spring + MyBatis + 权限表 + 工作流 + 报表 + 消息队列
```

后来才慢慢沉淀出云平台、低代码、统一身份认证、流程引擎、数据治理、可观测和 API 网关。

AI Native 现在也在经历类似阶段：

> 大家在用横向碎片组件，模拟一个尚未成熟的企业 AI 任务操作系统。

---

## 2. AI Native B 端平台的 9 层模型

可以把企业 AI Native 平台拆成 9 层。

```text
L0 模型与算力层
L1 模型网关 / 上下文 / 会话层
L2 工具连接层
L3 知识与检索层
L4 Agent / Workflow 运行时
L5 治理、审计、评测、可观测层
L6 通用任务控制面
L7 业务对象 / 领域语义层
L8 领域任务模板 / 行业 Skill 层
L9 经营结果 / 组织闭环层
```

我的判断：

```text
L0 - L6 大概率会通用化；
L7 会部分通用、部分纵向；
L8 - L9 基本是纵向资产。
```

这条分界线很重要。它决定了哪些能力应该买、用、替换，哪些能力必须自己沉淀。

---

## 3. 会被通用基础建设覆盖的层

### 3.1 L0：模型与算力层

这一层一定横向化。

包括：

- 大模型 API；
- 多模型路由；
- embedding；
- reranker；
- speech / image / multimodal；
- fine-tuning；
- inference；
- cache；
- token accounting。

企业不会长期自己造这一层，最多做模型选型、私有化部署、成本控制和安全适配。

---

### 3.2 L1：模型网关 / 上下文 / 会话层

这一层也会横向化。

包括：

- model gateway；
- prompt template；
- session memory；
- context packing；
- long context 管理；
- function calling；
- tool calling；
- structured output；
- safety policy；
- fallback；
- cost control。

它会变成类似传统软件里的：

```text
API Gateway + Auth + Rate Limit + Logging
```

现在很多团队还在自己拼，但长期会被平台标准化。

---

### 3.3 L2：工具连接层

这一层会高度通用。

包括：

- API connector；
- MCP tool registry；
- ERP / MES / CRM / OA connector；
- database connector；
- document connector；
- webhook；
- queue；
- permission mapping；
- schema validation；
- idempotency；
- tool execution log；
- tool sandbox。

未来企业不会希望每个 Agent 自己乱接系统。一定会有统一的：

```text
Tool Registry / MCP Gateway / Enterprise Connector Hub
```

这一层会成为企业 AI 的横向底座。

---

### 3.4 L3：知识与检索层

基础能力会通用，但知识内容不会通用。

通用部分包括：

- 文档解析；
- chunking；
- embedding；
- hybrid search；
- rerank；
- citation；
- GraphRAG 基础能力；
- knowledge asset catalog；
- versioning；
- access control；
- freshness check。

但真正有价值的是：

- 哪些文档可信；
- 哪些 SOP 过期；
- 哪些案例可复用；
- 哪些知识适用于哪个业务场景；
- 哪些专家判断被沉淀为 rubric。

所以结论是：

```text
知识底座会通用；
知识资产不会通用。
```

---

### 3.5 L4：Agent / Workflow 运行时

这一层会被大幅横向化。

包括：

- plan-execute；
- multi-step workflow；
- human-in-the-loop；
- retries；
- compensation；
- state checkpoint；
- tool execution；
- multi-agent handoff；
- background task；
- long-running job；
- approval gate；
- artifact generation；
- trace replay。

现在大家拼 LangChain、Dify、Coze、AutoGen、CrewAI、n8n、MCP、飞书流和自研脚本。长期看，这些会收敛成更标准的 Agent Runtime / Workflow Runtime。

但要注意：

> 通用运行时只知道“怎么跑任务”，不知道“这个业务任务应该怎么做才算对”。

这就是横向和纵向的边界。

---

### 3.6 L5：治理、审计、评测、可观测层

这一层一定会成为通用基础建设，而且在 B 端非常关键。

传统软件时代治理对象是：

```text
人、系统、表、字段、接口
```

AI Native 时代治理对象会扩展成：

```text
人
Agent
Skill
Prompt
Tool
Knowledge
Model
Workflow
Output
Feedback
Action
```

因此通用平台必须提供：

- Agent 权限；
- 数据权限；
- tool 权限；
- prompt version；
- skill version；
- knowledge version；
- output audit；
- trace；
- cost；
- latency；
- success rate；
- hallucination rate；
- eval dataset；
- regression test；
- red team；
- sensitive data policy；
- human approval；
- write-back audit。

这层不只是技术能力，更是 B 端大规模落地的安全边界。

---

### 3.7 L6：通用任务控制面

这是我判断通用基础建设能覆盖到的最高层。

它不只是 Agent 编排，而是一个通用的任务闭环运行时。

通用任务对象可以抽象成：

```text
Task
- task_id
- business_object_ref
- requester
- owner
- participant
- status
- priority
- SLA
- input_context
- AI_recommendation
- human_decision
- approval_required
- action_taken
- evidence
- output_artifact
- feedback
- result_metric
- audit_log
```

通用任务状态机可以是：

```text
created
→ triaged
→ assigned
→ AI_assisted
→ human_reviewed
→ approved
→ executed
→ verified
→ closed
→ learned
```

这层会通用，因为大量 B 端任务都有相似结构：

- 有业务对象；
- 有责任人；
- 有上下文；
- 有 AI 建议；
- 有人工确认；
- 有执行动作；
- 有反馈；
- 有审计；
- 有结果评价。

例如：

- 设备维修；
- 质量复盘；
- 客户投诉；
- 供应商异常；
- 采购降本；
- 库存清理；
- 项目毛利改善；
- 合同风险审查；
- 财务异常解释。

底层任务闭环结构很像。

所以结论是：

> 未来通用 AI Native 基础建设会覆盖到 L6：通用任务控制面。

这也是 `04-05` 里“AI Native 任务闭环平台”的核心位置。

---

## 4. 不会被通用基建完全覆盖的层

### 4.1 L7：业务对象 / 领域语义层

这一层会“半通用”。

通用平台可以提供 meta-model：

```text
BusinessObject
Relation
Metric
Event
Document
Person
Organization
Asset
Process
Risk
Action
```

但具体业务语义不通用。

制造业里是：

```text
设备
工单
故障
备件
产线
班组
OEE
停机损失
```

半导体里是：

```text
lot
wafer
die
bin
WAT
CP
FT
RMA
PCN
FA
supplier
```

销售里是：

```text
lead
opportunity
account
contract
renewal
churn risk
```

这些对象可以被通用平台承载，但语义定义、字段口径、关系、质量规则，必须来自行业和企业自己。

所以 L7 的边界是：

```text
对象建模框架可以通用；
对象语义本身不通用。
```

---

### 4.2 L8：领域任务模板 / 行业 Skill 层

这一层大部分是纵向资产。

设备维修任务模板：

```text
故障识别
→ 设备履历查询
→ 相似案例检索
→ 备件库存检查
→ 维修方案推荐
→ 安全风险提示
→ 工单生成
→ 维修复盘
→ SOP 更新
```

供应质量异常任务模板：

```text
异常 lot 识别
→ wafer map pattern 分析
→ WAT / CP / FT 回看
→ PCN 检查
→ supplier 8D 发起
→ containment scope 确定
→ lot release 决策
→ RMA 风险排查
```

采购降本任务模板：

```text
物料族聚类
→ 历史价格对比
→ 供应商议价空间
→ 替代料风险
→ 需求预测
→ 谈判策略
→ 节省金额归因
```

这些任务模板背后是行业 know-how，不会被纯横向平台自然解决。

通用平台最多提供：

```text
模板引擎
Skill Registry
Workflow DSL
表单生成
审批节点
评测机制
```

但模板内容本身是纵向资产。

---

### 4.3 L9：经营结果 / 组织闭环层

这一层最不通用。

包括：

- 这个任务改善了什么经营指标；
- 是否真的降低成本；
- 是否真的减少停机；
- 是否真的降低 RMA；
- 是否真的提高良率；
- 谁贡献了这个结果；
- AI 建议的价值如何归因；
- 哪个团队应该负责；
- 哪个流程应该被改；
- 哪个考核应该调整。

通用平台可以提供经营归因框架，但具体指标一定企业化。

设备维修：

```text
停机时长减少
备件成本下降
MTTR 下降
OEE 提升
```

供应质量：

```text
RMA ppm 下降
maverick lot 拦截率提升
8D closure time 缩短
test escape 减少
```

采购：

```text
采购价差
替代料节省
库存周转提升
供应风险下降
```

这些都不能被纯通用基建完全覆盖。

---

## 5. 分层边界总表

| 层级 | 会不会通用化 | 判断 |
|---|---:|---|
| L0 模型 / 算力 | 高 | 云厂商 / 模型厂商主导 |
| L1 模型网关 / 上下文 | 高 | 很快标准化 |
| L2 工具连接 / MCP / API | 高 | 企业必须统一治理 |
| L3 知识 / RAG 基础设施 | 高 | 但知识内容不通用 |
| L4 Agent / Workflow 运行时 | 高 | 会被模型厂商和平台厂商吸收 |
| L5 权限 / 审计 / 评测 / 可观测 | 高 | B 端刚需 |
| L6 通用任务控制面 | 中高 | 横向平台的上限 |
| L7 业务对象 / 领域语义 | 中 | 框架通用，语义不通用 |
| L8 领域任务模板 / Skill | 低 | 主要是纵向资产 |
| L9 经营归因 / 组织闭环 | 低 | 企业内生，强业务嵌入 |

一句话：

> 通用基建会覆盖到“任务怎么被 AI、人和系统协同执行、治理、留痕、反馈”的层级；但不会覆盖“这个任务在某个行业里到底怎么做才对、怎么判断结果、怎么归因和改流程”。

---

## 6. 未来通用基础建设的产品形态

我认为它会长成一个类似这样的东西：

```text
Enterprise AI Task OS
/ AI Workbench
/ Agent Control Plane
/ AI Native Task Runtime
```

它会包含：

```text
1. Model Gateway
2. Tool / MCP Registry
3. Connector Hub
4. Knowledge / RAG Substrate
5. Agent Runtime
6. Workflow Runtime
7. Permission / Policy Engine
8. Audit / Trace / Observability
9. Evaluation / Feedback
10. Human-in-the-loop
11. Task State Machine
12. Artifact / Knowledge Asset Management
13. Business Object Meta-model
14. App / Template Builder
```

它的产品形态不是单纯聊天框，也不是传统低代码，而是：

> 企业级 AI 任务运行与治理平台。

用户看到的是一个个场景应用：

```text
设备维修助手
质量异常闭环助手
采购降本助手
项目毛利助手
客户投诉助手
供应商质量助手
```

但底层是统一的：

```text
任务对象
权限
工具
知识
AI Skill
反馈
审计
指标
归因
```

---

## 7. 对 `04-05` 八层架构的修正

`04-05` 里把 AI Native 任务闭环平台拆成八层：

```text
连接层
语义层
知识层
任务层
AI 能力层
治理层
反馈层
经营归因层
```

如果从“通用基础建设会覆盖到哪”来切，可以重新分成三段。

### 7.1 确定会通用化的横向基建

包括：

```text
连接层
AI 能力层
治理层
任务运行时
反馈基础设施
评测 / 可观测
```

这些会被平台厂商、云厂商、开源框架逐渐做掉。

---

### 7.2 半通用的业务抽象层

包括：

```text
业务对象 meta-model
任务状态机
人机协同模型
审批 / 确认 / 写回模式
知识资产目录
指标和结果对象
```

这部分会出现通用框架，但需要企业和行业配置。

它是“可平台化的壳”。

---

### 7.3 不可通用的纵向资产

包括：

```text
领域对象语义
行业 SOP
专家 rubric
任务模板
领域 Skill
评测集
反馈数据
经营归因口径
组织责任链
```

这部分就是 `02` 里说的纵向资产。

它应该被平台承载，但不能被平台替代。

---

## 8. 三类玩家的机会

### 8.1 云厂商 / 模型厂商

会吃掉：

```text
模型调用
Agent runtime
tool calling
workflow
eval
observability
部分 memory
部分 RAG
```

它们会把 Agent 基建做成云原生能力。

---

### 8.2 企业 AI 平台厂商

会做：

```text
企业级 Tool Registry
MCP Gateway
权限审计
知识资产管理
任务控制面
workflow runtime
AI App Builder
feedback loop
evaluation management
```

这类厂商如果做得好，会成为企业 AI Native 的横向底座。

但如果只停留在“低代码拼 Agent”，壁垒不够。

---

### 8.3 行业 / 场景型厂商

真正有机会做深的是：

```text
设备维修闭环
质量问题闭环
供应质量闭环
采购降本闭环
项目经营闭环
客户投诉闭环
```

它们的价值不在底层 Agent 框架，而在：

```text
业务对象模型
任务模板
行业知识
专家判据
数据 schema
反馈闭环
经营指标
```

也就是纵向资产。

---

## 9. “先让任务跑起来”的正确姿势

“先让任务跑起来”是对的，但要小心两种路线。

### 9.1 路线 A：拼组件跑 demo

典型形态：

```text
RAG + Agent + workflow + bot + API
```

优点：

- 快；
- 能验证场景；
- 容易拿到业务反馈。

缺点：

- 权限乱；
- 状态散；
- 反馈丢；
- 知识不沉淀；
- 跨场景不能复用；
- 后续重构成本高。

这条路线适合探索，不适合长期沉淀。

---

### 9.2 路线 B：用最小任务闭环跑 MVP

不是一开始造大平台，而是每个场景都强制沉淀同一套骨架：

```text
业务对象
任务状态
输入上下文
AI 建议
人工确认
工具调用
执行结果
反馈修正
知识沉淀
指标影响
审计记录
```

这样即使底层组件是拼的，也不会白拼。因为真正留下来的是：

```text
任务轨迹
反馈数据
业务对象
专家判据
评测样本
结果归因
```

这些是纵向资产。

正确姿势是：

> 可以拼组件，但必须用统一任务闭环 schema 拼；不能每个场景各拼一套临时链路。

---

## 10. 最小任务闭环 schema

如果现在没有成熟平台，也应该至少让每个场景按同一套 schema 留痕。

```text
TaskTrace
- task_id
- scenario_id
- business_object_type
- business_object_id
- requester
- owner
- participants
- input_context_refs
- input_context_snapshot
- ai_skill_id
- ai_skill_version
- model_id
- prompt_version
- tool_calls
- knowledge_refs
- recommendation
- human_decision
- approval_record
- action_taken
- writeback_target
- result_metric_before
- result_metric_after
- user_feedback
- expert_correction
- learned_asset_refs
- audit_log
```

其中最关键的是 5 类信息：

```text
业务对象是什么
AI 基于什么上下文和知识给了什么建议
人类如何确认、修正或拒绝
最终执行了什么动作
结果后来被证明有没有价值
```

这 5 类信息只要留下来，横向框架未来换掉也不怕。

---

## 11. 最关键的架构判断

边界可以这样划：

```text
通用基建负责：
让 AI 能安全、可控、可审计地参与任务执行。

纵向资产负责：
定义什么是正确任务、正确判断、正确动作、正确结果。
```

或者更短：

```text
横向管“任务怎么跑”；
纵向管“任务怎么才算做对”。
```

如果一个产品只管“任务怎么跑”，它就是横向平台，最终会被云厂商、开源框架和大厂基础设施竞争压薄。

如果一个产品沉淀了“任务怎么才算做对”，它才有行业壁垒。

---

## 12. 最终判断

未来比较通用的基础建设层，会覆盖到：

```text
模型网关
工具连接
知识检索
Agent 运行时
工作流
权限治理
审计追踪
评测反馈
Human-in-the-loop
通用任务状态机
通用任务控制面
```

也就是覆盖到 `04-05` 里的：

```text
连接层
AI 能力层
治理层
任务层的通用部分
反馈层的基础设施部分
```

但它不会真正覆盖：

```text
行业对象语义
任务模板
领域知识
专家评价标准
业务规则
经营归因
组织责任链
客户现场反馈
```

这些仍然是 `02` 里说的纵向资产。

所以现在看到的“东拼西凑组件让任务先跑起来”，本质上是行业还没形成稳定的 L0-L6 横向底座。等这层成熟后，很多今天看似值钱的拼装能力会被抹平。

真正应该沉淀的是：

```text
每个场景跑任务时留下的结构化轨迹
人工修正
专家判据
领域对象
任务模板
结果反馈
经营影响
```

一句话收束：

> 未来通用基础建设会覆盖到“AI 任务控制面”，但覆盖不到“行业任务正确性的定义”。所以现在可以拼组件，但一定要按统一任务闭环 schema 沉淀纵向资产，否则今天跑起来的任务，明天横向框架一换，就什么都留不下。
