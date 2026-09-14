# 02 · lads —— 连山 Monday 工业 AI「计算底座」深度结构分析

> 分析对象：`/Users/lijiayi/lianshan/agent/lads`（分支 `main`，约 3696 个 git-tracked 文件）
> 方法：以 `AGENTS.md`（1042 行主文档）、`README.md`、`flow.yaml` 为纲，实际打开
> `lads/cli/`、`lads/framework/{agent,ontology,evi,decision,compiler,messaging}`、
> `lads/domains/` 下核心源码逐一阅读。结论均标注文件路径证据；未读到的地方标「待深挖」，不臆测。

---

## 1. 一句话定位 + 技术栈

**lads 是 Lisen/连山系统的"计算底座"（computational foundation），本质是一个"冷路径编译器 +
工业算法 SDK 库 + BPMN/故障树 Agent runtime 的三合一 Python 单体包"**，负责把数据科学项目
（dsproject）编译成不可变的 Bundle 制品，并提供被热路径 `workstation-runtime` 消费的通用算法、
消息、执行能力。

它**不是**一个 LangChain 式的 LLM Agent 框架——这里的"Agent"指的是**基于 SpiffWorkflow 的
BPMN 工作流引擎 + OWL 故障树诊断引擎**（确定性规则推理，非 LLM 编排），面向汽车/制造业的
质量诊断、工艺告警等场景。

**技术栈**（据 `pyproject.toml`、源码 import、`AGENTS.md`）：

- **语言/运行时**：Python ≥ 3.11，Async-First（`psycopg.AsyncConnection`）
- **CLI**：`click` + 自研 `LazyGroup` 懒加载命令面（`lads/cli/main.py`）
- **工作流编排**：SpiffWorkflow（BPMN 2.0 解析/执行），自研 OWL 故障树遍历引擎（owlready2 可选）
- **消息**：Kafka（confluent-kafka / kafka-python 双后端）+ **PostgreSQL pgmq**（消息队列，
  `BasePgmqWorker` 是主推模式）+ LISTEN/NOTIFY
- **存储**：PostgreSQL-first（psycopg3）、RustFS / S3（对象存储）；**MySQL 已在 2026-04 审计中全删**，
  **etcd 已全移除**
- **模型**：sklearn-like `BaseModelInfer/BaseModelEngine`；视觉走 YOLO/PaddleOCR
- **Web**：`iweb`（schema-driven FastAPI + React/Vite SPA），**Streamlit 已退役**
- **契约/校验**：Pydantic v2 + frozen dataclass + YAML + SHA-256 checksum
- **部署**：Dokku（dokku-admin HTTP Basic + JWT，**禁止 SSH 部署**）、Ansible（节点初始化）、
  pyarmor 加密打包、阿里云云效（codeup）流水线（`flow.yaml` → `deploy/build_upload.sh`）

**目录三分法**（`lads/` 源码包顶层只允许三个代码根，README §仓库结构）：

```
lads/cli/         单一 LazyGroup 命令面（new/run/deploy/publish/bundle/profile/agent/...）
lads/domains/     业务算法层（17 个域：spc/curve/audio/oee/vision/scheduling/...）横向自治
lads/framework/   业务无关通用支撑层（compiler/messaging/agent/ontology/evi/decision/io/...）
```

外加 `packages/`（TS 的 `agent-ws-client`、`@lisen/ui`、Python 的 `lisen-agent-ws-runtime`
WebSocket runtime）、`examples/`、`ci/`、`deploy/`、`docs/`。

---

## 2. 核心模块与数据流

### 2.1 两条路径：冷路径（Bundle 编译）vs 热路径（算法执行）

lads 的第一性架构原则是 **"Bundle 是冷路径与热路径之间唯一的交接物"**（README，AGENTS.md）：

```
profile → dsproject → lads(编译) → Bundle → workstation-runtime(消费)
```

- **冷路径**（lads 拥有）：`dsproject workspace → 解析 → 校验 → 规划 → 构建 artifact →
  组装 Bundle → manifest → 发布/交付`。核心在 `lads/framework/compiler/`。
- **热路径**（lads 提供能力，但不主控）：算法计算、消息消费、推理调度。runtime lifecycle、
  registry、账本真相属于 `workstation-runtime`（跨仓边界，AGENTS.md 反复强调）。

### 2.2 CLI 主链（`lads/cli/main.py`）

`COMMANDS` 是一个 `dict[str, CommandSpec]`（`main.py:52`），由自研 `LazyGroup`（`main.py:118`）
按需 import 子命令模块——避免一次性加载所有重依赖。交付闭环命令：

| 命令 | 语义（README/AGENTS.md 权威表）| 入口 |
|------|------|------|
| `lads new` | 从 profile 创建标准 dsproject | `_commands/new.py` |
| `lads run` | 审查 + 结构性交付 App+Bundle 到 deploy-preview | `_composition/run_orchestrator.py::run_deploy_preview` |
| `lads deploy` | fail-closed 四层验收，追加 `AcceptanceReport`，passed 才推进到 `deployed` | `_commands/deploy.py` |
| `lads publish` | 仅修订已声明的 `publishable_values` | `_commands/publish.py` |
| `lads bundle build/validate/inspect/diff` | Bundle 冷路径工具 | `_commands/bundle.py` |
| `lads init/upgrade/license` | Ansible 节点 bootstrap（**不属于** run→deploy→publish 闭环）| `_commands/init.py` 等 |

lifecycle 水位：`created < deployed < published`，是**交付/审计台账**，明确规定"新代码不得读取
lifecycle 状态决定是否消费事件/执行 BPMN"——**业务激活的唯一真相是 Bundle 内容本身**。

### 2.3 Bundle 编译管线（`lads/framework/compiler/`）

`compiler/__init__.py` 暴露完整冷路径 API：`WorkspaceParser → 各类 Validator（Contract/
Dependency/OntologyBinding/feedback）→ BuildPlanner → ArtifactBuilder → BundleManifest →
build_bundle/inspect_bundle → publish`。

发布管线由 11 个 phase 组成（`compiler/_application/_publish/phases/`，
`pipeline_executor.py:55`）：

```
phase_01_validate → 03_register → 04_deploy_ppl → 05_deploy_graph →
06_deploy_vector → 07_deploy_bpmn → 08_deploy_edge → 09_activate →
10_finalize → 11_employees（同步 Bundle 声明的"数字员工"/Trigger）
```

关键契约：Phase 由 Bundle 内容 + 幂等性决定执行，**不以 lifecycle 跳过**；带 ledger 文件锁
（`_ledger_lock`）保证幂等交付。dsproject 的 `app.json` postdeploy hook 直接
`python3 -m lads.framework.compiler._publish.pipeline_executor` 调用（该路径现为 shim，
真实实现已下沉到 `_application/_publish/`）。

### 2.4 Agent runtime（`lads/framework/agent/` + `lads/framework/ontology/`）

这是仓里最接近"agent"语义的部分，但 **capability.toml 明确标注 `status = "experimental"`**
（`lads/framework/agent/capability.toml:17`）。它由两层引擎组成：

**（a）BPMN 主循环**（`agent/_application/engine.py::run_bpmn`）：
- 用 SpiffWorkflow 解析单个 `.bpmn` 文件 → `BpmnWorkflow`
- `while not wf.is_completed()` 主循环，对每个 READY 任务查 `task_mapping[name]` 拿到处理函数执行
- 每步产出 `WorkflowSnapshot`（含 execution_history、owl_runtime、context_data），
  按节点状态（WAITING/ERROR/正常）分别 `create_waiting/error/auto_checkpoint`
- 支持**状态持久化 + 恢复 + 重跑**（`WorkflowStateManager`/`CheckpointManager`/
  `WorkflowRecoveryEngine`/`ExecutionIdManager`/`NodeExecutionTracker` 五组件）
- 支持人机协同：等待用户反馈（WAITING 挂起）、`rerun_trigger` 重跑指定节点、
  `reassign_person` 重新指派（`_handle_reassign_person` 短路修改 `owner_override`）
- 产出 `todo_list` 发给 `iwork`（人工工作台）

**（b）OWL 故障树诊断**（`agent/_application/owl_entrance.py::fault_tree_diagnosis` +
`ontology/_application/_owl_framework/_tree_engine.py`）：
- 一个 BPMN 节点可挂载一棵"故障树"（OWL 本体）。加载策略：本地模块 → FTA 服务
  `fetch_fault_tree(agent_name, cause_type)` → `OWLWorkflowBuilder.build_from_json`
- `OWLExecutor.execute()` 按节点执行器 + 遍历策略（`BaseNodeExecutor`/`TraversalStrategy`
  抽象基类）遍历诊断树，遇到需要人工确认的节点挂起等 `user_feedback`
- 产出 `diagnosis_paths`（诊断路径）与 `root_causes`（根因）
- OWL 运行时状态存到 `owl_runtime[parent_execution_id]`，随 BPMN snapshot 一起持久化

**语义/本体绑定层**（`ontology/_core/_semantic/`）：一套把 OWL/YAML 定义的实体（Entity）、
范围（Scope）、责任（Responsibility）、信号（Signal）绑定到 feature/rule/task/flow 的
Pydantic 契约（`_bindings/_rule_binding.py` 等），供编译期做 `OntologyBindingValidator` 校验。

### 2.5 决策引擎（`lads/framework/decision/`）

一套**确定性规则决策引擎**，与 LLM 无关：
- `_core/_rules/`：`RuleCondition`/`RuleNode` Pydantic AST（eq/gt/between/in... 算子），
  `AstRuleEvaluator` 对 feature dict 求值；另有 `ExpressionEngine`
- `_core/_dmn/`：DMN 决策表求值器
- `_core/_features/`：FeatureLoader + 派生特征引擎
- `_core/_postprocess/`：阈值判定 + 标签映射
- `_application/_flows/`：`DecisionFlowDefinition` + `FlowExecutor` 编排决策流
- `_core/_diagnostics/`：执行 trace / 格式化

### 2.6 EVI —— Expected Value of Intelligence（价值计量，仓里独特资产）

`lads/framework/evi/` 是一个**"智能价值"计量/记账框架**——把每次 AI 推理折算成货币价值：
- **本体**（`framework/contracts/_contracts/common/objective.py`）：`INTELLIGENCE_ONTOLOGY`
  硬编码了 **24 个"情报码"**（IntelligenceCode 枚举，1xxx 售后/2xxx 工厂/3xxx 供应/4xxx 通用），
  每个含中英文名、类型（EVIN 告警 / EVIP 预测）、业务域、客户类型码（如 `ATC-1001`）
- **公式**：`INTELLIGENCE_FORMULA = "(i_h*t_h+i_m*t_m+i_s*t_s)*a"`（严重度强度×时间的加权和 × 准确率）
- **抽象基类** `IntelligenceLogic`（`evi/_contracts/_base.py`）：子类实现
  `calculate_coefficients(data) → {i_h,t_h,...,a}`，基类 `calculate_intelligence_value` 用
  `eval(formula, {"__builtins__":{}}, coeffs)` 算出价值。具体情报实现**下沉到各 dsproject**，
  通过 `entry_points`（`lads.evi.intelligences`）插件发现，不再 cp 进 lads
- **数据落地**：`evi/_adapters/_record/_store.py` 把每次推理 INSERT 进 `evi.intelligence_record`
  表（record_id/occurred_at/intelligence_code/payload/context/coefficients/intelligence_value/
  currency...）；`_counter/_ledger.py` 做计数 + 收益台账 UPSERT

**事件解耦**（Inference Event Hook，AGENTS.md 权威模式）：业务模块**禁止**直接
`import lads.framework.evi`，而是在推理完成点 `await emit(InferenceEvent(...))`，framework 层
`messaging._inference_event` 按 `intelligence_code` 路由到自动注册的 `evi_sink`。做到 O(1) 扩展：
新增业务模块只加 emit，framework/evi 不动。

### 2.7 业务算法域（`lads/domains/`，17 个域）

`audio / curve(tightening+spotwelding) / cycletime_opt / electro_coating / epms / fta / oee /
outlier_detection / param / scheduling / smart_loading / spare_parts_pred / spc /
standard_labor_hour_generation / vision`（另有 `curve_tightening`/`curve_spotwelding` 兼容别名）。

**canonical 7 支柱模板**（`lads.domains.spc` 是参考实现，AGENTS.md 长篇规定）：
```
<domain>/__init__.py（public API + lazy import）
├── _core/       纯 numpy/pandas/scipy 计算，禁 import psycopg/streamlit/io（AP4 反模式）
├── _contracts/  frozen dataclass + schema_version + YAML + SHA-256 checksum
├── _sql/        幂等 PG DDL
├── _worker/     BasePgmqWorker 子类（禁手写 while True 轮询，AP5）
├── _trainer/    定时重训
└── _model/      BaseModelInfer 薄适配
```
文档还给出"支柱必要性矩阵"和三种范式变体（fit-once/eval-stream、fit-and-eval-per-sample、
pipeline-composition），并对齐 sklearn/HuggingFace/MLflow 的极简主义——工程治理相当成熟。

### 2.8 命名数据源（Named Datasource，工程亮点）

连接信息（Kafka broker/PG DSN/S3 凭据/API token）的唯一真相源是 dokku-admin 的
`datasources` 中心表（`/@api/datasources`），仿 Databricks Unity Catalog Connection：
- dsproject 的 `parameters.yml` 只写 `datasource: <逻辑名>`，**禁止把连接值写进 yaml/代码**
- `lads run` 时按 app 引用的数据源名拉连接 → 展开成 `DS_<NAME>_*` env 注入 app
- worker 运行时用 `resolve_source/resolve_sink`（`_datasource/_resolver.py`）按名读 env，
  不联网、缺失 fail-fast

---

## 3. 横向 vs 纵向归属（核心判断）

**尺子：换掉整个横向框架（LangChain 类编排 / 云厂商 / 模型原生能力），这仓里的东西还留得下吗？**

lads 自我定位就是"框架/底座"，因此**它的绝大部分 framework 层天然是横向的**——如实判断如下。

### 3.1 会被抹平/吞掉的横向能力（危险区）

| 模块 | 判断 | 理由 |
|------|------|------|
| `framework/agent`（BPMN 引擎）| **强横向，且面临被吞** | SpiffWorkflow 主循环 + 快照/恢复/重跑本质是通用工作流引擎，Temporal/Camunda/Airflow/云厂商 Step Functions 都能替代。标注 `experimental` 说明团队自己也没底 |
| `framework/decision`（规则/DMN/AST）| **横向** | 通用规则引擎，drools/DMN 标准实现/云规则服务可替代 |
| `framework/messaging`（Kafka/pgmq wrapper）| **横向** | 对 confluent-kafka/pgmq 的封装，`BasePgmqWorker` 是有价值的工程约定但可被任何队列 SDK + 一个 base class 复刻 |
| `framework/io`/`net`（查询/连接/服务发现）| **横向** | OLAP/PG/S3 适配器 + 环境配置，云厂商数据网关/连接器可替代 |
| `framework/compiler`（Bundle 编译）| **横向偏中性** | "把项目编译成不可变制品 + manifest + 幂等发布"是通用 CI/CD/打包思路，但**与 dokku-admin/workstation-runtime 深度耦合**，迁移成本高（见下） |
| `framework/model_core`（sklearn-like 基类）| **横向** | BaseModelInfer 之类，MLflow/自定义可替代 |
| `framework/iweb`（schema-driven web）| **横向** | FastAPI+React 通用 |

### 3.2 相对不可迁移的领域资产（纵向）

| 资产 | 判断 | 理由 |
|------|------|------|
| `domains/*` 的 `_core/` 算法 | **纵向（真资产）** | SPC 控制限、拧紧曲线评估、点焊曲线判定、NVH 分类、OEE、cycletime 优化等——这些是汽车/制造工艺的领域算法，含真实工程 know-how，不会被模型原生能力抹平。这是 lads 里最值钱的部分 |
| **EVI 情报本体 + 价值公式** | **纵向（独特）** | 24 个情报码 + `(i_h*t_h+...)*a` 计价公式 + intelligence_record 台账，是连山把"AI 推理"商品化计价的独特商业设计，别处没有 |
| `domains/curve/spotwelding/_feedback` + `_backtest` | **纵向** | 领域特定的反馈/回测闭环（见 §4）|
| OWL 故障树 + 语义绑定 | **半纵向** | 引擎是横向的，但"故障树/因果诊断路径"这种结构化领域知识表达是纵向价值；不过用 LLM 做因果诊断正在快速逼近，中期有被吞风险 |

### 3.3 危险耦合（领域知识不当地渗进框架）

**这是 lads 最需要警惕的问题**，确有几处：

1. **`framework/contracts/.../objective.py` 把 24 个业务情报码硬编码进了 framework 层**
   （`INTELLIGENCE_ONTOLOGY`、`IntelligenceCode` 枚举含 `售后整车质量预警`、`ATC-1001` 等）。
   这是**典型的领域知识耦合进框架**：framework 号称"业务无关"，却内置了具体车企售后/工厂的
   情报清单和客户类型码。新增一个业务情报要改 framework 枚举，违背了它自己在 AGENTS.md 里定的
   "framework 不得包含 domain 业务语义"红线。（团队已部分意识到——情报**实现**下沉到 dsproject
   插件了，但**本体/枚举**仍留在 framework。）

2. **`framework/agent`（experimental）里 `prepare_workflow_input_data` 默认
   `agent_name="aftersale"`**（`engine.py:60`），BPMN 引擎里散落 `source_event`/`cause_type`/
   `feedback_person`/`iwork` 等**售后诊断业务专有词汇**——通用工作流引擎不该知道"售后"和"故障树"。
   这层是从业务项目"提取"上来的（文件头注释自认："从业务项目中提取的框架层代码"），提取得并不干净。

3. **compiler 与 dokku-admin / workstation-runtime 强绑定**：phase_11 同步"数字员工"、
   发布走 dokku-admin JWT——编译器这一层被特定部署平台锁定，不是纯粹的通用编译器。

**总体判断**：lads 作为"底座"，**结构上以横向为主（约 70% 的 framework 代码可被云厂商/开源替代）**，
真正的护城河集中在 `domains/*/_core` 的工艺算法和 EVI 计价体系这两块纵向资产上。团队用大量
AGENTS.md 治理规则（依赖方向、`_` 前缀、7 支柱、反模式清单）努力维持横纵分离，但在 EVI 情报本体
和 experimental agent 引擎两处，领域知识仍渗进了框架层，属于需要偿还的架构债。

---

## 4. 反馈闭环 / 数据资产痕迹

**有，且是本仓较亮眼的纵向痕迹**，但集中在少数几个域，尚未统一为框架级能力。

### 4.1 反馈轨迹 schema（输入→推理→输出→实际结果→人工修正）

- **EVI 推理记录**（`evi.intelligence_record` 表，`evi/_adapters/_record/_store.py`）：
  记录 `payload`（输入快照）→ `coefficients`（推理系数）→ `intelligence_value`（输出价值）→
  `context`。覆盖了"输入→推理→输出"，但**不含"实际结果 / 人工修正"回填**。

- **点焊域完整反馈闭环**（`domains/curve/spotwelding/`，最完整）：
  - `_contracts/_feedback.py`：`DetectionFeedback`（人工对检测结果标注：
    `confirmed/false_positive/false_negative` + `label_source: human/system/active_learning`
    + `reason_code`（parameter_change/material_batch/fixture_wear）+ `root_cause_code`）
  - `SampleLabel`（训练用 ground-truth：`good/bad/uncertain/exclude_from_training` +
    `is_ground_truth`）
  - `_sql/_ddl/006_feedback.sql`：`detection_feedback` + `sample_labels` 表，含
    `resolution_status`（pending/applied/dismissed）处置状态审计字段
  - `_feedback/_service.py` + `_repository.py` + `_push_feedback_projector.py`：反馈投影/服务
  - **这是标准的"预测→人工标注（含真结果/假阳假阴）→回流训练"闭环。**

- **SPC 域**：`_feedback/_analysis.py` + `_projector.py`（较轻量，做反馈分析与投影）。

- **BPMN Agent runtime**：`feedback`/`feedback_person`/`rerun`/`reassign_person` 贯穿全流程
  （`engine.py`），是**人在环路（human-in-the-loop）的运行时反馈**（人工确认诊断、重跑、改派），
  但偏"运行态交互"，非"训练数据资产回流"。

- **Bundle 级 feedback 契约**：`compiler` 有 `validate_feedback`（`_bundle_validator.py:432`），
  校验 feedback YAML（要求 `entity_ref` + `feedback_type`），说明反馈是 Bundle 的一等公民之一。

### 4.2 eval / rubric / 样本管理机制

- **回测（backtest）= 事实上的 eval 机制**（点焊域最成熟，`spotwelding/_backtest/_runner.py`）：
  - 两种模式：`parameter_eval`（用现有 detection_results + labels 快速算 P/R/F1）与
    `full_replay`（用新 config 重跑 `evaluate_curve` over 历史记录）
  - `_contracts/_backtest.py`：`BacktestMetrics`（**precision_score / recall_score / f1_score**）、
    `BacktestScope`、`BacktestReport`；`_core/_metrics.py::compute_binary_metrics`
  - `_sql/_ddl/007_backtest.sql`：回测结果落库
  - **这就是 rubric/eval：用人工标注样本对模型配置打分（P/R/F1），支持参数调优回放。**

- **样本管理**：`SampleLabel` + `sample_labels` 表（含 `exclude_from_training`、
  `is_ground_truth`、`active_learning` 来源）——具备主动学习 + 训练样本纳排管理的雏形。

- **`data_mock()`**：每个 EVI 情报模块必须实现 mock 数据（`IntelligenceLogic.mock_data`），
  用于测试与 schema 演示，算轻量样本管理。

**结论**：反馈闭环与 eval **确实存在且设计规范（点焊域是范本：反馈 schema + P/R/F1 回测 +
ground-truth 样本管理三件套俱全）**，EVI 记录表提供了推理轨迹落地。但**这些是逐域自建的，
尚未上升为 framework 级的统一"反馈轨迹/eval/rubric"能力**——`spc`、`vision` 等域的反馈成熟度
参差不齐，跨域复用只靠 AGENTS.md 的"照抄 spc 范式"约定，没有统一抽象。这既是纵向资产的证据，
也是"数据飞轮尚未框架化"的疑点。

---

## 5. 亮点 & 疑点

### 5.1 工程亮点

1. **Bundle-first + 冷热路径分离的架构纪律极强**：Bundle 作为唯一交接物、lifecycle 只做审计不做
   业务门控、幂等 11-phase 发布 + ledger 文件锁，边界定义清晰（README + AGENTS.md 反复强调）。
2. **治理即代码**：`ci/lint_governance.py`、`ci/architecture_check.py`、`sys_path_check.py`、
   `doc_path_check.py` + pre-push 全量测试闸，把"依赖方向单向、`_` 前缀、禁 sys.path hack、
   禁硬编码连接"等规则做成了可执行门禁，不是口号。
3. **命名数据源（Unity Catalog 式）**：连接信息中心化托管、消费方只引用逻辑名、fail-fast，
   彻底消灭硬编码 DSN——这是很干净的工程设计。
4. **EVI 价值计量体系**：把 AI 推理折算成货币价值并落台账，是独特的商业化设计（虽然情报本体
   耦合进 framework 是缺点，见下）。
5. **域算法模板 + 反模式清单**：7 支柱模板对齐 sklearn/HuggingFace/MLflow，AP1–AP5 反模式清单
   直接可用于 code review，成熟度罕见。
6. **Inference Event Hook 解耦**：业务模块不 import evi、按 intelligence_code 路由、emit 尽力而为
   不阻断调用方——O(1) 扩展的事件设计干净。

### 5.2 疑点 / 风险

1. **领域知识渗进 framework（架构债）**：24 个业务情报码 + 客户类型码硬编码进
   `framework/.../objective.py`；experimental BPMN 引擎里散落"售后/故障树/iwork"业务词汇并默认
   `agent_name="aftersale"`。违背团队自定的"framework 业务无关"红线（见 §3.3）。
2. **`framework/agent` 是横向且 experimental，最易被吞**：BPMN 工作流引擎 + 快照/恢复本质通用，
   Temporal/Camunda/云 Step Functions 可替代；若未来诊断编排转向 LLM Agent，这层价值会被大幅稀释。
   自身 `status="experimental"` 也说明未定型。
3. **`calculate_intelligence_value` 用 `eval()` 执行公式字符串**（`evi/_contracts/_base.py:450`）：
   虽然限制了 `{"__builtins__":{}}`，但 formula 若来自不可信配置仍有注入面。属于需要收紧的安全点。
4. **单体巨仓 + 大量兼容 shim**：17 个域 + 十几个 framework 能力塞进一个 pip 包，靠 extras 切分依赖；
   `curve_tightening`/`curve_spotwelding` 兼容别名、`pipeline_executor` shim、
   `agent/_contracts/models.py` 全是 re-export facade——技术债/迁移半成品痕迹多，
   CHANGELOG 达 126KB 印证了高频重构。
5. **反馈/eval 未框架化**：点焊域范本很好，但跨域靠"照抄 spc/spotwelding"约定，没有统一的
   framework 级反馈轨迹/eval/rubric 抽象——数据飞轮的复用能力受限（见 §4）。
6. **重度绑定自有基础设施**：dokku-admin / workstation-runtime / 云效 / pyarmor / RustFS 深度耦合，
   compiler 这层的"通用性"打折，实际迁移到别的部署栈成本很高。

---

## 附：待深挖（本次未展开，供后续）

- `packages/lisen-agent-ws-runtime`（Python WS runtime）与 `agent-ws-client`（TS）——疑似另一条
  面向实时 Agent 会话的通道，与 BPMN 引擎的关系未确认。
- `framework/rpa`、`framework/studio`、`framework/cycle`、`framework/pipeline` 未逐一读源码。
- OWL 遍历策略（`_tree_engine.py` 后半）与 `ontology/_adapters/fault_tree_pipeline`（nl_to_fta、
  pdf_extractor、owl_builder）——从 PDF/自然语言构建故障树的链路，可能是被 LLM 吞掉/也可能是纵向
  知识沉淀的关键，值得单独深挖。
- `domains/scheduling`（soft_rules + 排产）、`domains/param`（多种推荐子域）的算法深度。
