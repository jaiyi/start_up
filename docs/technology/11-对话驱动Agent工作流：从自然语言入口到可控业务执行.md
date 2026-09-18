# 11 · 对话驱动 Agent 工作流：从自然语言入口到可控业务执行

> 目标：把“对话驱动 Agent 工作流”从一个容易被误解的概念，整理成一套可理解、可实现、可迁移、可评测的通用架构。本文先讲通用模式，再用内部实现和开源框架做映射，避免把某个私有项目误当成唯一答案。

---

## 1. 一句话定义

对话驱动 Agent 工作流，不是让大模型自由决定业务流程怎么走。

更准确地说，它是：

```text
用自然语言降低业务流程入口门槛，
用工具调用把用户意图转成结构化输入，
用确定性工作流引擎决定流程能不能推进，
用人工确认守住关键动作，
用状态快照、幂等和审计保证流程可靠。
```

一句话：

> 模型可以驱动流程，但不能篡改流程。

这里的“驱动”，指的是模型可以帮助用户：

```text
理解自己想办什么；
选择合适流程；
补齐流程参数；
提交确认、拒绝、选择等 signal；
解释流程为什么停在某一步。
```

这里的“不能篡改”，指的是模型不能：

```text
修改流程定义；
跳过审批或人工确认；
自己发明流程步骤；
绕过权限；
绕过流程直接写业务数据；
伪造用户身份；
在多个等待流程之间替用户瞎猜。
```

---

## 2. 为什么“会聊天”不等于“能办业务”

传统业务系统的入口通常是菜单、表单和审批页。它的问题是：

```text
用户要知道该点哪个入口；
用户要理解字段含义；
用户要自己判断走哪个流程；
用户要在多个系统之间切换；
用户很难在同一个地方提问、补充信息、确认和查看状态。
```

大模型出现后，我们希望用户可以直接说：

```text
帮我申请买两台显示器，每台 1200 元。
```

系统自动理解：

```text
这是采购申请；
采购物品是显示器；
数量是 2；
单价是 1200；
需要用户确认；
确认后才能创建采购单。
```

但如果只靠大模型自由发挥，会有很大风险：

```text
它可能听错流程；
可能漏掉关键字段；
可能把未确认的信息当成已确认；
可能调用不该调用的工具；
可能在审批前就执行副作用；
可能在用户只是咨询时误启动流程。
```

所以这类系统的目标不是“把传统业务系统换成聊天机器人”，而是：

```text
自然语言体验 + 确定性流程控制 + 可审计业务执行
```

可以把它类比成一个“会说话的办事大厅”：

| 类比 | 架构组件 | 作用 |
|---|---|---|
| 前台接待员 | 聊天入口 | 接收自然语言、持续交互 |
| 听懂需求的人 | LLM | 理解意图、抽取参数、解释状态 |
| 办事按钮 | Tools | 查询、校验、提交 signal |
| 办事目录 | Workflow Directory | 告诉系统有哪些流程可办 |
| 办事规则 | Workflow Engine | 决定流程步骤和分支 |
| 签字窗口 | WaitingPoint / Human Task | 关键动作等待人确认 |
| 后台系统 | Business Adapter | 真正写业务、发单、同步数据 |
| 大厅屏幕 | WorkflowPanel | 展示当前状态、待办和结果 |
| 办理记录 | Audit Log | 留痕、追责、回放、评测 |

前台可以帮用户填材料、递交申请、解释进度；但不能私自改审批规则，也不能绕过签字窗口。

---

## 3. 参考架构：六层主链路 + 一个横切层

一个成熟的对话驱动 Agent 工作流，可以抽象成六层主链路，再加一个贯穿全链路的评测观测层。

```text
L1 用户交互层
L2 Agent 对话编排层
L3 工具治理层
L4 Workflow Gateway 层
L5 Workflow Engine 层
L6 Business Adapter 层

横切层 Evaluation / Observability
```

展开看：

```text
用户
  ↓
L1 User Interaction
  - Chat UI
  - WorkflowPanel
  - Pending Tasks
  - Notification
  ↓
L2 Agent Orchestration
  - System Prompt
  - Mind / Persona
  - Skill / SOP
  - Tool Choice
  - Context Assembly
  - Conversation Memory
  ↓
L3 Tool Governance
  - Tool Registry
  - Tool Schema
  - Tool Snapshot
  - Policy Guard
  - ToolRuntime
  - Event Stream
  ↓
L4 Workflow Gateway
  - Workflow Directory
  - Workflow Detail Query
  - Instance Resolution
  - WaitingPoint Resolution
  - Signal Submission
  ↓
L5 Workflow Engine
  - BPMN / State Machine / Durable Workflow
  - Workflow Definition
  - Workflow Instance
  - Branch Rule
  - WaitingPoint / Human Task
  - Snapshot / Checkpoint
  - Idempotency
  - Recovery
  ↓
L6 Business Adapter
  - ERP / CRM / MES / PLM
  - 工单系统
  - 采购 / 报销 / 请假系统
  - 数据库台账
  - 外部 API

横切层 Evaluation / Observability
  - Trace
  - Metrics
  - Replay
  - Regression
  - Human Review
  - Business Outcome Evaluation
```

这个分层的核心好处是权责清楚：

```text
模型层负责理解和表达；
工具治理层负责“能不能调用”；
工作流层负责“能不能推进”；
业务适配层负责“怎么执行副作用”；
评测观测层横跨所有层，负责记录、回放、回归和判断系统是否真的可靠。
```

---

## 4. 端到端运行链路

以“用户在聊天框里确认一个采购申请”为例，一次完整链路可以是：

```text
1. 用户输入：“确认”
2. Chat UI 发送 user message
3. Agent Runtime 记录消息事件
4. LLM 判断用户是在提交确认 signal
5. LLM 调用 submit_workflow_signal 工具
6. ToolRuntime 检查工具 schema
7. Policy Guard 检查用户、租户、项目、权限和风险边界
8. Workflow Gateway 查询当前会话下的 waiting workflows
9. 如果只有一个等待点，构造 confirm signal
10. 如果多个等待点，返回候选列表要求用户明确选择
11. Workflow Engine 加载 workflow snapshot
12. Workflow Engine 检查当前状态是否接受 confirm
13. Workflow Engine 检查 event_id / idempotency_key 是否重复
14. Workflow Engine 推进到下一节点
15. 如果下一节点是业务副作用，调用 Business Adapter
16. 保存新的 snapshot 和 audit log
17. 返回 workflow state / workflow panel
18. LLM 把结构化状态解释给用户
```

这条链路说明一个关键原则：

```text
“确认”这句话只是入口；
真正的确认动作由工具、策略、流程状态和业务 handler 共同校验。
```

---

## 5. 核心资产分工

对话驱动 Agent 工作流里容易混在一起的资产很多。它们的控制强度不同，不能互相替代。

| 资产 | 面向谁 | 控制强度 | 典型内容 | 不应误解为 |
|---|---|---|---|---|
| Mind / Persona | LLM | 软约束 | 角色、边界、触发条件、证据要求 | 不是权限系统 |
| Skill / SOP | LLM | 软约束到中等约束 | 操作步骤、工具使用顺序、注意事项 | 不是强状态机 |
| Tool Schema | LLM + Runtime | 结构约束 | 参数类型、必填字段、返回结构 | 不是完整业务校验 |
| Policy Guard | Runtime | 强约束 | 用户、租户、项目、工具、风险策略 | 不是提示词 |
| Tool Code | Backend | 强执行 | 查询、计算、调用外部服务 | 不是流程编排本身 |
| Workflow Gateway | Runtime | 强约束 | 流程目录、实例定位、等待点定位、signal 提交 | 不是业务 handler |
| BPMN / Workflow | Engine | 强约束 | 节点、分支、等待、状态、恢复、幂等 | 不是知识图谱 |
| DMN / Rules | Engine / Service | 强约束 | 决策表、规则、派发、准入、优先级 | 不是完整流程引擎 |
| OWL / Ontology | Knowledge | 语义资产 | 概念、关系、公理、领域术语 | 不是实时事实库 |
| AGE / Graph DB | Knowledge Runtime | 查询能力 | 运行时图查询、关系遍历 | 不是流程状态机，也不是 OWL 推理机 |
| WorkflowPanel | UI | 展示约束 | 当前节点、待办、可选动作、历史 | 不是流程真相源 |
| Evaluation | Eval System | 质量约束 | 回归集、trace、人工评审、业务结果评测 | 不是上线后的可选项 |

最重要的分界是：

```text
Mind / Skill 指导模型应该怎么做；
Tool Schema / Policy Guard 限制模型能怎么调用；
Workflow 控制生命周期、等待点、审计、恢复和副作用；
Business Adapter 执行真正的业务动作；
Knowledge Graph 提供知识和关系，不推进流程。
```

---

## 6. DMN / BPMN / OWL / AGE 的关系

工业 Agent 和企业流程系统里，经常会同时出现四类资产：

```text
DMN
BPMN
OWL
AGE
```

它们不是同一种东西，也不是互相替代关系。

| 概念 | 全称 | 一句话定位 | 主要回答什么问题 |
|---|---|---|---|
| DMN | Decision Model and Notation | 决策模型，常以决策表落地 | 规则怎么判？是否允许？派给谁？优先级是什么？ |
| BPMN | Business Process Model and Notation | 流程建模标准，需要由流程引擎执行 | 流程有哪些步骤？下一步去哪？何时等待人工？ |
| OWL | Web Ontology Language | 领域概念、公理和关系约束的本体语言 | 领域里有哪些概念？概念之间是什么关系？ |
| AGE | Apache AGE | PostgreSQL 的图数据库扩展，可承接运行时知识图谱 | 已投影进图的数据里，对象和关系怎么查？ |

可以先这样记：

```text
DMN 管判断；
BPMN 管流程；
OWL 管语义；
AGE 管运行时图查询。
```

---

### 6.1 AGE 与 BPMN：知识平面 vs 流程平面

一个最常见的混淆是：有了 AGE 图谱，是不是就不需要 BPMN 了？

答案是否定的。

| 问题 | AGE / Knowledge Graph | BPMN / Workflow Engine |
|---|---|---|
| 当前有哪些领域对象？ | 可以回答，前提是对象已入图 | 不负责 |
| 设备、故障、根因、措施之间有什么关系？ | 可以回答，前提是关系已建模 | 不负责 |
| 从一个异常出发有哪些可能根因？ | 可以回答，前提是故障树已投影 | 不负责 |
| 当前流程实例走到哪一步？ | 不负责 | 负责 |
| 下一步应该进入哪个任务节点？ | 不负责 | 负责 |
| 是否要等人工确认？ | 不负责 | 负责 |
| 用户重复提交是否要去重？ | 不负责 | 负责或协同处理 |
| 流程失败后怎么恢复？ | 不负责 | 负责 |
| 是否允许执行正式业务副作用？ | 不负责 | 通过流程、权限和 policy 控制 |

所以可以把它们理解成两个平面：

```text
知识平面：OWL / AGE
  负责“知道什么、关系是什么、证据在哪里”。

流程平面：BPMN / Workflow Engine
  负责“现在该做哪一步、能不能推进、是否等待人工”。
```

BPMN 节点可以调用查询 AGE 的服务或工具，但 AGE 本身不会推进流程实例。

```text
BPMN 节点：诊断根因
  ↓
流程引擎执行该节点绑定的 handler
  ↓
handler 查询 AGE 图谱
  ↓
返回异常 → 现象 → 候选根因 → 推荐检查项
  ↓
流程引擎根据结果继续进入“生成措施”或“等待人工确认”节点
```

反过来，BPMN 也不是知识图谱。BPMN 可以表达：

```text
数据感知 → 场景识别 → 根因诊断 → 措施生成 → 验证反馈
```

但它不适合表达：

```text
某类异常有哪些现象；
每个现象指向哪些根因；
每个根因属于 material / machine / method / environment 哪一类；
每条因果边有什么触发条件；
某个故障模式对应哪些检查步骤。
```

这些更适合 OWL / RDF / Knowledge Graph / Graph DB。

一句话：

```text
AGE 为流程提供知识；
BPMN 为知识使用提供流程秩序。
```

---

### 6.2 DMN、BPMN、OWL、AGE 如何一起工作

一个典型的工业事件闭环可以是：

```text
1. 现场事件进入运行时系统
   例如质量异常、设备告警、工单事件、追溯请求。

2. DMN 做派发或准入决策
   判断 event_type / severity / confidence，输出 action_type、priority、target_role。

3. BPMN / Workflow Engine 创建或推进流程实例
   决定流程从哪个节点开始、是否等待人工、是否进入处置闭环。

4. 某个自动任务节点通过 handler 查询 AGE
   例如根因诊断节点查询故障树路径或设备关系。

5. Tool / Business Service 查询实时事实
   例如测量值、设备日志、环境数据、换料记录、历史维修记录。

6. 流程进入 Human Task / WaitingPoint
   如果风险高、证据不足或需要责任人确认，流程暂停等待人工。

7. 执行动作并记录反馈
   写回工单、生成报告、创建任务、验证效果、沉淀经验。
```

对应关系可以写成：

```text
事件来了：由运行时系统接住；
要不要派发：由 DMN 判断；
怎么一步步办：由 BPMN / Workflow Engine 编排；
需要哪些领域知识：查询由 OWL / 本体约束建模，并投影到 RDF Store 或 Graph DB 的领域关系；
需要哪些实时事实：调用业务 tools 查询；
要不要人确认：由流程状态和 policy 决定；
结果是否有效：由 feedback / evaluation 判断。
```

这也说明：

```text
只有 AGE 不够：AGE 能告诉你可能的根因，但不能保证先人审再下发措施。
只有 BPMN 不够：BPMN 能告诉你先诊断再验证，但本身不知道故障树知识。
只有 LLM + Skill 也不够：Skill 能指导模型操作，但不是可恢复、可审计、可幂等的流程实例。
```

---

## 7. 两条执行路径：Skill 路径 vs Workflow 路径

对话驱动 Agent 并不总是需要严格 BPMN。工程上可以把任务分成两条路径。

---

### 7.1 路径 A：LLM + Mind + Skill + Tools + Knowledge Graph

这条路径适合只读追溯、查询、解释、候选澄清这类任务。

```text
用户自然语言
  ↓
LLM 理解意图
  ↓
Mind 限定角色和边界
  ↓
Skill 提供操作 SOP
  ↓
LLM 选择工具并抽取参数
  ↓
Tool Schema / Policy Guard 校验
  ↓
Tool 查询业务数据或知识图谱
  ↓
LLM 基于工具返回事实组织回复
```

它的优点：

```text
交互灵活；
适合边问边查；
适合输入不完整时逐步澄清；
适合只读数据查询；
Skill 可以快速沉淀专家 SOP。
```

它的局限：

```text
Skill 是 Prompt / SOP，不是强状态机；
LLM 仍可能漏调用、误调用、顺序出错；
会话恢复、幂等、等待点、审计能力较弱；
不适合正式审批、下发、关单、写生产数据。
```

所以这条路径适合：

```text
读多写少；
可逆或低风险；
主要目标是解释和查询；
不需要强审计闭环；
不需要跨天恢复。
```

---

### 7.2 路径 B：LLM + Workflow Signal + Workflow Engine

这条路径适合高风险、强状态、强审计的业务流程。

```text
用户自然语言
  ↓
LLM 抽取意图 / 参数 / signal
  ↓
submit_workflow_signal
  ↓
Workflow Gateway
  ↓
Workflow Instance / BPMN / Durable Workflow
  ↓
DMN / Rules / Gateway
  ↓
Human Task / WaitingPoint
  ↓
Service Task / Business Adapter
  ↓
Snapshot / Audit / Recovery
```

它的优点：

```text
下一步由流程引擎决定；
状态可持久化；
流程可恢复；
操作可审计；
重复提交可幂等处理；
人工等待点明确；
更适合生产级副作用。
```

它的局限：

```text
接入成本更高；
需要维护流程定义、任务映射、版本和状态存储；
对探索式问答不如 Skill 灵活。
```

---

### 7.3 两条路径怎么选

| 维度 | Skill 路径 | Workflow 路径 |
|---|---|---|
| 典型任务 | 追溯、查询、解释、候选确认 | 审批、下发、创建单据、闭环处置 |
| 控制方式 | Skill 指令 + Tool Schema + Policy Guard | 流程模型 + 实例状态 + WaitingPoint |
| Knowledge Graph 角色 | 提供术语、关系、上下文、候选知识 | 被流程节点的 handler 查询 |
| BPMN 角色 | 通常不参与，或作为未来升级方向 | 流程定义，由流程引擎执行 |
| LLM 权限 | 选择工具、抽参数、组织回复 | 主要提交 signal，不决定下一流程节点 |
| 状态恢复 | 依赖会话、tool result、event log | 依赖流程快照、checkpoint、instance state |
| 人工确认 | 对话澄清候选 | Human Task / WaitingPoint |
| 风险等级 | 适合只读或低副作用任务 | 适合高风险副作用任务 |

一句话：

```text
读多写少、风险低、需要灵活解释：可以先 Skill 化；
要写业务、要审批、要恢复、要审计：必须 Workflow 化。
```

---

### 7.4 Skill 什么时候应该升级成 Workflow

一个 Skill 可以先作为轻量 SOP 存在。

但当它出现下面这些特征时，就应该升级成 Workflow：可以是 BPMN 流程引擎，也可以是 Temporal 一类 Durable Workflow，或自研的显式状态机。关键不是是否画 BPMN 图，而是是否具备实例状态、等待点、幂等、恢复、审计和权限边界。

```text
1. 有正式业务副作用
   例如创建单据、关闭工单、参数下发、发送正式通知。

2. 有多角色协作
   例如工程师确认、班组执行、质量经理审核。

3. 有明确等待点
   例如必须等人确认后才能继续。

4. 有跨天或长周期流程
   例如今天诊断，明天验证，三天后追踪效果。

5. 有恢复和重试要求
   例如 worker 崩溃后不能丢流程。

6. 有审计和责任归属要求
   例如要知道谁在什么时候批准了什么。

7. 有幂等要求
   例如用户重复点击不能重复下发。
```

可以这样理解：

```text
阶段 1：只读排查
  LLM + Skill + Tools 足够。

阶段 2：处置闭环
  需要 BPMN / Workflow。
```

---

## 8. BPMN 自动节点如何实现

BPMN 里可以有自动节点，例如自动查表、自动判断、自动调用规则、自动流转。

但要先分清一个关键点：

```text
BPMN 模型本身不直接查表；
BPMN 引擎走到某个节点时，会调用这个节点绑定的 handler / service task / business adapter；
真正查表、计算、调用 AGE、调用 DMN、写上下文的是这些后端代码。
```

可以把它理解成：

```text
BPMN 节点 = 流程图上的格子；
handler = 这个格子背后真正干活的函数；
workflow context = 节点之间传递的结构化上下文；
流程引擎 = 根据节点结果和分支条件推进状态的人。
```

一个自动节点通常会做四件事：

```text
1. 从 workflow context 读取输入；
2. 查表、调工具、调服务或查询 AGE；
3. 把结果写回新的 workflow context；
4. 返回 completed / waiting / failed 等执行结果。
```

---

### 8.1 自动节点示例

| BPMN 节点 | 自动动作 | 背后实现 |
|---|---|---|
| `Task_LoadContext` | 解析业务对象、设备、人员、单据 | 查业务主数据或调用解析工具 |
| `Task_QueryMeasurements` | 查询测量值、历史数据、邻近样本 | 调业务查询服务 |
| `Task_CheckBaseline` | 判断基线是否可用 | 读取 handler 返回的结构化字段 |
| `Task_CheckVerdict` | 判断是否超限或偏离 | 使用工具返回的 verdict，不让 LLM 重算 |
| `Task_QueryFaultTree` | 查询候选根因路径 | 查询 AGE / Knowledge Graph |
| `Task_QueryEvidence` | 查询日志、记录、上下游数据 | 调业务查询工具 |
| `Task_RunPolicyDecision` | 判断是否需要人工审核 | 调 DMN / Rules Engine |
| `Task_GenerateReport` | 生成报告草稿 | 模板生成或 LLM 基于证据生成 |
| `Task_VerifyEffect` | 验证措施效果 | 自动查表 + 指标计算 |

自动节点后面经常接一个分支网关：

```text
Task_QueryMeasurements
  ↓
Gateway_BaselineAvailable
  ├── baseline_available = false → UserTask_ManualReview
  └── baseline_available = true  → Task_CheckVerdict
```

这里的判断不是 LLM 自己拍脑袋，而是上一个 handler 写入了结构化结果：

```json
{
  "baseline_available": true,
  "anchor_verdict": "over_ucl",
  "abnormal_neighbor_count": 3
}
```

流程引擎再根据这些字段走不同分支。

如果规则比较复杂，就不要把条件全部写在 BPMN 连线上，而是放到 DMN：

```text
Task_RunPolicyDecision
  ↓
输入 severity / confidence / station_type / abnormal_count / action_type
  ↓
DMN 输出 require_review / allow / block / target_role / reason
  ↓
BPMN 根据 DMN 输出进入不同节点
```

例如：

```text
require_review → UserTask_ApproveMeasure
allow          → Task_ExecuteMeasure
block          → Task_StopWithReason
```

这时职责非常清楚：

```text
handler 产生事实；
DMN / gateway 产生判断；
BPMN 引擎产生流转；
LLM 负责解释、补参数、提交 signal，不负责私自决定流程下一步。
```

---

## 9. 通用 Workflow Tool API 设计

不要给每个流程都写一个专用工具，例如：

```text
advance_purchase_workflow
advance_expense_workflow
advance_leave_workflow
advance_quality_workflow
```

这样流程一多，工具会膨胀，Prompt 也会失控。

更好的方式是设计一组通用 workflow tools。

| Tool | 用途 |
|---|---|
| `list_workflows` | 查询当前用户可用流程目录 |
| `get_workflow_detail` | 按需查询某个流程的详细参数要求 |
| `start_workflow` | 创建流程实例 |
| `update_workflow_inputs` | 补充或修正流程输入 |
| `get_workflow_status` | 查询当前流程状态、等待点、历史记录和可用动作 |
| `submit_workflow_signal` | 向某个等待点提交 confirm / reject / select 等 signal |
| `cancel_workflow` | 取消流程实例 |
| `explain_workflow_state` | 把结构化流程状态翻译成用户能听懂的话 |

这样系统提示词里只需要给每个流程一行摘要，详细字段由模型按需调用 `get_workflow_detail` 查询。

---

### 9.1 “配置即接入”应该怎么理解

理想状态是：

```text
新增一个流程 = 加一个配置文件 + 注册表一行。
```

可以配置的内容包括：

```text
流程 key；
流程名称；
流程摘要；
适用场景；
输入 schema；
等待点；
允许动作；
前端展示文案；
权限要求；
handler 绑定名；
RAG 说明文档引用；
评测样例。
```

示例：

```yaml
workflow_key: purchase_request
version: 1
name: 采购申请
summary_for_llm: 用户想购买、采购、申请办公用品或设备时使用。

inputs:
  item_name:
    type: string
    required: true
    description: 采购物品名称
  quantity:
    type: integer
    required: true
    description: 数量
  unit_price:
    type: number
    required: true
    description: 单价
  reason:
    type: string
    required: false
    description: 采购原因

waiting_points:
  - key: confirm_purchase
    title: 确认采购申请
    allowed_actions: [confirm, reject]

handlers:
  validate_budget: purchase.validate_budget
  create_purchase_order: purchase.create_order
```

但不应该把所有东西都交给配置或模型决定。

不应该只靠配置决定的内容包括：

```text
真正写数据库；
调用付款接口；
创建采购单；
审批通过；
发送正式通知；
设备参数下发；
权限绕过；
异常补偿。
```

这些应该由后端 handler 实现，并且在 handler 里再次校验：

```text
用户权限；
流程状态；
确认标志；
金额限制；
幂等 key；
业务唯一约束。
```

---

## 10. 可靠性与安全边界

很多初学者会觉得：

```text
我在系统提示词里告诉模型“不要跳过确认”，是不是就够了？
```

不够。

Prompt 是软约束，模型可能：

```text
理解错；
上下文丢失；
被用户诱导；
遇到复杂表达时误判；
工具选择错误；
生成看似合理但不合规的参数。
```

可靠系统必须是多重防线：

```text
Prompt 提醒模型；
Tool Schema 限制输入；
Policy Guard 限制调用；
Workflow Engine 限制状态转移；
Business Handler 限制副作用；
Audit Log 记录结果。
```

---

### 10.1 多流程同时等待时怎么办

假设当前用户有两个流程都在等待确认：

```text
采购申请 A：等待确认购买显示器
报销申请 B：等待确认报销打车费
```

用户只说：

```text
确认
```

系统不能随便替用户确认其中一个。

正确策略是：

```text
1. 查询当前用户 / 当前会话下的 waiting workflows。
2. 如果只有一个，允许提交 confirm。
3. 如果多个，返回选择列表。
4. 如果用户明确说“确认采购那个”，再匹配。
5. 如果仍不明确，继续反问。
```

这条原则是：

> 对话可以模糊，但执行不能模糊。

---

### 10.2 幂等与恢复为什么是刚需

真实业务系统一定会遇到：

```text
用户重复点击确认；
浏览器断线重发；
WebSocket 重连；
消息队列重复投递；
worker 执行一半崩溃；
外部系统调用超时；
用户刷新页面后再次提交。
```

所以每个重要动作都要有：

```text
event_id；
idempotency_key；
last_event_id；
processed_event_ids；
workflow version；
业务唯一约束；
状态快照；
审计日志。
```

一个重要实践是：

```text
不要一收到事件就立刻标记为已消费；
应该在 WAITING / COMPLETED / 稳定 checkpoint 后再记录。
```

原因是：

```text
如果下游步骤执行一半失败，消息队列重投递时还可以重试；
如果过早标记已消费，流程可能卡死在半完成状态。
```

---

### 10.3 WorkflowPanel 为什么重要

如果只有聊天文本，用户很难知道：

```text
流程走到哪一步；
还有哪些待办；
刚才“确认”到底确认了什么；
下一步会不会写业务数据；
系统有没有真的执行成功。
```

所以应该有结构化状态面板：

```text
current_step；
current_gate；
waiting_tasks；
available_actions；
events；
history；
status；
business_result；
error_message。
```

聊天负责解释，面板负责展示事实。

---

## 11. 多仓库 / 多模块协同方式

对话驱动 Agent 工作流通常不是一个单体模块，而是多个仓库或多个模块协同。

建议先用通用名称理解，不要把某个具体私有项目名当成架构本身。

| 通用模块 | 主要职责 | 不应该主责 |
|---|---|---|
| Chat Workstation | 聊天入口、工作流面板、用户会话、待办展示 | 复杂流程分支、业务副作用 |
| Agent Runtime | Prompt、上下文、工具选择、工具治理、事件流 | 最终业务审批规则 |
| Workflow Engine | 流程定义、流程实例、等待点、状态机、幂等、恢复 | 自然语言理解、聊天 UI |
| Business Capability Repository | Mind、Skill、Tool、业务规则、领域案例 | 通用会话框架 |
| Knowledge Repository | 文档、FAQ、RAG 语料、OWL、本体、图谱投影契约 | 流程状态推进 |
| Business Adapter | ERP、CRM、MES、工单、采购、报销等系统对接 | 让 LLM 直接写核心业务 |
| Evaluation Repository | Golden Set、Trace、Replay、回归测试、业务指标评测 | 线上执行副作用 |

这类拆分的目标是：

```text
入口可以统一；
流程可以独立演进；
业务能力可以按领域沉淀；
知识资产可以持续复利；
评测可以横向复用。
```

---

### 11.1 多仓库协同的关键契约

多仓库协同的重点不是仓库名称，而是稳定契约。

| 契约 | 谁提供 | 谁消费 | 稳定性要求 |
|---|---|---|---|
| Workflow Tool API | Workflow Gateway / Agent Runtime | Chat Workstation / LLM | 工具名称、参数 schema、返回结构要版本化 |
| Workflow Descriptor | Business Capability Repository | Workflow Engine / Agent Runtime | 描述流程 key、摘要、输入、等待点、handler binding |
| WorkflowPanel DTO | Workflow Engine / Gateway | Chat Workstation | 面板字段稳定，方便前端展示状态 |
| Tool Schema / Capability | Business Capability Repository | Agent Runtime / Policy Guard | 标明参数、权限、side effect、fail-closed 行为 |
| Handler Binding | Business Capability Repository | Workflow Engine | 用稳定名称绑定后端 handler，不让 LLM 直接调用内部函数 |
| Knowledge Projection Contract | Knowledge Repository | Graph Runtime / Query Tools | 约定本体版本、图谱标签、关系、查询能力 |
| Business Adapter Contract | Business Adapter | Workflow Engine / Handler | 约定业务写入、幂等 key、错误码、补偿策略 |
| Event / Trace Contract | Agent Runtime / Workflow Engine / Business Adapter | Evaluation Repository | 约定 trace、tool call、workflow event、business outcome 的记录格式 |

可以把协同原则总结成七句话：

```text
1. Chat Workstation 只依赖 Workflow Tool API 和 WorkflowPanel DTO，不直接依赖业务 handler。
2. Agent Runtime 只通过 Tool Registry 调用工具，不直接写业务库。
3. Workflow Engine 拥有流程实例状态、WaitingPoint、幂等和恢复语义。
4. Business Capability Repository 提供版本化的 workflow descriptor、tool schema、skill、评测样例和 handler binding。
5. Knowledge Repository 发布 ontology version、projection contract 和 graph query contract。
6. Business Adapter 拥有外部系统写入逻辑，并在 handler 内再次校验权限、状态和幂等。
7. Evaluation Repository 消费 trace、workflow event、tool call 和 business outcome，用于回归与线上质量评估。
```

还要区分“资产存放位置”和“运行时权威”：

```text
BPMN / Workflow 定义可以随业务能力包一起版本化发布，
但流程实例状态、等待点、幂等和恢复语义由 Workflow Engine 负责。

DMN / Rules 可以随业务能力包维护，
但决策执行应由 Rules Engine / Workflow Engine / Policy Service 以受控方式调用。

OWL / Ontology 可以由业务专家维护，
但本体版本、投影契约和图谱查询契约应由 Knowledge Repository 管理。

Business Capability Repository 更像领域能力包，
负责把 Mind、Skill、Tool Schema、Workflow Descriptor、Rule Descriptor、Eval Case 组织在一起。
```

只要这些契约稳定，具体实现可以替换为内部仓库，也可以替换为 Camunda、Temporal、LangGraph、Neo4j、Langfuse 等开源组件。

---

### 11.2 内部实现映射，仅内部读者参考

下面表格只是内部项目中的一个落地映射，不是通用架构的必要组成。如果本文需要对外分享，可以删除本节，保留上一节的通用模块划分和协同契约即可。

| 通用模块 | 内部参考实现 | 说明 |
|---|---|---|
| Chat Workstation | 内部聊天工作台 | 提供聊天入口、会话、WorkflowPanel、WebSocket |
| Agent Runtime | 内部 Agent Kernel | 管理工具快照、policy guard、tool runtime、事件流 |
| Workflow Engine | 内部 Workflow Framework | 管理流程状态、等待点、signal、幂等、恢复 |
| Business Capability Repository | 内部业务能力包 | 沉淀 Mind、Skill、Tools、DMN、BPMN、Ontology |
| Knowledge Repository | 内部本体与投影契约 | 管理 OWL、本体、图谱投影、知识资产 |
| Runtime Orchestrator | 内部事件运行时 | 接事件、派发、调度、执行热路径 |
| Business Worker | 内部业务执行组件 | 消费事件、执行诊断或业务动作 |

注意：这些名称只是内部参考实现，不是通用架构的必要组成。换一个团队，也可以用 Camunda、Temporal、LangGraph、Neo4j、Langfuse 等开源组件组合出类似能力。

---

## 12. 开源框架替代选型

如果不依赖内部项目，可以按能力层选择开源框架。

| 能力需求 | 可选框架 | 适用说明 |
|---|---|---|
| BPMN / 标准流程引擎 | Camunda 7、Camunda 8 / Zeebe、Flowable、Activiti、SpiffWorkflow | 适合需要 BPMN 图、人工任务、流程实例、标准流程治理的场景 |
| Durable Workflow | Temporal、Netflix Conductor、Cadence | 适合长周期、可恢复、代码优先的可靠工作流；不一定强调 BPMN 图 |
| Agent 编排 | LangGraph、Semantic Kernel、AutoGen、CrewAI | 适合 LLM 多步推理、工具调用、Agent 协作；高风险副作用仍应接 Workflow / Policy |
| 低代码自动化 | n8n、Node-RED、Dify Workflow | 适合轻量内部自动化和原型；强审计和复杂状态要谨慎 |
| DMN / 规则引擎 | Camunda DMN、Drools / Kogito、OpenRules、json-rules-engine | 适合规则复杂、需要业务人员可读、需要统一决策表的场景 |
| 图数据库 | Apache AGE、Neo4j、Memgraph、JanusGraph、TypeDB | 适合运行时关系查询、图遍历、关系分析 |
| RDF / OWL / 语义工具 | Apache Jena、RDF4J、GraphDB、Stardog | 适合本体、RDF、OWL、语义推理和 SPARQL 查询 |
| RAG / 向量检索 | LlamaIndex、LangChain、Haystack、pgvector、Qdrant、Weaviate、Milvus | 适合文档检索、语义召回、知识问答 |
| Observability / Eval | Langfuse、LangSmith、OpenTelemetry、Arize Phoenix、TruLens、Ragas、DeepEval | 适合 trace、回放、评测、监控和回归测试 |
| Human-in-the-loop | Temporal Signals / Queries、Camunda User Task、LangGraph Interrupts / Checkpoints | 适合人工确认、审批、暂停恢复 |

简单选型建议：

```text
如果团队重视 BPMN 标准和流程图：优先看 Camunda / Flowable。
如果团队重视代码化、长周期、强恢复：优先看 Temporal。
如果主要是 LLM 工具编排：可以看 LangGraph / Semantic Kernel，但业务副作用仍要接 Policy 和 Workflow。
如果需要图关系查询：可以用 Neo4j / Apache AGE。
如果需要 OWL / RDF 语义资产：不要把 AGE 当 OWL 推理机，应搭配 Jena / RDF4J / GraphDB 等语义工具或投影管道。
如果要做生产级 Agent：Observability / Eval 不是锦上添花，而是基础设施。
```

---

## 13. 示例一：采购申请

采购申请是最适合初学者理解的例子。

用户说：

```text
帮我申请买两台显示器，每台 1200 元。
```

系统链路：

```text
1. LLM 判断这是 purchase_request。
2. LLM 抽取 item_name=显示器、quantity=2、unit_price=1200。
3. 如果 reason 缺失，系统可以追问。
4. 用户补齐后，LLM 调 start_workflow。
5. Workflow Engine 创建采购流程实例。
6. 流程进入 confirm_purchase 等待点。
7. WorkflowPanel 展示采购内容和可选动作。
8. 用户说“确认”。
9. LLM 调 submit_workflow_signal(confirm)。
10. Workflow Engine 校验等待点、权限、幂等。
11. 通过后调用 create_purchase_order handler。
12. Business Adapter 创建采购单。
13. 系统记录 audit log 并展示结果。
```

这个例子的关键不是“LLM 会不会说话”，而是：

```text
LLM 不能直接创建采购单；
它只能把用户意图变成结构化 signal；
真正的创建动作必须发生在流程允许的节点之后。
```

---

## 14. 示例二：工业质量追溯 / SPC / FTA

工业场景比采购更复杂，因为它同时涉及：

```text
实时数据；
历史测量；
设备关系；
故障树；
规则派发；
人工确认；
措施生成；
效果验证。
```

可以用一个“点焊追溯 / SPC 异常 / FTA 根因诊断”的复合例子来理解。

---

### 14.1 只读追溯阶段：适合 Skill 路径

如果任务只是工程师临时查询：

```text
帮我看一下某个车号在某个设备上的点焊测量是否异常。
```

它可以走 Skill 路径：

```text
用户自然语言
  ↓
Mind 限定角色：质量追溯排查员
  ↓
Skill 规定步骤：解析确认 → 拉取判异 → 出图 → 叙述结论
  ↓
工具解析工厂 / 车间 / 设备 / 车号
  ↓
工具查询测量值、邻近样本、baseline、verdict
  ↓
图表工具生成趋势图
  ↓
LLM 基于真实工具结果解释
```

这时 Mind / Skill / Tool 的边界是：

| 资产 | 作用 |
|---|---|
| Mind | 定义这个数字员工是谁、什么时候触发、不能做什么、必须引用哪些证据 |
| Skill | 定义操作 SOP，例如先解析候选，再查测量，再出图，再叙述 |
| Tool | 查询真实数据、计算判异、返回结构化结果 |
| Policy Guard | 限制工具可见性、权限和调用边界 |
| LLM | 负责对话、澄清、解释，不编造测量和结论 |

这条路径适合：

```text
候选澄清；
测量查询；
邻车追溯；
判异陈述；
出图展示；
事实解释。
```

不适合直接做：

```text
修改控制限；
修改设备参数；
关闭工单；
正式下发措施；
绕过人工确认写生产数据。
```

---

### 14.2 处置闭环阶段：应该升级成 Workflow 路径

如果任务从“只读排查”升级成“正式处置闭环”，例如：

```text
创建整改任务；
要求班组确认；
执行措施；
验证首件；
关闭工单；
沉淀诊断结果。
```

就应该进入 Workflow 路径：

```text
异常事件
  ↓
DMN 判断是否派发、派给谁、优先级是什么
  ↓
BPMN / Workflow Engine 创建诊断流程实例
  ↓
Task_LoadContext 自动加载设备、产品、工位上下文
  ↓
Task_QueryMeasurements 自动查询测量值和历史数据
  ↓
Task_QueryFaultTree 查询 AGE 中的故障树候选根因
  ↓
Task_QueryEvidence 查询日志、换料、环境、维修等证据
  ↓
Task_RunPolicyDecision 调 DMN 判断是否需要人审
  ↓
UserTask_ConfirmRootCause 等工程师确认根因
  ↓
Task_GenerateMeasure 生成措施建议
  ↓
UserTask_ApproveMeasure 等负责人确认
  ↓
Task_CreateWorkOrder 创建整改任务
  ↓
Task_VerifyEffect 查询后续数据验证效果
  ↓
Task_CloseCase 或 Task_ReopenDiagnosis
```

这条链路里各资产的关系是：

```text
OWL 定义领域概念和故障树语义；
AGE 承接投影后的运行时图查询；
DMN 判断派发、准入、优先级和是否人审；
BPMN / Workflow 控制节点顺序、等待点、恢复和审计；
Tool / Handler 查询实时事实或执行业务动作；
LLM 负责对话入口、解释和 signal 提交。
```

这样就不会把“知识图谱查询”和“流程状态推进”混在一起。

---

## 15. 评测方法

对话驱动 Agent 工作流必须评测的不只是回答质量。

至少要评测：

```text
1. 意图识别
   - 用户想问问题时，有没有误启动流程？
   - 用户想办事时，有没有漏启动流程？

2. 流程选择
   - 采购、报销、请假、工单、诊断流程是否选对？

3. 参数抽取
   - 物品、数量、金额、时间、原因、设备、车号是否抽对？

4. 信息不足时的追问
   - 缺关键字段时，是否先问用户而不是乱填？

5. 工具调用
   - 是否调用了正确工具？
   - 参数 schema 是否正确？
   - 是否调用了未授权工具？

6. 等待点处理
   - 用户说“确认”时是否提交给正确 waiting point？
   - 多流程等待时是否反问？

7. 安全边界
   - 是否试图绕过确认？
   - 是否试图直接写业务数据？
   - 是否泄露不该暴露的信息？

8. 可靠性
   - 重复提交是否幂等？
   - worker 崩溃后是否可恢复？
   - 外部系统超时后是否有补偿或重试？

9. 业务结果
   - 流程是否成功完成？
   - 是否重复创建单据？
   - 是否产生正确审计记录？
```

一个最小评测集可以包括：

```text
自由问答样例 20 条；
明确办事样例 30 条；
信息缺失样例 20 条；
多流程歧义样例 10 条；
拒绝 / 取消样例 10 条；
恶意绕过确认样例 10 条；
恢复 / 重试样例 10 条。
```

需要特别注意：

```text
框架跑通 ≠ 模型真的稳定会用。
```

自动化测试可以证明流程引擎、工具、幂等和恢复逻辑正确；但真实模型是否能稳定识别意图、选对工具、抽对参数，需要用真实模型、真实提示词和标注样本单独评测。

---

## 16. 对知识复利工程师的意义

对话驱动 Agent 工作流，是知识复利从“问答系统”走向“业务执行系统”的关键桥梁。

普通 RAG 解决的是：

```text
能不能找到知识并回答问题。
```

Agent + Tools 解决的是：

```text
能不能基于知识调用工具完成任务片段。
```

Workflow + Human-in-the-loop 进一步解决：

```text
完成任务时能不能可靠、可控、可恢复、可审计。
```

所以它在知识复利系统里的位置是：

```text
知识工程：决定沉淀什么；
RAG：决定怎么找知识；
Prompt / Skill：决定模型如何理解任务；
Agent Runtime：决定模型如何调用工具；
Workflow：决定任务怎么推进；
Harness / Policy：决定权限、状态、日志、人工确认；
Evaluation：决定系统是否真的有效。
```

学习顺序建议：

```text
1. 先理解工具调用：模型如何调用一个函数；
2. 再理解状态机：流程为什么要有固定状态；
3. 再理解 human-in-the-loop：为什么关键步骤要等人确认；
4. 再理解 WaitingPoint：确认不是一句文本，而是结构化状态；
5. 再理解幂等：为什么重复确认不能重复执行；
6. 再理解 WorkflowSnapshot：为什么流程要能恢复；
7. 再理解 Tool Governance：为什么工具需要权限、快照和 policy；
8. 再理解 DMN / BPMN / OWL / AGE：规则、流程、语义和图谱分别解决什么；
9. 最后理解多仓库协同：UI、Agent、Workflow、Business、Knowledge、Eval 如何分工。
```

---

## 17. 最终原则

对话驱动 Agent 工作流的本质是：

```text
对话作为入口，
模型作为解释器，
工具作为边界，
工作流作为裁判，
人类作为关键决策者，
业务系统作为最终事实源。
```

它避免两个极端：

```text
极端 1：把 LLM 当流程引擎
结果：不可控、不可审计、容易跳步。

极端 2：把 workflow 做成传统表单
结果：用户体验差，Agent 价值发挥不出来。
```

比较好的中间路线是：

```text
Conversational UI
  + Agent Runtime
  + Tool Governance
  + Workflow Engine
  + Human-in-the-loop
  + Business Adapter
  + Observability / Evaluation
```

最终判断：

> 企业级 Agent 的关键，不是让模型“自由办事”，而是让模型在确定性流程、权限、工具和人工确认的边界内，帮助用户更低成本地完成业务。
