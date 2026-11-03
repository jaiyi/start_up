# 02 · lads —— 连山 Monday 工业 AI「计算底座」深度结构分析

> 分析对象：`/Users/lijiayi/lianshan/lads`（本次增补核查：`lisen-core` 分支，提交 `8a08fdc9`）。
> 方法：结合 `AGENTS.md`、`README.md`、`flow.yaml` 和所引模块源码分析；本次对照
> `lads/domains/` 的 28 份 `domain.toml` 与所列算法入口补查 §2.7。源码具备某项能力不等于
> dsproject 已接入、Bundle 已验收或客户环境已部署；未验证的运行效果不作推断。

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
lads/domains/     业务算法层（14 份顶层 + 14 份嵌套域清单；另有 param 命名空间）横向自治
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

### 2.7 业务算法域（`lads/domains/`：28 份域清单）

**口径与命名**：本次在 `lads/domains/` 查到 **14 份顶层 + 14 份嵌套 `domain.toml`**；嵌套项是
`audio.noload_classification`、`curve` 下 4 项（含拧紧下两项）和 `param` 下 9 项。
`param` 自身只有命名空间 `__init__.py`，**没有**独立域清单或统一的参数优化算法；`curve`
有清单，但状态为 `deprecated`，主要兼容转发 `curve.tightening`。不能把父级、子级和兼容入口
相加当作 28 个独立部署单元。SPC 清单标 `stable`，`curve` 标 `deprecated`，其余 26 份
标 `experimental`；这些仅是源码声明的成熟度，不是生产验收结果（见各域 `domain.toml`
及 `domains/param/__init__.py:1-3`、`domains/curve/domain.toml:8-13`）。

下表的 **`lads-domain-XXXX` 是按现有 manifest `id` 将点号换成连字符生成的拟议拆包名称／
文档索引**，例如 `curve.tightening.rules` → `lads-domain-curve-tightening-rules`；**目前并无
这些名字的独立发行包**。真实发行名为 `lads`（`pyproject.toml:47-54`），可按 extra
安装依赖（例如 `lads[spc]`），现有导入门面为 `lads.domains.<表中 id>`（点号照原样保留），
清单 ID 与发行名、extra、导入名不可混同。`pyproject.toml:9-44` 将领域 SQL、模型材料及
`domain.toml` 等作为包数据收集；这不表示每域都已独立构建、发布或部署。

**SPC 的七支柱是参考组织方式，并非 28 域都齐备的实际结构**：可按需拆为 public facade、
`_core` 计算、`_contracts` 契约、`_sql` 持久化、`_worker` 消费、`_trainer` 训练和
`_model` 推理适配。实际切片以各域清单的 `slices`、代码和调用入口为准：
`spc/domain.toml:5-29` 声明计算、评估、反馈、worker 等；`curve/domain.toml:8-13`
则无算法切片。表内“落地”是**源码输入 → 计算／编排 → 输出和消费入口**，不推断客户
`dsproject` 已接入、Bundle 已验收或现场效果。下表省略 `lads/domains/` 公共前缀；
`_core/…` 等路径均相对于**本行清单 ID 所在目录**；`domains/…` 从 `lads/` 起算。状态以本行的 `domain.toml` 为准。

**顶层域（14 份；路径约定见上）：**

| 拟议标识（清单 ID／导入门面后缀） | 源码实现的算法落地方式 | 入口、边界与证据 |
| --- | --- | --- |
| `lads-domain-audio`（`audio`） | 音频做 FFT／发动机阶次噪声特征，规则模型据特征判断 NVH；另有将原生 NVH 特征线性投到 768 维的检索投影，冷启动权重为固定种子初始化，不等同于已训练跨模态模型。 | `_core/_fft.py:5`、`_core/_vehicle_nvh_noise_order_method.py:55` → `_infer/_vehicle_nvh_noise_order_model.py:16`；`_model/_projection.py:37-54,90-98`。**不含**下方无负载 CNN 子域。 |
| `lads-domain-curve`（`curve`） | **兼容门面而非独立曲线算法**；现有清单无计算切片，目标为 `curve.tightening`。 | `domains/curve/domain.toml:2-13`、`domains/curve/__init__.py:1,110`；状态 `deprecated`。 |
| `lads-domain-cycletime_opt`（`cycletime_opt`） | 分别提供多口径瓶颈识别、堵／待损失追踪，以及以遗传搜索／Pareto 前沿产生线平衡候选；各算法在域内**未自动串成同一条执行流水线**。 | `_assessment/_bottleneck_algorithms.py:22,86,161,206`、`_assessment/_loss_trace_algorithms.py:203,271`；线平衡见 `_core/_line_balancing_algorithms.py:38,1951,2064`、`_core/_line_balancing_model.py:274-385`；候选方案不是实际调线回执。 |
| `lads-domain-electro_coating`（`electro_coating`） | 电泳工艺与膜厚样本预处理成特征，训练时按膜厚分位分层切分，配置选择 CatBoost 回归或 Ridge，再对新工艺参数预测膜厚。 | `_preprocessing/preprocessor.py:8,108` → `_core/model_trainer.py:17,35-65,132` → `_infer/inference_engine.py:27`；CatBoost 不可用时明确抛异常，并非必然有模型。 |
| `lads-domain-epms`（`epms`） | 设备多变量时序以 GMM 区分状态模式，按模式转移计算风险并融合健康分／多传感器工单确认；另有异常管线和 z-score 健康评分分支。 | `_core/_mtsage/gmm.py:55`、`_core/_mtsage/edges.py:48`、`_core/_mtsage/scoring.py:47,79` → `_infer/mtsage_model.py:34`；其他分支见 `_core/_liujue/pipeline_algorithm.py:11`、`_core/_health_score/scoring_engine.py:112` 和 `_worker/mtsage_tick_worker.py:39`。不是一种统一的故障判定模型。 |
| `lads-domain-fta`（`fta`） | 新工单的 SQL 触发消息进入 `fta_diagnose` pgmq；worker 将工单 ID 等映射为 `runtime_signal_outbox` 信号，下游 relay／数字员工接管诊断。**本域只实现触发与唤醒，并未实现故障树诊断算法。** | `_worker/_pgmq_worker.py:1-16,99-120`；诊断本体在外部 dsClaw，不能把信号发出视为故障根因已定位。 |
| `lads-domain-oee`（`oee`） | 从班次、设备运行和产出记录计算可用率、性能、良率与 JPH，在评估层组织指标推理及停机／损失归因。 | `_core/_availability.py:22`、`_core/_performance.py:94`、`_core/_yield.py:19`、`_core/_jph.py:39` → `_assessment/oee_infers.py:28,766,905,2260`、`_assessment/attribution_engine.py:10`；结果依赖实际事件口径与源数据。 |
| `lads-domain-outlier_detection`（`outlier_detection`） | 数值样本分别按三西格玛和分位数阈值检测离群点，返回统计判别；不是训练式异常分类。 | `_core/_three_sigma.py:12`、`_core/_percentile.py:12`；清单只有 core／contracts 切片，未见该域自带 worker／训练闭环（`domain.toml:8-17`）。 |
| `lads-domain-scheduling`（`scheduling`） | 场景编译为排程问题并展开 BOM 净需求；根据问题规模走直接／分解求解，细排有 OR-Tools CP-SAT 与启发式求解，产出排程并通过约束检查。 | `_workflow/compiler.py:48`、`_core/planner/_mrp.py:207` → `_workflow/service.py:82,96-176`、`_scheduler/detail/cpsat_spi.py:113,201`、`_core/evaluator/checker.py:73`；启发式回退须显式许可及安全检查（`_workflow/service.py:229-250`），不是无条件产出可执行排程。 |
| `lads-domain-smart_loading`（`smart_loading`） | 根据订单构建箱体，遗传搜索组合装箱次序，用三维极点放置评估车厢装载率，输出装载候选及整车运输评估。 | `_core/_engine.py:198,254,519`、`_core/_evaluation.py:126` → `_assessment/_ftl_model.py:72`；结果是空间约束下的计算方案，不代表现场装车完成。 |
| `lads-domain-spare_parts_pred`（`spare_parts_pred`） | 备件历史样本训练神经网络并由预测管线输出需求／库存预测；另有安全库存计算，以及以独立输入做库存合理性校验的**另一条管线**，不能默认把二者当作预测后的自动校正。 | `_trainer/spare_parts_model_trainer.py:68,208`、`_infer/spare_parts_pipeline.py:79-102,123-136`；安全库存见 `_core/spare_parts_stock_calculator.py:113`，独立校验见 `_infer/reasonableness_pipeline.py:81-109,127-144`。 |
| `lads-domain-spc`（`spc`） | 历史过程样本拟合控制限，在线测量进入 IMR／Xbar-R／Xbar-S／EWMA／CUSUM／T² 控制图，按 Nelson 规则判失控并计算 Cpk；worker 消费样本后进入评估／反馈投影。 | `_core/_chart.py:493,538,592,646,859,1105`、`_core/_nelson_rules.py:109`、`_core/_capability.py:54` → `_trainer/_trainer.py`、`_worker/_pgmq_worker.py:42`；**唯一 `stable` 清单**（`domain.toml:40`），不等于全部客户工序已配置。 |
| `lads-domain-standard_labor_hour_generation`（`standard_labor_hour_generation`） | 工作要素、标准工时表与装配标准表进入文本 BM25 匹配和工位／车型映射，生成跨车型工时记录。 | `_core/bm25_matcher.py:8,84`、`_core/station_line_mapping.py:50` → `_model/labor_hour_engine.py:19` → `_infer/inference_engine.py:17,84,117`；匹配结果需对齐工厂真实标准。 |
| `lads-domain-vision`（`vision`） | 已有 YOLO／PaddleOCR 训练与推理适配；图像／OCR 结果经框位置、阈值等节点后处理并由节点流水线编排。 | `_trainer/_yolo_train.py:49,380`、`_trainer/_ocr_train.py:281,551` → `_infer/_yolo_nodes.py:13`、`_infer/_ocr_nodes.py:13`、`_infer/postprocessing/_node_ops/_bbox_nodes.py:240`、`_workflow/_nodeengine/pipeline.py`；是模型集成与编排，并非在本仓发明新检测网络。 |

**嵌套域（`audio` 1 项、`curve` 4 项；下表独立于父级能力计数）：**

| 拟议标识（清单 ID／导入门面后缀） | 源码实现的算法落地方式 | 入口、边界与证据 |
| --- | --- | --- |
| `lads-domain-audio-noload_classification`（`audio.noload_classification`） | 无负载音频有**不同模型路径**：Mel 时频特征的 Mel-bag CNN 对原始文件单位训练并输出未校准分类分数；另有音频 CNN／ResNet + XGB 训练和 NVH CNN 推理接口。不能用后一条推理器证明前一条模型已接入同一生产推理链。 | Mel-bag 见 `_model/_mel_bag_cnn.py:7`、`_trainer/_mel_bag_train.py:73-117,163-184`；另一条见 `_trainer/audio_cnn_model.py:84`、`_infer/nvh_cnn_infer.py:88`；基础分类入口 `_model/audio_classifier.py:35,1315`。 |
| `lads-domain-curve-tightening`（`curve.tightening`） | 拧紧角度／扭矩曲线先定位主拧紧段，按多步曲线模型检验；另有同批次曲线异常评估，供不同分析路径使用。 | `_core/_main_tightening_segmentation.py:17`、`_core/_cot_model/_multistep_evaluator.py:36`、`_infer/curve_cohort_anomaly_engine.py:68`；具体规则判定和参数包另列子域。 |
| `lads-domain-curve-tightening-rules`（`curve.tightening.rules`） | 原始曲线清洗、按拧紧阶段切分，再以专家模板／早期 NG 规则判定 OK／NG 和故障类型。 | `_core/_preprocess.py:87` → `_core/_phase_split.py:13` → `_core/_evaluator.py:196,225` → `_worker/_pgmq_worker.py:68`；需要真实模板配置，不等同于上一行的统计 cohort 算法。 |
| `lads-domain-curve-tightening-parameter_package`（`curve.tightening.parameter_package`） | 冷路径从历史曲线训练参数包，热路径将新曲线和参数包交由评估器验收并消费 pgmq 消息。 | `_trainer/_trainer.py:45,58` → `_core/_evaluator.py:21` → `_worker/_pgmq_worker.py:13`；训练参数包与运行时曲线必须有匹配配置。 |
| `lads-domain-curve-spotwelding`（`curve.spotwelding`） | 历史焊点曲线训练标准包，新焊点曲线并行接受包络、FFT、斜率、DTW、极值等检测；反馈样本支持两种回测：复用旧检测结果与用新配置全量重放。 | `_trainer/_trainer.py` → `_core/_evaluator.py:102` → `_worker/_pgmq_worker.py:32`、`_backtest/_runner.py:23`；有回测机制不等于已有现场质量收益，详见 §4.2。 |

**`param` 命名空间下的 9 个独立子域**（`param/__init__.py:1-3` 无自身清单；以下各项均为 `experimental`）：

| 拟议标识（清单 ID／导入门面后缀） | 源码实现的算法落地方式 | 入口、边界与证据 |
| --- | --- | --- |
| `lads-domain-param-mgmt`（`param.mgmt`） | 从 OWL 维度／约束定义解析参数层级，组织观测与推荐样本的批量写入及数据库 schema 管理；它是参数数据底座而非推荐器。 | `_core/_dimension_schema.py:37` → `_ingestion/_batch_writer.py:50,92`、`_sql/_schema_manager.py:36`。 |
| `lads-domain-param-recom`（`param.recom`） | 测试参数与历史良品样本按文本 embedding 余弦相似度及数值字段相似度加权比较，从历史 OK 样本挑 Top-1 参数。 | `_model/_embedder.py:28` → `_core/_similarity.py:44,83` → `_worker/_pgmq_worker.py:32`；历史相似不等于自动保证工艺合格。 |
| `lads-domain-param-gpr_recom`（`param.gpr_recom`） | 样本标准化后冷训练高斯过程回归代理模型；多起点约束搜索在模型上找推荐参数，代码含 L-BFGS-B 和差分进化方法。 | `_trainer/_trainer.py:21` → `_core/_search.py:100`、`_core/_optimizer.py:29,85` → `_worker/_pgmq_worker.py:20`；优化预测需受训练分布与硬约束约束。 |
| `lads-domain-param-nn_recom`（`param.nn_recom`） | 数值参数与文本 embedding 联合构造特征，训练 CascadeNet，推理得神经网络驱动的参数候选。 | `_core/_features.py:17,90`、`_core/_network.py:14` → `_trainer/_trainer.py:39`、`_worker/_pgmq_worker.py:19`。 |
| `lads-domain-param-rule_tune`（`param.rule_tune`） | 专家 IF–THEN 规则先产生调参方向，再以 CP-SAT 将候选限制在物理硬约束内。 | `_core/_rule_engine.py:15` → `_core/_cp_solver.py:30` → `_worker/_pgmq_worker.py:16`；不绕过人工工艺规则。 |
| `lads-domain-param-behavior_tune`（`param.behavior_tune`） | 经验模板产生动作集合，Beta 策略对历史行为打分，并施加物理顺序限制形成调参建议。 | `_core/_template.py:16` → `_core/_policy.py:118`、`_core/_ordering.py:11` → `_trainer/_trainer.py:32`、`_worker/_pgmq_worker.py:16`。 |
| `lads-domain-param-sensitivity_tune`（`param.sensitivity_tune`） | 训练梯度提升回归代理；扰动输入估计目标对参数的敏感度，结合补偿规则生成调参建议。 | `_trainer/_trainer.py:27` → `_core/_perturbation.py:32`、`_core/_adjustment.py:16` → `_worker/_pgmq_worker.py:22`；敏感度来自代理模型而非在线设备因果实验。 |
| `lads-domain-param-opt`（`param.opt`） | 外部触发／反馈进入多轮 proposal→dispatch→feedback 状态机，NG 规则控制何时阻断并由分阶段 pgmq worker 推进；**它编排闭环，不自带参数推荐求解器**。 | `_workflow/_app.py:123,182-198`、`_core/_ng_rules.py:28`、`_worker/_pgmq_workers.py:15,60,86`；设备执行、外部 provider 与人工反馈必须由项目环境接通。 |
| `lads-domain-param-wave_solder`（`param.wave_solder`） | 选焊坐标／工位输入做 TSP 路径优化（≤8 个原子穷举，>8 个用最近邻 + 2-opt），另做工位、喷嘴线体平衡；预置随机森林识别器参与器件识别，输出重建后的 NC／Coordinate、Basic CSV 与时长。 | `_core/_lb/_wave_solder/_optimizer.py:290-322`、`_core/_line_balance.py:140` → `_model/_path_optimization_infer.py:19`、`_model/_line_balance_infer.py:35`；**不产出参数提议**，不走 `param.opt` 的 proposal 信封（`param/wave_solder/README.md:6-24`）。 |

**如何理解“落地”**：以上既有纯计算、预训练模型适配，也有队列消费和跨组件编排；是否有
`_worker`、`_trainer`、`_sql`、反馈回测取决于具体域。源码清单状态、算法入口与数据流
只能证明 SDK 的实现边界；要证实某一工厂的上线、实际工况表现、闭环质量或降本结果，还要查
对应 `dsproject` 配置／Bundle 验收、数据权限、热路径记录及业务侧效果回执，本次均未核。

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
4. **单体巨仓 + 兼容 shim**：28 份域清单（含 14 份嵌套清单；`param` 仅为命名空间）与十几个 framework 能力仍归一个 `lads` 发行包，extras 只切分可选依赖；
   `curve` 的 deprecated 兼容门面、`pipeline_executor` shim、
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
