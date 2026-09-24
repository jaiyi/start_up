# DeepSeek Harness Demo 实现原理与插件机制拆解

## 0. 结论先行

`/Users/lijiayi/lianshan/agent/deepseek-harness` 不是一个单纯的聊天 demo，而是一个把 **固定工作流、Agent 对话、工具权限、状态恢复、人工确认、长期记忆和 Skill 演进** 串起来的 Agent Runtime 原型。

从软件架构师和资深 Agent 工程师视角看，它最值得借鉴的不是某个单点功能，而是下面这套分层思想：

```text
业务对话 / AgentLoop
  ↓
受控 Tool / Conversation Facade
  ↓
可信身份绑定的 Workflow Provider
  ↓
宿主无关 Fixed Workflow Core
  ↓
Executor SPI
  ↓
Function / HTTP / Script / Subworkflow / Wait Signal / DSH Agent
  ↓
持久化 Store / Outbox / Receipt / Lease / Reconciliation
```

对于航天 CAE Agent，最有价值的启发是：

1. **自由对话和高风险流程必须分离**：工程师可以自由咨询规范、历史案例和仿真经验，但启动 solver、提交工况、确认裕度、发布报告必须走固定 workflow 和人审节点。
2. **Agent 不能直接拥有底层能力**：模型不应直接拿到 shell、solver CLI、HPC API、材料库写权限或报告发布接口，只能通过受控工具门面发起有限动作。
3. **workflow definition 不是 LLM 动态生成物**：高风险工程流程应由工程团队版本化定义、编译、校验、发布，Agent 只能选择和填写参数。
4. **幂等、receipt、outbox、lease、fencing、manual reconciliation 是生产级 Harness 的核心能力**：它们比“模型能不能调用工具”更重要。
5. **长期记忆和 Skill 演进必须默认人工发布**：CAE 经验可以沉淀为候选记忆、候选 checklist、候选诊断 Skill，但不能自动改变正式仿真流程或扩大权限。

一句话概括：

```text
这个 demo 的核心价值，是展示了如何把“一个会聊天的 Agent”约束进“可版本化、可恢复、可审计、可人审的任务执行控制面”。
```

---

## 1. 分析对象与边界

本文分析对象是本地 demo：

```text
/Users/lijiayi/lianshan/agent/deepseek-harness
```

需要注意三点：

1. 仓库目录名为 `pluggins`，不是常见拼写 `plugins`；本文保留原目录名，描述概念时仍使用“插件”。
2. 这是本地 demo / runtime 原型，不等同于已验证的企业生产发行版。
3. 本文重点分析本地代码和文档，不把它推断为 DeepSeek Harness 官方最终产品能力。

---

## 2. Demo 的整体工程结构

仓库可以分为三层。

### 2.1 Core packages：宿主无关的 Fixed Workflow Runtime

```text
packages/
├── contracts/             # 公共契约；Service、Executor、Store、Definition 类型
├── definition-compiler/   # workflow definition 严格编译、digest、能力校验
├── engine-default/        # 确定性状态机 transition
├── runtime/               # Service、Outbox、恢复、等待、取消、父子流程协调
├── assembly/              # 组合根；Catalog、Store、平台能力、schema validator
├── executor-function/     # 受控函数执行器
├── executor-http/         # HTTP 执行器
├── executor-script/       # 受控脚本执行器
└── executor-subworkflow/  # 子流程执行器
```

这一层不依赖 DSH、Cordis、AgentLoop 或 LangGraph。它的目标是提供一个 **宿主无关、确定性、可恢复的固定工作流运行时**。

### 2.2 DSH fixed workflow plugins：接入 DSH / Cordis 宿主

```text
pluggins/dsh-fixed-workflow/
├── packages/dsh-fixed-workflow
├── packages/dsh-fixed-workflow-provider
├── packages/dsh-tool-fixed-workflow
├── packages/dsh-fixed-workflow-conversation
└── packages/dsh-executor-agent
```

这一层是适配层，负责把 Core Runtime 包装成 DSH 宿主里的 Service、Tool、Conversation Facade 和 Agent Executor。

关键点是：

```text
Core 不依赖 DSH；
DSH 通过插件接入 Core。
```

这能避免把业务工作流运行时写死在某个 Agent 宿主框架里。

### 2.3 Memory Evolution plugins：长期记忆与 Skill 演进

```text
pluggins/dsh-memory-evolution/
pluggins/dsh-memory-evolution-web/
```

这部分提供长期记忆整理、候选 Skill 生成、人工审批发布、WebUI 管理和本地 loopback 管理入口。

它不依赖 Fixed Workflow Core，也不自动改造混合对话示例。这个解耦很重要：

```text
Workflow 控制“当前任务如何执行”；
Memory Evolution 控制“历史经验如何沉淀”；
二者不应该强耦合。
```

---

## 3. Fixed Workflow Core 的实现原理

### 3.1 Workflow Definition：固定拓扑，而非自由计划

Core 接受的是版本化 workflow definition，不是模型即时生成的自由计划。

Definition 包含：

- schemaVersion；
- workflow id / version；
- input schema；
- variables schema；
- output schema；
- start step；
- steps；
- terminals；
- step executor config；
- step transitions；
- retry / timeout / condition 等有限控制流。

Compiler 会执行严格校验：

- 拒绝未知字段；
- 校验 step 数量；
- 校验 executor 是否注册；
- 校验 executor config schema；
- 校验 input / output / variables schema；
- 校验条件表达式引用范围；
- 校验 retry、timeout、backoff 上限；
- 校验子流程引用和静态依赖；
- 生成 definition digest 和 plan digest；
- deep freeze 编译产物。

这意味着 workflow definition 是一个可审查、可发布、可复现的工程制品。

对航天 CAE 的启发是：

```text
CAE 仿真流程不应由 LLM 临场自由规划，
而应由工程团队发布固定版本：
model_check → plan_review → solver_run → postprocess → margin → vnv_review → report_review。
```

Agent 可以选择流程、补齐参数、解释状态，但不应绕过流程拓扑。

### 3.2 Engine：纯状态转移，不直接做副作用

`engine-default` 的核心是 `transition(input)`。它根据当前 run state 和事件生成：

- nextState；
- commands；
- events。

它处理：

- run-created；
- step-succeeded；
- step-failed；
- step-waiting；
- step-resumed；
- step-timeout；
- cancel-requested；
- cancel-acknowledged；
- terminal completed / failed / cancelled。

Engine 自身不调用 HTTP、不跑脚本、不操作数据库之外的外部系统。这是典型的确定性控制流内核。

对 CAE 来说，应保持同样边界：

```text
状态机决定下一步是否可以 run solver；
真正提交 solver 的动作由 executor / Temporal Activity / CAE Adapter 执行。
```

### 3.3 Runtime：Service、Outbox、Lease、Receipt、Signal

`FixedWorkflowRuntime` 实现了面向外部的服务接口：

- list / describe；
- prepare；
- start；
- getRun；
- awaitResult；
- listEvents；
- listPendingActions；
- signal；
- cancel；
- reconcile。

它的典型执行链路是：

```text
1. catalog resolve workflow definition
2. prepare 校验 inputs，缺参则返回 needs-input
3. start 校验 subject / idempotencyKey / deadline
4. 查询 start receipt，确保幂等重放
5. 校验 executor capability 与 config
6. 创建 run state、events、outbox、receipt
7. worker drain outbox
8. dispatch execute / resume / timer / cancel / publish-event
9. 执行前持久化 operation intent
10. executor 返回 succeeded / failed / waiting
11. commit state、events、outbox、receipt
12. waiting 状态通过 signal 恢复
13. 不确定副作用进入 manual reconciliation
```

这里最关键的不是“能启动一个工作流”，而是它把容易出问题的生产语义显式化了：

| 生产问题 | Core 里的机制 |
|---|---|
| 重复点击 / 重试导致重复创建 | idempotencyKey + start receipt |
| signal 重复提交 | eventId + signal receipt |
| worker 崩溃 | outbox + persisted operation intent |
| 多 worker 竞争 | lease + fencing token + revision |
| 外部副作用不确定 | manual reconciliation |
| workflow 定义升级 | run 钉住 definition digest / plan |
| 等待人工输入 | pending action + waitToken + signalSchema |
| 跨进程恢复 | SQLite store + receipts + continuation |

这些能力对于航天 CAE 是刚需。solver 提交、后处理、报告生成都可能耗时很长，而且失败场景复杂，不能靠一次同步 tool call 解决。

---

## 4. Executor 边界设计

Core 通过 `StepExecutor` SPI 接入外部能力。demo 里已有几类执行器。

### 4.1 Function Executor

适合执行宿主内已注册的确定性函数，例如：

- 读取业务配置；
- 查询审批策略；
- 做简单 deterministic calculation；
- 写入示例业务账本。

对 CAE 来说，可用于：

- 读取 case metadata；
- 校验工况字段完整性；
- 计算简单派生字段；
- 生成 deterministic checklist。

### 4.2 HTTP Executor

HTTP executor 通过平台能力发起网络请求，但平台能力默认 deny-by-default，只允许精确 origin allowlist，并禁止 redirect。

更重要的是，credential 通过 `credentialRef` / 可信 resolver 注入，而不是把 token 放进 workflow definition 或模型参数。

对 CAE 来说，HTTP executor 可以面向：

- 内部材料库 API；
- CAE Adapter API；
- HPC job gateway；
- PLM / PDM 查询接口；
- 报告服务。

但需要强调：origin allowlist 不是网络沙箱。生产部署还需要 VPC、API Gateway、服务账号、RBAC、审计网关等基础设施约束。

### 4.3 Script Executor

Script executor 不是任意 shell。它只允许选择可信宿主配置的 command alias：

- executable 必须是可信绝对路径；
- cwd 必须在 allowlist；
- args 必须通过同步 validator；
- 默认不继承父进程环境；
- shell=false；
- 限制 timeout 和输出大小；
- 默认不是恶意代码沙箱。

对 CAE 来说，这个模式非常关键，因为 solver batch run 很容易被误做成“让模型拼一个命令行”。正确做法应该是：

```text
模型 / Agent 不能提供任意命令；
它只能选择 run_nastran_static_v1 这类受控 alias，
并提交经过 schema 校验的参数。
```

更推荐的生产路径是：

```text
Workflow Executor / Tool
  ↓
Temporal Activity
  ↓
CAE Adapter
  ↓
受控 solver command alias / HPC API
```

也就是说，script executor 的 alias 思想值得借鉴，但航天 CAE 不应把它当成完整的生产隔离层。

### 4.4 Subworkflow Executor

子流程执行器支持固定引用的子 workflow。Compiler 会解析和校验子流程引用，避免动态拓扑和静态循环。

对 CAE 来说，可以拆成：

```text
case_workflow
├── model_check_subworkflow
├── solver_subworkflow
├── postprocess_subworkflow
├── margin_subworkflow
└── report_subworkflow
```

不过 CAE 的长任务和大量文件副作用更适合让 Temporal 承担可靠执行。FixedWorkflow 可以作为 Harness 侧的业务状态控制面，Temporal 作为 solver/postprocess/report 的执行引擎。

### 4.5 Wait Signal Executor

Wait signal 负责等待人工输入或外部事件。它有 signalSchema、waitToken、eventId 和 pending action。

这与航天 CAE 的人审节点高度匹配：

- 仿真计划批准；
- 工况矩阵确认；
- 材料许用值确认；
- solver warning 是否接受；
- 裕度结果复核；
- 报告发布审批。

### 4.6 DSH Agent Executor

`dsh-executor-agent` 把一个 DSH Agent session 包装成 workflow step executor。它的协议非常明确：模型必须只输出一个 JSON 对象：

```json
{"status":"succeeded","output":{"answer":42}}
{"status":"waiting","title":"请提供答案","signalSchema":{"type":"string"}}
{"status":"failed","error":{"code":"DECLINED","message":"无法完成"}}
```

它还处理：

- provider / model / prompt / maxTurns / timeoutMs / maxTokens / maxSteps；
- session create / resume；
- continuation 持久化；
- result replay；
- flush session 后再发布 continuation；
- JSON 输出解析；
- 非有限数字拒绝；
- max output bytes；
- manual-reconcile redelivery safety。

对 CAE 来说，这个 executor 可以借鉴为“专家子 Agent step”，例如：

- Solver Diagnosis Expert；
- V&V Review Expert；
- Report Revision Expert。

但它不应参与安全关键的数值事实生成。节点应输出审查意见、解释和待确认问题，不应直接输出正式裕度或替代确定性后处理。

---

## 5. DSH Fixed Workflow 插件机制详解

`pluggins/dsh-fixed-workflow` 下的五包体现了很清晰的插件边界。

### 5.1 `dsh-fixed-workflow`：Service 抽象层

它定义 `FixedWorkflowService extends Service`，提供：

```text
ctx.fixedWorkflows.forCaller(caller)
ctx.fixedWorkflows.forAgent(agent)
```

这一层只定义抽象，不拥有 Core Runtime，也不决定权限。它的价值是让下游插件都依赖统一服务接口，而不是直接引用某个具体 runtime 实例。

### 5.2 `dsh-fixed-workflow-provider`：可信身份绑定与生命周期

Provider 的职责包括：

- 要求可信 `bind(caller)`；
- 要求可信 `callerForAgent(agent)`；
- 检查 trusted subject；
- 为 start / signal / cancel 注入 subject；
- admission fencing；
- in-flight calls tracking；
- lifecycle cleanup；
- 支持 external-runtime / embedded-drain / embedded-cancel 三种所有权。

关键安全点是：

```text
subject 由可信宿主注入，模型不能自填 subject。
```

这对任何企业 Agent 都非常重要。航天 CAE 里也不能让模型说“我是项目负责人”或者“我是审签人”。主体必须来自登录态、组织权限系统或可信 session binding。

### 5.3 `dsh-tool-fixed-workflow`：暴露给 Agent 的受控工具

该插件注册三个工具：

```text
fixed_workflow_start
fixed_workflow_signal
fixed_workflow_status
```

它的安全设计包括：

- 显式拒绝 extra args；
- start 要求 workflowId + version/versionRange + inputs + idempotencyKey；
- signal 要求 runId + waitToken + eventId + payload；
- status 只读授权 run 和 pending actions；
- 要求 `exec.agent` 存在；
- 使用 `ctx.fixedWorkflows.forAgent(exec.agent)` 绑定可信 agent 身份。

这说明工具层不是“简单把 API 暴露给模型”，而是一个强约束门面。

对 CAE 来说，建议不要直接暴露通用 `fixed_workflow_start`，而是暴露领域化工具：

```text
cae_case_prepare_simulation_plan
cae_case_start_solver_after_approval
cae_case_submit_review_decision
cae_case_get_run_status
```

底层再映射到 FixedWorkflow / Temporal。这样可以减少模型误选流程和参数空间。

### 5.4 `dsh-fixed-workflow-conversation`：后端对话绑定门面

Conversation 插件提供：

```text
ctx.fixedWorkflowConversation.bind(agent)
```

它让后端对话代码可以拿到绑定 agent 的 prepare/start/signal/service，而不是让浏览器或模型直接操作底层 runtime。

对 CAE 来说，这对应“前台 CAE Simulation Agent”的 conversation facade：

```text
用户对话
  ↓
CAE Conversation Facade
  ↓
受控业务工具 / workflow gateway
  ↓
FixedWorkflow / Temporal / MCP Tool Gateway
```

### 5.5 `dsh-executor-agent`：Workflow Step 内嵌 Agent

这个包把 Agent 作为 workflow step executor 使用，适合把某些主观判断、摘要、解释、澄清问题放进固定流程。

但它也明确暴露了边界：

- 模型输出必须是协议 JSON；
- session 持久化和 continuation 必须先落盘；
- 未知副作用不自动重投；
- redeliverySafety 是 manual-reconcile；
- 它不是 exactly-once 的外部副作用系统。

对 CAE 来说，专家子 Agent 应作为“审查 / 解释 / 诊断”节点，而不是作为“求解 / 裕度计算 / 正式判定”节点。

---

## 6. Mixed Mode：自由咨询与固定流程共存

`examples/mixed-mode` 是整个 demo 对企业 Agent 最有启发的部分。

它注册了多个配置化业务流程，例如：

- purchase-request；
- expense-claim；
- leave-request。

同时又保留一个普通企业助手 Agent。这个 Agent 可以：

- 查询政策；
- 做自由问答；
- 发现可用流程；
- prepare 流程补参；
- start 明确流程；
- 查询 run 状态；
- 对等待中的流程提交明确确认 / 拒绝。

它刻意不做的是：

```text
不把每一次咨询都变成 workflow；
不把含糊表达当作确认；
不同时暴露原始 start/signal 和业务封装工具；
不让 pack-private 工具有路径启动或 signal workflow。
```

`workflow-tools.mjs` 里的模式尤其值得借鉴：

```text
tool execute(args, exec)
  ├── 拒绝未知参数
  ├── 检查 exec.agent
  ├── gatewayFor(exec.agent)
  └── 只调用领域 gateway 暴露的动作
```

这对航天 CAE Agent 可以直接映射为：

```text
自由咨询：规范解释、历史案例、solver warning 经验、建模建议
固定流程：工况确认、求解计划审批、solver run、结果复核、报告发布
```

关键产品原则是：

```text
“用户问这个载荷是否合理”不是审批；
“用户明确点击/回复批准该仿真计划”才是审批。
```

---

## 7. Memory Evolution：长期记忆与 Skill 演进

`dsh-memory-evolution` 展示了另一类非常重要的 Harness 能力：经验沉淀。

它的核心对象包括：

- Scope：`tenantId + userId + projectId`；
- SourceEvent：授权来源事件；
- Evidence：证据片段；
- MemoryDraft / Memory：fact、preference、experience；
- SkillDraft / SkillVersion；
- Evaluation；
- Receipt；
- Audit；
- Feedback；
- EvolutionJob。

### 7.1 核心流程

```text
授权历史来源
  ↓
增量读取 SourceEvent
  ↓
形成 Evidence
  ↓
Consolidator 整理 memory / skill draft
  ↓
结构评估 / 策略评估 / 独立任务评估
  ↓
候选 Skill
  ↓
人工 approve
  ↓
publish / disable / rollback
```

默认策略非常保守：

- 默认不自动发布；
- 模型不能调用管理 API；
- 审批、删除、发布只给可信管理端；
- scope 不从 cwd、正文或模型参数推断；
- 候选不能按猜测名称加载；
- 来源删除可级联撤销；
- 运行反馈可沉淀，但不替代审查。

### 7.2 对航天 CAE 的价值

航天 CAE Agent 很需要经验沉淀，但必须是受控沉淀。可以借鉴为：

```text
solver fatal error 处理经验 → candidate experience memory
典型建模检查项 → candidate checklist skill
报告审查意见 → candidate report review skill
工况遗漏模式 → candidate load case validation rule
```

但必须坚持：

```text
候选经验可以提示工程师；
候选 Skill 可以进入待评审区；
未经批准不能进入正式流程；
不能自动修改材料许用值、工况规则、求解流程或权限策略。
```

### 7.3 Memory Web 的边界

`dsh-memory-evolution-web` 提供本地 loopback 管理入口和设置页，但文档明确说明：

```text
这是本机单用户管理，不是企业多租户身份认证。
```

对 CAE 来说，可以借鉴它的管理 UI 思路，但生产上应接企业 SSO、RBAC、项目权限、审计系统和变更审批。

---

## 8. 状态、持久化与可恢复性

这个 demo 反复强调“恢复边界”，这是它比普通 demo 更工程化的地方。

### 8.1 Store 和事务

Core 提供 Memory / SQLite 两类 store。SQLite store 用于验证跨连接、跨进程、crash 恢复等语义。

关键持久化对象包括：

- workflow artifact / catalog；
- run state；
- attempts；
- operations；
- waits；
- children；
- events；
- outbox；
- start receipt；
- signal receipt；
- leases；
- continuation store。

### 8.2 Outbox pattern

Runtime 不是直接执行外部动作后再记账，而是：

```text
状态变化 + outbox command 原子提交
  ↓
worker 获取 outbox
  ↓
执行前记录 dispatch-started / operation intent
  ↓
调用 executor
  ↓
提交结果与后续 outbox
```

这能显著降低崩溃时的状态不一致风险。

### 8.3 Manual reconciliation

当外部副作用状态不确定时，系统不假装可以自动恢复，而是进入 manual reconciliation。

这对 CAE 特别重要。例如：

- solver job 已提交，但本地进程崩溃；
- HPC 返回超时，但作业可能仍在运行；
- 后处理写了一半图像；
- 报告服务可能已经生成 PDF；
- 材料库查询返回但未落审计。

这些场景不能简单重跑，必须核对外部系统 evidence 后决定：

```text
mark succeeded / mark failed / retry / cancel / attach external result / require engineer review
```

### 8.4 与 Temporal 的关系

FixedWorkflow Core 解决的是 Harness 侧的固定任务状态和受控工具调用；Temporal 更适合长任务可靠执行。

对航天 CAE 推荐组合是：

```text
FixedWorkflow / Harness
  ├── 管用户意图、业务状态、人审、权限、审计、工具门面
  └── 在 solver/postprocess/report 节点调用 Temporal workflow

Temporal
  ├── 管 solver activity、HPC polling、timeout、retry、cancellation
  ├── 管 postprocess activity
  ├── 管 report activity
  └── 等待人审 signal 或外部任务完成
```

不要让 FixedWorkflow Core 单独承担大规模 solver 并行调度，也不要让 Temporal 替代 Agent 对话和工具权限门面。

---

## 9. 安全设计拆解

这个 demo 有几条非常值得复用的安全设计。

### 9.1 Deny-by-default 平台能力

HTTP、script、credential 都不是默认开放：

- HTTP 需要精确 origin allowlist；
- redirect 禁止；
- credential 由可信 resolver 解析；
- script 只能选择 alias；
- cwd / args / env 都由宿主策略控制。

这与 CAE 的“最小能力暴露”一致。

### 9.2 模型不能伪造身份

Provider 注入 trusted subject，工具必须通过 `exec.agent` 取得绑定身份。

CAE 里应扩展为：

- 绑定 tenant / project / case / user / role；
- 工具调用前校验 case ownership；
- 人审 signal 校验 reviewer role；
- 报告发布校验签署权限。

### 9.3 工具拒绝未知参数

`rejectExtra(args, allowed)` 和 mixed-mode 工具里的 extra args 检查非常朴素，但价值很大。它可以防止模型把隐藏字段、伪造 subject、越权参数塞进工具调用。

CAE 工具也应全部使用：

- schema validation；
- additionalProperties=false；
- unknown args reject；
- role / state / case status gate；
- idempotency key；
- audit fields。

### 9.4 Workflow 不由 LLM 创建或修改

这点对于工程安全最关键。LLM 可以建议流程改进，但正式流程应走代码评审、测试、发布和版本锁定。

航天 CAE 里尤其不能让模型动态创造“跳过 V&V Review”的流程。

---

## 10. 对航天 CAE Agent 的可借鉴点

### 10.1 可以直接借鉴的架构模式

| Demo 模式 | 对 CAE 的借鉴 |
|---|---|
| Core 与 DSH 插件解耦 | CAE Harness 不绑定单一对话框架，核心流程可被 Web、CLI、API 调用 |
| Definition Compiler | 仿真流程版本化、编译校验、digest 钉住 |
| Executor SPI | CAE Adapter、材料库、报告服务、Temporal workflow 都作为受控 executor/tool |
| Provider trusted subject | 工程师身份、项目权限、人审角色由宿主注入 |
| Tool reject extra args | 防止模型注入越权字段 |
| start/signal receipt | 防止重复启动 solver、重复审批 |
| wait signal | 仿真计划、工况、报告等人审节点 |
| outbox + lease + fencing | worker 崩溃和并发执行恢复 |
| manual reconciliation | solver / HPC / report 外部副作用核对 |
| mixed-mode | 自由咨询与正式流程共存 |
| Memory Evolution | 仿真经验、solver error、审查意见沉淀为候选记忆和候选 Skill |

### 10.2 CAE 领域化工具门面

不要直接照搬通用工具名，而应建立 CAE 领域工具：

```text
cae_list_available_workflows
cae_prepare_simulation_case
cae_validate_model_inputs
cae_generate_simulation_plan
cae_submit_plan_review_decision
cae_start_solver_workflow
cae_get_solver_workflow_status
cae_submit_solver_warning_decision
cae_generate_review_package
cae_submit_report_review_decision
```

这些工具背后可以调用 FixedWorkflow、Temporal、MCP Gateway、Postgres 和 MinIO，但模型只看到受控业务动作。

### 10.3 CAE Workflow 建议形态

```text
cae_static_modal_case_workflow@v1
├── requirement_parse
├── load_case_validate
├── model_file_inspect
├── material_allowable_check
├── simulation_plan_generate
├── wait_plan_approval
├── temporal_solver_workflow_start
├── temporal_solver_workflow_wait
├── solver_log_review
├── temporal_postprocess_workflow_start
├── margin_calculation
├── vnv_review
├── report_generate
├── wait_report_approval
└── publish_review_package
```

其中：

- LLM / Agent 节点只负责解释、摘要、诊断建议和澄清；
- deterministic tool 节点负责模型解析、结果提取、裕度计算；
- Temporal 负责 solver/postprocess/report 长任务；
- wait signal 负责工程师确认；
- WeKnora 提供规范、案例和经验上下文；
- Postgres 保存 case 状态和审计索引；
- MinIO / NAS 保存 FEM、结果、log、报告和截图。

### 10.4 CAE Memory Evolution 建议形态

```text
CAE Evidence Sources
├── solver log with resolution
├── V&V review comments
├── report revision history
├── engineering Q&A
├── approved checklist changes
└── confirmed lesson learned

Memory Evolution
├── candidate memory: solver warning 解释经验
├── candidate checklist: 模型检查项
├── candidate skill: 特定 fatal error 诊断流程
├── candidate report format rule
└── candidate load case completeness heuristic

Human Review
├── approve
├── reject
├── publish
├── disable
└── rollback
```

默认不自动发布。即使要自动发布，也只能覆盖低风险类型，例如格式化规则或非安全关键 checklist，并且仍需独立评估。

---

## 11. 不建议直接复用的部分

### 11.1 不建议把 SQLite 当生产 workflow store

demo 的 SQLite 对验证正确性很有价值，但航天 CAE 生产环境建议：

- Postgres 存业务状态、receipt、audit index；
- Temporal 存长任务 history；
- MinIO / NAS 存文件资产；
- OpenTelemetry / 日志平台存 trace；
- SQLite 只适合本地 demo、开发或单机工具。

### 11.2 不建议让 Script Executor 直接跑任意 solver

script alias 的思想值得借鉴，但生产上应加一层 CAE Adapter 和 Temporal Activity，不要让 Agent tool 直接变成 solver command runner。

### 11.3 不建议把 HTTP allowlist 当完整网络安全

origin allowlist 是应用层保护，不是网络隔离。生产仍需：

- 内网服务隔离；
- API Gateway；
- mTLS / service account；
- RBAC；
- request signing；
- egress policy；
- 审计和告警。

### 11.4 不建议让 Agent Executor 做正式工程判定

Agent Executor 适合做：

- 需求澄清；
- solver warning 解释；
- V&V checklist 草稿；
- 报告文字修改；
- 异常诊断建议。

不适合做：

- 正式材料许用值判定；
- 正式裕度计算；
- 自动接受 solver fatal / warning；
- 自动发布报告；
- 绕过人审的工程结论。

### 11.5 不建议让 Memory Evolution 自动改变 CAE 流程

自动学习到的经验不能直接变成正式流程规则。所有工程规则、Skill、workflow definition 的变化都要经过：

```text
候选 → 证据 → 独立评估 → 工程专家审核 → 版本发布 → 回滚预案
```

---

## 12. MVP 适配方案

结合前面的航天 CAE 方案，推荐按三阶段吸收这个 demo 的思想。

### 12.1 阶段一：建立受控工具和固定流程门面

目标不是先做复杂多 Agent，而是先把边界立住。

```text
CAE Simulation Agent
  ↓
CAE domain tools
  ↓
Workflow Gateway
  ↓
Postgres case state + Temporal workflow refs
  ↓
CAE Adapter / WeKnora / MinIO
```

第一批工具：

- `cae_prepare_case`；
- `cae_generate_simulation_plan`；
- `cae_submit_plan_approval`；
- `cae_start_solver_run`；
- `cae_get_case_status`；
- `cae_submit_report_review`。

要求：

- 所有工具拒绝未知参数；
- 所有写动作有 idempotencyKey；
- 所有动作检查 case status；
- 所有动作记录 actor、role、traceId、input hash、output refs。

### 12.2 阶段二：引入 Fixed Workflow / Temporal 分工

```text
FixedWorkflow / Harness
├── case workflow state
├── human signal
├── business events
└── audit index

Temporal
├── solver_workflow
├── postprocess_workflow
├── report_workflow
└── wait/cancel/retry/timeout
```

FixedWorkflow 可以作为“业务流程控制面”，Temporal 作为“长任务执行面”。两者通过 workflow refs 和 status bridge 连接。

### 12.3 阶段三：引入 Memory Evolution 式经验沉淀

先沉淀低风险经验：

- solver warning 解释；
- 常见 fatal error 处理 checklist；
- 报告格式建议；
- 模型检查经验；
- 历史 case 相似性提示。

再逐步沉淀候选 Skill，但必须人工发布。

---

## 13. 风险与待验证项

| 风险 | 说明 | 建议验证方式 |
|---|---|---|
| FixedWorkflow Core 生产容量 | README 明确当前验证正确性，不承诺大规模吞吐 | 用 Postgres / Temporal 做生产化设计，不直接照搬 SQLite |
| DSH 插件 API 稳定性 | 当前绑定 DSH 0.1.0-rc.5 / Cordis 4.0.1 | 版本锁定，升级时跑完整兼容测试 |
| Agent Executor 恢复边界 | Session JSONL 与 continuation SQLite 不是分布式事务 | 高风险节点不用 Agent Executor 执行外部副作用 |
| Script 执行隔离 | 普通子进程不是恶意代码沙箱 | 生产用容器 / HPC adapter / 最小权限账号 |
| Memory 自动学习质量 | 本地确定性测试不代表线上模型整理质量 | 人工审批 + 独立评估 + 回滚机制 |
| CAE 工具链副作用 | solver/HPC/report 状态可能不确定 | manual reconciliation + evidenceRef + operator review |
| 权限来源 | 不能从模型正文推断身份 | 接企业 SSO/RBAC 和项目权限表 |

---

## 14. 对现有航天 CAE Agent 文档的补强建议

基于这个 demo，现有航天 CAE Agent 方案可以补强三点。

### 14.1 在 Harness 层增加 Workflow Gateway 概念

```text
DeepSeek Harness
├── Conversation Agent
├── CAE domain tools
├── Workflow Gateway
├── Trusted Subject Binding
├── Idempotency / Receipt
├── Pending Actions / Signal
└── Audit Events
```

### 14.2 把 Plugin / Tool 分为三类

```text
只读知识工具
├── search_guideline
├── search_historical_case
└── explain_solver_warning

受控业务工具
├── prepare_case
├── start_workflow
├── signal_review
└── get_status

高风险执行工具
├── submit_solver_run
├── cancel_solver_run
├── publish_report
└── update_material_rule
```

高风险执行工具不直接暴露给模型，只能由 workflow / Temporal activity 在满足状态和审批条件后调用。

### 14.3 把经验沉淀做成候选区

```text
lesson learned candidate
  ↓
expert review
  ↓
approved memory / checklist / skill
  ↓
versioned publish
  ↓
rollback / disable
```

这样既能利用 Agent 的学习能力，又不会破坏航天工程的审慎性。

---

## 15. 最终建议

这个 demo 对航天 CAE Agent 的参考价值很高，但应该“借鉴架构思想”，而不是“直接搬运 demo 实现”。

推荐吸收顺序是：

1. 先借鉴 mixed-mode：自由咨询和固定流程分离。
2. 再借鉴 tool facade：只暴露领域化受控工具，拒绝未知参数。
3. 再借鉴 trusted subject：身份和权限由宿主绑定，模型不能自填。
4. 再借鉴 receipt / idempotency / signal：解决重复启动、重复审批和人审恢复。
5. 再借鉴 outbox / manual reconciliation：解决外部副作用不确定。
6. 最后借鉴 Memory Evolution：把工程经验沉淀为候选记忆和候选 Skill，默认人工发布。

对航天 CAE MVP，推荐一句话方案是：

```text
用 DeepSeek Harness 承载前台 CAE Simulation Agent 和受控工具门面，
用 FixedWorkflow 思想管理 case workflow、人审 signal、幂等和审计，
用 Temporal 管 solver/postprocess/report 长任务，
用 MCP / CAE Adapter 封装真实仿真工具链，
用 Memory Evolution 思想沉淀候选经验和候选 Skill，
但所有高风险工程动作必须由固定流程、确定性工具和人工确认共同约束。
```
