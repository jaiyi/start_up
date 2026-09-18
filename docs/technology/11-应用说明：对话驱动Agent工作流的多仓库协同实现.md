# 11 · 应用说明：对话驱动 Agent 工作流的多仓库协同实现

> 目标：把“对话驱动 Agent 工作流”从一个抽象概念，拆成可以理解、可以实现、可以评测的工程架构。本文参考 `workstation-iclaw` 的对话工作台 / AgentKernel 实现，以及 `lads` 中 FixedWorkflow / workflow framework 的设计，说明多个仓库如何协同完成“用户在聊天框里办业务，但流程仍然确定、可控、可恢复、可审计”。

---

## 1. 先用一句话说明它是什么

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

---

## 2. 它解决什么问题

传统业务系统常见入口是表单、菜单和审批页。它的问题是：

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

但这里有一个风险：

```text
大模型不能被允许自己跳过审批；
不能自己编造一个不存在的流程；
不能金额还没确认就直接下单；
不能用用户没有授权的身份调用系统；
不能因为听错一句话就写入业务数据。
```

所以这个系统的核心价值是：

```text
自然语言体验 + 确定性流程控制
```

而不是单纯的聊天机器人。

---

## 3. 初学者可以先记住这个类比

可以把它理解成一个“会说话的办事大厅”。

```text
聊天框：前台接待员
大模型：听懂用户意思的人
工具：前台能调用的办事按钮
流程目录：办事大厅有哪些业务
FixedWorkflow：政府大厅背后的办事规则
WaitingPoint：需要本人签字确认的窗口
业务系统：真正落库、发单、审批的后台系统
WorkflowPanel：大厅屏幕上显示当前排到哪一步
审计日志：每一步办理记录
```

前台接待员可以帮你理解需求、填写材料、递交申请。

但它不能：

```text
私自改审批规则；
绕过签字；
替你冒充领导审批；
在材料不完整时强行办结。
```

---

## 4. 总体架构：七层模型

一个成熟的对话驱动 Agent 工作流，可以分成七层。

```text
L1 用户交互层
L2 Agent 对话编排层
L3 AgentKernel 工具治理层
L4 Workflow Gateway 层
L5 FixedWorkflow 引擎层
L6 Business Adapter 层
L7 Evaluation / Observability 层
```

展开看：

```text
用户
  ↓
L1 Workstation UI
  - ChatPane
  - WorkflowPanel
  - SessionList
  - Pending Tasks
  ↓
L2 Agent 对话编排层
  - Prompt
  - Tool Choice
  - Context
  - Conversation Memory
  ↓
L3 AgentKernel 工具治理层
  - Preset
  - Tool Snapshot
  - Policy Guard
  - ToolRuntime
  - Event Stream
  ↓
L4 Workflow Gateway
  - Workflow Directory
  - Schema Query
  - Instance Resolution
  - WaitingPoint Resolution
  - Signal Submission
  ↓
L5 FixedWorkflow Engine
  - WorkflowDefinition
  - State Machine
  - Branch Rule
  - WaitingPoint
  - Snapshot
  - Idempotency
  - Recovery
  ↓
L6 Business Adapter
  - ERP
  - CRM
  - 工单系统
  - 采购系统
  - 报销系统
  - 数据库台账
  ↓
L7 Evaluation / Observability
  - Trace
  - Metrics
  - Replay
  - Regression
  - Human Review
```

这个分层的好处是：

```text
模型层只负责理解和调用工具；
工具治理层负责判断模型能不能调用；
工作流层负责判断流程能不能推进；
业务层负责真正执行副作用；
评测层负责判断系统是否真的可靠。
```

---

## 5. 多仓库协同方式

参考现有实现，可以把多个仓库的职责拆成这样。

### 5.1 Workstation / Chat App 仓库

类似：

```text
/Users/lijiayi/lianshan/agent/workstation-iclaw
```

主要职责：

```text
用户登录；
Agent 列表；
聊天入口；
WebSocket；
工作台页面；
工具调用展示；
工作流状态面板；
AgentKernel runtime；
工具权限策略；
session event stream。
```

它不应该主责：

```text
具体业务流程怎么分支；
业务状态机怎么推进；
最终业务数据怎么写入；
审批规则如何被执行。
```

它更像“AI 办事入口”和“工作台壳”。

---

### 5.2 Workflow Engine 仓库

类似：

```text
/Users/lijiayi/lianshan/agent/lads
```

主要职责：

```text
流程定义；
流程编译校验；
流程实例；
固定状态机；
等待点；
人工 signal；
幂等；
恢复；
状态快照；
流程版本；
handler 调度。
```

它不应该主责：

```text
聊天 UI；
LLM prompt；
自然语言理解；
前端工作台交互。
```

它更像“确定性流程裁判”。

---

### 5.3 Business Adapter 仓库 / 模块

主要职责：

```text
采购单创建；
报销单提交；
请假系统对接；
CRM 更新；
ERP 写入；
设备参数下发；
工单系统同步。
```

关键原则：

```text
LLM 不应该直接调用最终写业务数据的接口。
```

正确方式是：

```text
LLM 提交 signal；
Workflow Engine 校验状态和权限；
确认通过后，Workflow Engine 在正确步骤调用 Business Adapter。
```

---

### 5.4 Knowledge / RAG 仓库

主要职责：

```text
制度解释；
流程说明；
字段含义；
历史案例；
FAQ；
政策依据；
操作指南。
```

它帮助 Agent 回答：

```text
采购和报销有什么区别？
为什么这个金额需要审批？
现在为什么停在确认节点？
这个字段应该怎么填？
```

但它不决定流程状态。

---

### 5.5 Evaluation / Observability 仓库或模块

主要职责：

```text
意图识别准确率；
工具调用正确率；
参数抽取准确率；
流程推进成功率；
误触发率；
漏触发率；
人工接管率；
异常恢复率；
真实模型回归测试。
```

这层非常重要，因为：

```text
框架跑通 ≠ 模型真的稳定会用。
```

必须单独验证真实模型在真实表达下的表现。

---

## 6. `workstation-iclaw` 里的两条实现路径

`workstation-iclaw` 里实际有两套与 mixed chat / 对话驱动工作流相关的机制。

---

### 6.1 legacy RD workflow：工作台桥接模式

这条路径主要服务研发决策工作台。

整体链路是：

```text
Workstation UI
  ↓
/ws/chat/{agent_id}
  ↓
legacy LLM + tools
  ↓
advance_rd_workflow
  ↓
demos-rd-decision stateless panel provider
  ↓
返回 workflow_panel
  ↓
前端刷新 WorkflowPanel
```

关键特点：

```text
1. 前端有三栏式 Workstation。
2. 聊天仍复用普通 Agent WebSocket。
3. 是否推进流程主要依赖 LLM tool choice。
4. advance_rd_workflow 是专用工具。
5. workflow 状态主要来自外部 panel provider。
6. 前端会把 current_gate 作为 workflow_gate 发给后端。
```

它的优点是：

```text
产品体验清楚；
同一个聊天框可以问答和推进；
流程状态可视化；
接线简单；
适合原型验证。
```

它的局限是：

```text
流程引擎能力不完整；
状态主要依赖外部 stateless panel；
工具比较专用；
真实模型是否稳定调用工具还要单独评测。
```

---

### 6.2 AgentKernel / event_authoritative：新一代受控 Agent Runtime

这条路径更像严肃企业 Agent 底座。

WebSocket 会按 session 类型分流：

```text
/ws/chat/{agent_id}
  ↓
如果 session.migration_state == "event_authoritative"
  → 走 AgentKernel
否则
  → 走 legacy LLM + tools
```

AgentKernel 的核心链路是：

```text
POST /api/agents/{agent_id}/sessions with preset_id
  ↓
创建 event_authoritative session
  ↓
绑定 preset_id / preset_version / dsproject / project_revision
  ↓
pin tool snapshot
  ↓
用户通过 WebSocket 发消息
  ↓
SessionCoordinator.submit()
  ↓
DefaultAgentLoop.run_turn()
  ↓
准备 prompt
  ↓
LLM 输出自然语言或 tool calls
  ↓
ToolRuntime.execute()
  ↓
Policy Guard 校验
  ↓
Provider 执行工具
  ↓
record tool result event
  ↓
commit assistant message / turn.completed
```

它比 legacy 路径更强的地方在于：

```text
1. session 事件流权威；
2. 工具 snapshot 在 session 创建时固定；
3. 模型只能看到 preset 允许的工具；
4. 每次工具调用都经过 policy guard；
5. policy fail-closed；
6. 工具 schema、project revision、tenant、user、agent 都可以校验；
7. 工具调用和结果都可记录、审计、回放。
```

如果要做企业级 Agent 工作流，AgentKernel 更适合作为工具治理层。

---

## 7. `lads` 里的 FixedWorkflow 实现

`lads` 里的 FixedOptimizationWorkflow 是“确定性流程引擎”的参考实现。

核心思想：

```text
流程骨架固定；
步骤顺序固定；
分支条件固定；
等待点固定；
每一步业务 handler 可插拔；
状态快照可持久化；
外部事件可以恢复流程。
```

它不是让模型决定下一步，而是由 `_next_phase()` 决定。

例如：

```text
RECOMMEND_PARAMS
  如果允许下发 → CHECK_DEVICE_STATUS
  否则 → FEEDBACK

CONFIRM_DISPATCH
  如果 confirm → DISPATCH_RESULT
  否则 → FEEDBACK

FEEDBACK
  如果 order_closed → COMPLETED
  否则 → ADVANCE_ROUND

CONTINUE_OR_ABORT
  continue → RECOMMEND_PARAMS
  adjust → CONFIRM_MANUAL_ADJUSTMENT
  abort → COMPLETED
```

这说明：

```text
模型可以提交 confirm / reject / continue / abort，
但不能自己发明下一步。
```

---

## 8. FixedWorkflow 的关键对象

### 8.1 WorkflowPhase

表示流程阶段。

例如：

```text
DATA_AWARENESS
RECOMMEND_PARAMS
CONFIRM_DISPATCH
FEEDBACK
COMPLETED
```

---

### 8.2 WorkflowStep

表示每个阶段绑定的执行单元。

包含：

```text
phase
operation
name
form_key
```

例如：

```text
CONFIRM_DISPATCH → decision.confirm_dispatch
```

---

### 8.3 StepOutcome

表示一个步骤执行后的结果。

常见结果：

```text
completed：这一步完成，可以继续推进；
waiting：需要人工输入，流程暂停；
failed：执行失败，流程进入失败态。
```

---

### 8.4 WaitingPoint

表示“现在需要人做决定”。

应该包含：

```text
等待点 ID；
当前步骤；
提示文案；
表单 schema；
允许动作；
上下文数据。
```

它是对话驱动工作流里最重要的对象之一。

如果没有结构化 WaitingPoint，用户下次说“确认”，系统就不知道确认的是哪个流程、哪个步骤。

---

### 8.5 WorkflowSnapshot

表示流程当前状态快照。

通常包含：

```text
session_id；
phase；
status；
data；
waiting_point；
history；
last_event_id；
version；
message。
```

它用于：

```text
状态展示；
断点恢复；
审计；
幂等判断；
前端 panel 投影。
```

---

## 9. 模型、AgentKernel、FixedWorkflow 的权责边界

这是整套架构最关键的部分。

### 9.1 模型能做什么

模型可以：

```text
理解用户自然语言；
判断用户是在问问题还是想办事；
选择合适工具；
提取参数；
发现信息不足并追问；
替用户提交确认 / 拒绝 / 选择；
解释当前流程状态。
```

---

### 9.2 模型不能做什么

模型不能：

```text
修改流程定义；
跳过等待人工确认；
自己指定流程版本；
伪造用户身份；
绕过权限；
绕过 Workflow Engine 直接写业务数据；
在多个流程等待时替用户猜测确认哪个；
编造不存在的工具或流程。
```

---

### 9.3 AgentKernel 负责什么

AgentKernel 负责：

```text
这个 session 能看到哪些工具；
工具 schema 是否是创建 session 时固定的版本；
当前用户、tenant、agent、project 是否有权调用；
工具调用是否符合 policy；
工具调用与结果是否被记录；
失败是否 fail-closed。
```

一句话：

```text
AgentKernel 是工具调用门禁。
```

---

### 9.4 FixedWorkflow 负责什么

FixedWorkflow 负责：

```text
当前流程处于什么状态；
当前 signal 能不能被接受；
下一步应该走哪里；
是否需要等待人工；
是否已经完成；
是否重复提交；
是否可以恢复；
什么时候执行业务副作用。
```

一句话：

```text
FixedWorkflow 是业务流程裁判。
```

---

## 10. 一次“确认”是怎么被安全执行的

用户说：

```text
确认
```

系统不应该直接执行“确认后的业务动作”。

正确链路是：

```text
1. Chat 收到“确认”
2. AgentKernel 记录 user.message event
3. LLM 判断需要调用 submit_workflow_signal
4. ToolRuntime 校验工具是否可见
5. Policy Guard 校验用户、tenant、project、工具 schema
6. Workflow Gateway 查找当前 conversation 下的 WAITING workflow
7. 如果只有一个 waiting point，构造 confirm signal
8. 如果多个 waiting point，返回选项让用户明确选择
9. FixedWorkflow 加载 WorkflowSnapshot
10. 检查当前状态是否真的是 WAITING
11. 检查 confirm 是否在 allowed_actions 里
12. 检查 event_id 是否重复
13. 推进到下一步
14. 如果下一步是业务副作用，由 handler 执行
15. 保存新 snapshot
16. 返回 WorkflowPanel
17. 前端刷新状态
```

这条链路说明：

```text
“确认”这句话只是入口；
真正的确认动作由工具、策略、引擎和状态共同校验。
```

---

## 11. 为什么不能只靠 Prompt 约束

很多初学者会觉得：

```text
我在系统提示词里告诉模型“不要跳过确认”，是不是就够了？
```

不够。

因为 Prompt 是软约束，模型可能：

```text
理解错；
上下文丢失；
被用户诱导；
遇到复杂表达时误判；
工具选择错误；
生成看似合理但不合规的参数。
```

所以真正可靠的设计必须是：

```text
Prompt 提醒模型；
Tool Schema 限制输入；
Policy Guard 限制调用；
Workflow Engine 限制状态转移；
Business Handler 限制副作用；
Audit Log 记录结果。
```

这叫多重防线。

---

## 12. “配置即接入”应该怎么理解

你提到的理想是：

```text
新增一个流程 = 加一个配置文件 + 注册表一行。
```

这个方向是对的，但需要区分“可配置”和“不可随便配置”。

---

### 12.1 可以配置的部分

可以放在配置里的内容：

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

---

### 12.2 不应该完全交给配置的部分

不应该只靠配置或模型决定的内容：

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

## 13. 理想工具集设计

不要给每个流程都写一个专用工具，例如：

```text
advance_purchase_workflow
advance_expense_workflow
advance_leave_workflow
advance_rd_workflow
```

这样流程一多，工具会膨胀，Prompt 也会失控。

更好的方式是一组通用 workflow tools：

```text
list_workflows
get_workflow_detail
start_workflow
update_workflow_inputs
get_workflow_status
submit_workflow_signal
cancel_workflow
explain_workflow_state
```

---

### 13.1 list_workflows

用途：

```text
查询当前用户可用流程目录。
```

返回：

```text
workflow_key；
name；
summary_for_llm；
required_roles；
是否可启动。
```

---

### 13.2 get_workflow_detail

用途：

```text
按需查询某个流程的详细参数要求。
```

这样系统提示词里只需要放每个流程一行摘要，不需要把所有流程字段都塞进去。

---

### 13.3 start_workflow

用途：

```text
创建流程实例。
```

输入：

```text
workflow_key；
workflow_version；
initial_inputs；
idempotency_key。
```

它不能直接产生最终业务副作用，只能启动流程并推进到第一个等待点或自动步骤。

---

### 13.4 submit_workflow_signal

用途：

```text
向某个等待点提交 signal。
```

例如：

```text
confirm；
reject；
select_option；
submit_form；
cancel。
```

这是用户说“确认”时最常用的工具。

---

### 13.5 get_workflow_status

用途：

```text
查询当前流程状态、等待点、历史记录和可用动作。
```

它帮助模型在不确定时先查状态，而不是瞎猜。

---

### 13.6 explain_workflow_state

用途：

```text
把结构化流程状态翻译成用户能听懂的话。
```

例如：

```text
“现在停在预算确认节点，因为总金额超过 2000 元，需要你确认采购理由和金额。”
```

---

## 14. 多流程同时等待时怎么办

这是对话驱动流程里非常容易出错的场景。

假设当前用户有两个流程都在 WAITING：

```text
采购申请 A：等待确认购买显示器
报销申请 B：等待确认报销打车费
```

用户只说：

```text
确认
```

系统不能随便替用户确认其中一个。

正确策略：

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

## 15. 幂等与恢复为什么是刚需

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

`lads` 的 FixedWorkflow 里有一个重要做法：

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

## 16. WorkflowPanel 为什么重要

如果只有聊天文本，用户很难知道：

```text
流程走到哪一步；
还有哪些待办；
刚才“确认”到底确认了什么；
下一步会不会写业务数据；
系统有没有真的执行成功。
```

所以应该有结构化面板：

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

这也是 `workstation-iclaw` 的 Workstation 设计值得参考的地方。

---

## 17. 评测应该怎么做

对话驱动 Agent 工作流必须评测的不只是回答质量。

至少要评测：

```text
1. 意图识别
   - 用户想问问题时，有没有误启动流程？
   - 用户想办事时，有没有漏启动流程？

2. 流程选择
   - 采购、报销、请假、工单是否选对？

3. 参数抽取
   - 物品、数量、金额、时间、原因是否抽对？

4. 信息不足时的追问
   - 缺关键字段时，是否先问用户而不是乱填？

5. 工具调用
   - 是否调用了正确工具？
   - 参数 schema 是否正确？

6. 等待点处理
   - 用户说“确认”时是否提交给正确 waiting point？
   - 多流程等待时是否反问？

7. 安全边界
   - 是否试图绕过确认？
   - 是否调用未授权工具？

8. 业务结果
   - 流程是否成功完成？
   - 是否重复创建单据？
   - 是否可恢复？
```

一个最小评测集可以包括：

```text
自由问答样例 20 条；
明确办事样例 30 条；
信息缺失样例 20 条；
多流程歧义样例 10 条；
拒绝 / 取消样例 10 条；
恶意绕过确认样例 10 条。
```

---

## 18. 对知识复利工程师的意义

对话驱动 Agent 工作流，实际上是知识复利从“问答系统”走向“业务执行系统”的关键桥梁。

普通 RAG 解决的是：

```text
能不能找到知识并回答问题。
```

Agent Workflow 解决的是：

```text
能不能基于知识完成任务。
```

FixedWorkflow + Human-in-the-loop 进一步解决：

```text
完成任务时能不能可靠、可控、可审计。
```

所以它在知识复利系统里的位置是：

```text
知识工程：决定沉淀什么；
RAG：决定怎么找知识；
Prompt：决定怎么表达任务；
Agent：决定怎么调用工具；
Workflow：决定任务怎么推进；
Harness：决定权限、状态、日志、人工确认；
评测：决定系统是否真的有效。
```

---

## 19. 初学者学习顺序

如果你是初学者，不建议一开始就研究复杂 BPMN 或 AgentKernel 细节。

可以按这个顺序学：

```text
1. 先理解工具调用：模型如何调用一个函数；
2. 再理解状态机：流程为什么要有固定状态；
3. 再理解 human-in-the-loop：为什么关键步骤要等人确认；
4. 再理解 WaitingPoint：确认不是一句文本，而是结构化状态；
5. 再理解幂等：为什么重复确认不能重复下单；
6. 再理解 WorkflowSnapshot：为什么流程要能恢复；
7. 再理解 AgentKernel：为什么工具需要权限、快照和 policy；
8. 最后理解多仓库协同：UI、Agent、Workflow、Business、Eval 如何分工。
```

---

## 20. 最终判断

对话驱动 Agent 工作流的本质是：

```text
对话作为入口，
模型作为解释器，
工具作为边界，
工作流作为裁判，
人类作为关键决策者，
业务系统作为最终执行者。
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
Mixed Chat
  + AgentKernel
  + FixedWorkflow
  + Human-in-the-loop
  + WorkflowPanel
  + Evaluation
```

这也是企业级 Agent 从“会聊天”走向“能可靠办事”的关键路径。
