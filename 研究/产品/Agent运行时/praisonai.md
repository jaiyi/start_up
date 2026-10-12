# 产品调研：PraisonAI（MervinPraison/PraisonAI）

> 调研日期：2026-10-10
> 调研对象：github.com/MervinPraison/PraisonAI（MIT 协议开源，Python/JS 双 SDK）
> 资料来源：raw README（1236 行，已通读主体）。docs.praison.ai 文档站因当前会话网络抓取受限未读取，深链功能（guardrails/policy-engine/checkpoints 等）仅有 README 表格级描述。
> 分类：agent-runtime-harnesses（多 agent 框架/运行时全家桶）

---

## 1. 一句话定位

**PraisonAI 是一个 MIT 开源的 Python 多 agent 框架全家桶**——单 agent SDK（`praisonaiagents`）、多 agent 编排（`Agents`/`AgentFlow`）、YAML 无代码模式、可视化构建器（Langflow 集成）、Claw 仪表盘（Telegram/Slack/Discord/WhatsApp 渠道网关）一应俱全。它当前最独特的输出是**「五层 Agent 栈」的自我分层框架**和**「Managed Agents」的执行位置语义**——后者与我们 spc_dsh 的"DSH 思考/后端计算"分体架构惊人同构。

## 2. 核心能力拆解

### 2.1 五层 Agent 栈（README 的骨架，值得整段吸收）

每层回答一个问题，层与层嵌套包裹，"agent 出错时，层告诉你该看哪里"：

| 层 | 问题 | PraisonAI 落点 |
|---|---|---|
| 1 · Prompt | 我说清楚了吗 | `instructions` / `role`/`goal`/`backstory` / `output` / `templates` |
| 2 · Context | 窗口里是该在的东西吗 | `memory`（写）/ `knowledge`（选）/ `context="summarize"`（压缩）/ handoff `ContextPolicy`（隔离） |
| 3 · Harness | 能行动吗，能被检查吗 | `tools` / `MCP()` / `guardrails` / `approval` / `hooks` / `sandbox` |
| 4 · Loop | 什么时候停 | `ExecutionConfig(max_iter, max_budget)` / `reflection` / `autonomy` / doom-loop 检测 |
| 5 · Graph | 谁先跑，谁检查谁 | `AgentFlow` + `route/parallel/loop/repeat` |
| ⬡ Managed | **到底在哪里跑** | `tools_run_on="docker"`（只搬工具）/ `run_on="..."`（整个 agent 搬走） |

上下文四操作（write/select/compress/isolate）各一个参数的提法非常干净——记忆写入、知识检索、自动压缩、handoff 隔离，四件事在 API 表面各占一词。

### 2.2 Managed Agents：执行位置语义（对我们最重要的部分）

- **`tools_run_on=`**：工具搬到远端沙箱（docker / e2b / modal / daytona / flyio / sandlock / ssh / novita / subprocess），**思考留在本机**；一个 team/workflow 共享一个沙箱（步骤 1 写的文件步骤 2 能读）；
- **`run_on=`**：整个 agent（模型调用+循环+工具）搬走（`anthropic` 托管 / `docker` 自托管）；
- **错配会报错并纠正你**：`Agent(run_on='e2b')` 直接 TypeError——"e2b 只能跑命令、不能承载 agent 循环，请用 tools_run_on"——把语义错误变成显式教学；
- 沙箱治理：`praisonai managed ps/stop`、空闲自动关机、post-setup snapshot 复用跳过装依赖、`.praisonai/environment.yaml` 随仓携带环境；
- 自省 API：`agent.where_does_it_run()` 打印"哪部分在哪跑、你自定义的工具还在本机"。

**这是 spc_dsh「DSH 宿主=管理面/计算节点=运行面」二分法的框架界完整表述**：思考面与工具面分离、按需搬移、错配显式报错、沙箱有生命周期治理。

### 2.3 循环纪律（Layer 4）

- `ExecutionConfig(max_iter=30, max_budget=0.50, on_budget_exceeded="stop")`——迭代与预算双闸；
- **completion_reason 枚举**：`goal | no_tool_calls | max_iterations | timeout | doom_loop | needs_help | error`——每个退出都带声明式原因，不是裸抛异常；
- **doom-loop 检测默认开启**：识别重复相同工具调用与 A→B→A→B 振荡，但"输出持续变化的轮询"不会被误杀。

### 2.4 图编排（Layer 5）

`AgentFlow(steps=[classifier, route({...}), parallel([...]), repeat(editor, until=..., max_iterations=3)])`——路由/并行/循环/评估器-优化器四种原语；同一图可纯 YAML 表达（"topology as versionable artifact"）。

### 2.5 生态与外围

- MCP 四传输（stdio/HTTP/WS/SSE）；24 家 provider（含 DeepSeek、Ollama、vLLM 本地）；
- 持久化 20+ 数据库（memory 落 PG/SQLite/...）；graph memory（Neo4j 式关系记忆）；
- Claw 仪表盘 13 页（Chat/Agents/Memory/Knowledge/Channels/Guardrails/Cron...）直连 IM 渠道；
- 对外编排：Claude Code / Gemini CLI / Codex CLI / Cursor CLI 作为被编排的 external agents；
- 评测/可观测：Langfuse tracing、OTel；shadow git checkpoints（失败自动回滚）。

## 3. 技术栈

Python 双包（`praisonaiagents` 核心零依赖向 / `praisonai` CLI 全家桶）+ JS SDK；RAG 检索策略可插拔（向量/关键词/hybrid/重排）；persistence 驱动面极广但默认零配置（SQLite）。

## 4. 与相邻产品的差异

| 维度 | CrewAI | LangGraph | PraisonAI | DSH/docker-agent |
|---|---|---|---|---|
| 定位 | 角色化多 agent | 图编排状态机 | **全家桶+执行位置语义** | 配置化运行时 |
| 无代码 | 弱 | 弱 | YAML + 可视化 + Claw UI | YAML 原生 |
| 执行位置 | 无此概念 | 无此概念 | **tools_run_on / run_on 双语义** | DSH 插件宿主；docker-agent 沙箱 |
| 退出纪律 | 弱 | 显式状态机 | completion_reason + doom-loop | waterfall/approval |
| 渠道网关 | 无 | 无 | Claw 内置 | 无 |

## 5. 优势

1. 五层栈是一个**可直接用于评审自家架构的检查框架**（哪层薄一查便知）；
2. Managed Agents 把"执行位置"升格为一等 API 语义，且带错配纠正与自省；
3. 循环退出全部枚举化 + doom-loop 默认开启，工程纪律少见；
4. 入口梯度完整：5 行代码 → YAML → 可视化 → 仪表盘，全家桶但核心包保持轻。

## 6. 短板 / 未验证点

1. 全家桶广度 vs 单点深度：memory/guardrails/policy-engine/checkpoints 等均只有 README 链接级描述，实现深度未验证；
2. 文档站未读取（网络受限），features 清单与实际能力的一致性未知；
3. 营销话术较重（"Highlighted by Elon Musk" 徽章、24/7 AI Workforce），工程信号与宣传信号需要分离看待；
4. 企业级诉求（多租户、审计、发布治理）在 README 层面不可见——与 DSH/连山所关注的治理面不是一个赛道；
5. Star/下载量徽章是动态的，未在本次调研中固化数值。

## 7. 适用场景

Python 团队快速搭多 agent 原型、IM 渠道 bot 网关、需要远端沙箱执行工具的自动化任务。

## 8. 对我们当前项目的启发（重点）

1. **五层栈直接用来给 spc_dsh 做对位自检**：我们的 1-4 层（Prompt=Pack 现象锚/Context=证据查询/Harness=defineTool+gate/Loop=诊断会话收敛）都有落点，**Layer 5（Graph）与 ⬡（Managed）恰好是 2026-10-10 三轮评审刚补的两块**（多 profile 组合 = graph；计算节点 = managed）。这个外部框架印证了评审方向；
2. **`tools_run_on` / `run_on` 双语义命名**值得 compute-client 契约设计直接借鉴：派单时显式声明"搬的是工具还是整个循环"，错配显式报错——比隐式约定更防御；
3. **completion_reason 枚举**：诊断会话/流水线任务的每个退出都应带枚举原因（goal/doom_loop/needs_help...），工作台 UI 直接可渲染——成本极低，可观测性收益大；
4. **doom-loop 检测**：诊断 agent 反复查同一个证据源是真实风险，A→B→A 振荡检测值得进诊断运行时的默认纪律（连 agent_coach 时代没有这个）；
5. **`.praisonai/environment.yaml` 随仓携带环境**：算子库仓库（Q18）可类比——算子依赖环境随算子库版本化，compute 节点拉取即就绪；
6. Claw 的"渠道只是网关、决策在仪表盘"与我们"飞书只提醒、关单在工作台"（05 §3）同构，互相印证。

## 9. 后续需要实测的问题

1. memory 的实际存储结构（表结构/检索方式）与我们 event_id 血缘设计的差距；
2. guardrails / policy-engine 的实现深度（确定性规则还是模型判定）；
3. AgentFlow YAML 与 LangGraph 的表达力差距（有无循环依赖/分支合并语义）；
4. managed sandbox 的凭证隔离粒度（README 声称 per-agent credential isolation，未验证）。
