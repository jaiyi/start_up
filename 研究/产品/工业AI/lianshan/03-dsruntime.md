# 03 · dsruntime（workstation-runtime）代码仓深度分析

> 分析对象：`/Users/lijiayi/lianshan/agent/dsruntime`
> 定位：连山 Monday 工业 AI 产品的「运行时执行核心 + 控制面 + dsapp 产品面」三合一仓
> 分析方法：文档只作参考，结论全部来自实际读过的核心代码与 db schema；未读透处标注「待深挖」。
> 阅读日期基准：2026-09-14

---

## 1. 一句话定位 + 技术栈

**一句话定位**：dsruntime（部署名 `workstation-runtime`）是连山工业 AI 的**热路径执行大脑 + 交付控制面 + dsapp 产品面**三合一的单体 Dokku 应用——它消费 `lads` 冷路径产出的唯一交接物 Bundle，围绕 PostgreSQL 主线跑「事件感知 → 推理决策 → 动作执行 → 人在环审核 → 反馈沉淀」的数据闭环，并对外承载 dsapp 生命周期/Bundle 交付/验收台账的权威真相源。

**技术栈**（证据：`README.md`、`AGENTS.md`、`workflow.py`、migration 025）：

| 层 | 技术选型 |
|----|---------|
| 语言/运行时 | Python 3.11+（Async-First 生产 I/O 路径），`python3` |
| Web/API | FastAPI（控制面 `dscore` :8081）+ nginx/React SPA（`web` :8080 网关） |
| 编排引擎 | LangGraph（StateGraph + PostgresSaver checkpointer + `interrupt()` 做 HITL），BPMN/SpiffWorkflow + R6 审计 |
| 数据主线 | PostgreSQL，扩展 **pgmq**（持久消息队列）、**pgvector**（向量相似）、**Apache AGE**（本体图谱/openCypher），外加 DMN 决策表 |
| 消息 | 恰好 7 条 PGMQ 队列（`runtime_events`/`edge.executer.results`/`edge.collector.events`/`edge.inference.results`/`bundle.lifecycle.events`/`workstation_sync_ack`/`dsclaw_workorder_updated`），`pg_notify` 只做瞬时信号，`pg_net` 做对外 HTTP；**禁止 Kafka/Faust 第二套后端** |
| 大对象 | RustFS/S3（`workstation-bundles`/`workstation-models`/`workstation-artifacts`），bytes 出 PG 但 metadata+向量必须回 PG |
| 进程模型 | 3 进程：`web`（网关）、`dscore`（控制面 FastAPI）、`agentgraph`（`lisen_runtime_core.pgmq_worker`，Prometheus :9090） |
| 外部包硬依赖 | `dsbot[mcp]>=3.2.2,<4`（EVI 计算/persona core/blueprint MCP），`dsproject-profiles>=0.16.4,<1` |

> **仓库结构关键提示（facade 模式）**：`control_plane/` 与 `hot_path/` 顶层目录只是薄门面（facade），真实实现全在 `lisen_runtime_core/`（control_plane 348 个 py、hot_path 149 个 py）。这是 README「Migration note」记载的物理收敛第 1 阶段——vendor 两棵源码树进 `workstation-runtime/vendor/`，用 `lisen_runtime_core.*` 门面做渐进命名空间迁移，保持旧 import 与 PG schema 稳定。分析核心代码时目标应锁定 `lisen_runtime_core/`。

---

## 2. 核心模块与数据流

dsruntime 内部实际是「三个尺度」的执行体（`docs/data-loop-collaboration.md` § 0.2）：**control_plane = 交付/控制面**，**hot_path = 运行时热路径**，**agent_coach = 售前咨询/蓝图/EVI 评估面**。db 是把三者串起来的脊柱。

### 2.1 control_plane（控制面 / 交付台账）

职责（`AGENTS.md` Project Overview + `lisen_runtime_core/control_plane/`）：

- **dsapp 生命周期权威真相源**：`agents_runtime.dsapp_lifecycle_record`（`draft/active/archived`）+ `dsapp_lifecycle_event`。状态机在 `control_plane/dsapp_lifecycle.py::DSAPP_VALID_TRANSITIONS` 与 `BUNDLE_DELIVERY_VALID_TRANSITIONS`。
- **Bundle 交付水位管理**：`agents_runtime.bundle.delivery_state`（`created→deployed→published→superseded` 单向递增，migration 068 起改为「节点级派发」，允许同 dsapp 多条 in-delivery bundle 并存做灰度）。
- **是 `lads publish/deploy` 的 consumer**：通过 HTTP API 接收状态推进 + AcceptanceReport 上传，**不主动 push 状态给 lads、不直接操作 dokku**。基础设施变更全归 lads CLI + dokku-admin。
- **v2 AcceptanceReport 4 层验收台账**：`agents_runtime.dsapp_acceptance_report`（migration 016/067/069），4 层检查 = `pipeline_phases` / `app_health` / `pg_service` / `pg_extensions`（pgmq/pgvector/AGE loaded）/ `target_dispatch`。仅 `verdict=passed` 才把 Bundle 水位提到 `deployed`。
- **控制面路由**：`api/routes/` 下代理各外挂——`dsbase_samples.py`（simulator 收集段）、`dsbase_ragflow.py`（RAG 外挂）、`iwork.py`/`ipush.py`（dsclaw 工单/HITL 审核）、`training_router.py`+`dsbase_mlflow.py`（aiflow 训练触发/只读指标）、`data-loop/postgres`（5 能力面聚合 info/pgmq/ontology/vector/push）。

### 2.2 hot_path（运行时热路径 / LangGraph 大脑）

这是「数据闭环运行时主线」的落地。核心是 `lisen_runtime_core/hot_path/runtime/graph/workflow.py::build_runtime_workflow()`，一条三层 LangGraph：

```
load_event → persist_event_ownership → intent_router
   → [条件路由 route_by_subgraph] → 专家子图之一：
        · generic_diagnosis_subgraph（通用诊断）
        · battery_thermal_safety_subgraph（电池热安全）
        · forecast_error_diagnosis_subgraph（预测误差诊断）
   → build_decision → check_policy_gate → build_actions
   → check_human_review  ← HITL 锚点（interrupt()）
   → execute_bpmn → execute_actions → build_feedback → persist_runtime → END
```

对应 `docs/data-loop-collaboration.md` § 0.1 的运行时闭环：**mq 进数据 → 预警/预测判定 → ontology 业务判断 → vector 找相似历史案例 → 推消息（IM/拉工单）**。热路径服务在 `hot_path/runtime/services/`：`age_service`/`pg_age_service`（AGE 本体三源融合之一）、`pg_vector_service`（向量相似案例）、`confidence_decay_decision`/`decision_service`（置信度衰减决策）、`action_service`、`bundle_resolver`（加载 Bundle）。

**HITL 锚点细节**（`graph/nodes/check_human_review.py`，实际读过 497 行）：

- 仅当 `decision.human_review_required=True` 且未整体委托给 dsclaw collaboration-shell 工单时才真正挂起。
- **业务面 `graph_checkpoint` 行在 `interrupt()` 之前先落库**：用 `uuid5(namespace, "{thread_id}:check_human_review:{decision_identity}")` 生成确定性 checkpoint_id，使节点重放（replay）复用同一行而非创建第二个人审任务（幂等）。
- 无 checkpointer 时 fail-open（记 warning 直接放行），有则写 `waiting_human` 状态 + SLA deadline（默认 72h，`LISEN_HITL_SLA_HOURS` 可覆盖）。
- resume 后把人类反馈 merge 进 `state.decision`：`modified_root_causes`（强类型化为 `RootCauseCandidate`）、`decision_after_human`；`approval_status=rejected` + `override_fusion_weights` 触发 reject-rerun，`decision_version+1` 原地重决策。

### 2.3 agent_coach（售前咨询 / 蓝图 / EVI 评估面）

职责（`agent_coach/` 目录 + `evi_engine.py` 实际读过）：面向客户的「三步苏格拉底式教练对话 → 抽取业务蓝图 → EVI（预期价值）量化」。

- `coach/evi_engine.py`：**不 vendor dsbot 代码**，通过 `import dsbot` 动态定位 pip 包内 `skills/step-evi-test/modules/<en_name>.py` 的 `Calculate` 类算 EVI 系数（`value = (i_h·t_h + i_m·t_m + i_s·t_s)×p; total = value×event_num`），backend 与 dsbot 保持单一真相源。**关键防伪设计**：`_apply_data_sufficiency()` 数据充分度门禁——客户没填够 key_field（`filled_ratio<0.75`）就把裸数字（`annual_benefit_min/max_cny`）抹成 None，前端渲染「待量化」，防止 LLM/默认值胡编收益。支持 `EVI_ENGINE_BACKEND=import|mcp` 双后端。
- `coach/socratic_engine.py`/`prompt_builder.py`/`blueprint_dsapp_linker.py`/`progress_monitor.py`/`dsbot_mcp_client.py` + `defaults/*.yaml`（scenarios/ai_capabilities/evi_placeholder/report_template）。

### 2.4 db schema（脊柱，migration 025 = canonical baseline，884 行）

migration 目录 `db/migrations/` 有 145 个 sql（001–085，含 _down 对）。`025_runtime_ledger_baseline.sql` 是权威基线，`grep CREATE TABLE` 确认的关键表：

| Schema.表 | 存什么 | 闭环角色 |
|-----------|--------|---------|
| `agents_runtime.execution_run`（L453） | 单次执行全轨迹：`perception_data`/`decision_data`/`actions_data`/`feedback_data`（全 JSONB）+ `matched_rules`/`actions_triggered`/`policy_decision`/`drive_mode` | **闭环轨迹主表** |
| `agents_runtime.human_feedback`（L519） | HITL 修正：`trigger_id`/`user_id`/`user_role`/`decision`/`feedback_content` | **人类纠正** |
| `agents_runtime.ipush_trigger`（L495） | `confidence_score`/`business_impact`/`action_risk`/`target_roles`/`sla_seconds` | 推送触发 |
| `evi_value.evi_record`（L536） | `objective_id`/`baseline_value`/`current_value`/`target_value`/`value_delta`/`settlement_status`/`attribution_rule` | **价值归因** |
| `evi_value.business_objective`（L16） | `metric_name`/`metric_definition`/baseline/target/`optimization_direction`/`guardrails` | 指标框定 |
| `agents_runtime.diagnosis_outcome`（L674） | `diagnosis_path`/`info_gain_updates`（JSONB）/`fault_tree_id` | **信息增益/诊断** |
| `agents_runtime.graph_checkpoint`（L653） | `checkpoint_state`（JSONB） | HITL 挂起/恢复 |
| `agents_runtime.work_order`/`work_order_task`/`human_task_decision`（L591/613/635） | 工单 + 人工任务决策 | HITL 工单 |
| Bundle 族（L124–354） | `bundle`/`runtime_artifact`/`runtime_manifest`/`bundle_release_record`/`bundle_install_record`/`agent_instance` | 交付台账 |

其余关键 migration：033（`edge_shadow_result` 影子推理）、072（`inference_result` 加 dsproject_id/occurrence_id，生产推理）、022/023/083（`coach_sessions` + step_summaries）、073/075（ontology governance + runtime_owned_graph_projection）、082（`runtime_composition_execution_journal` 执行日志）、058/068（Bundle 交付生命周期）。

---

## 3. 横向 vs 纵向归属

判定尺子：**「把横向框架（LangGraph/pgmq/AGE/BPMN/FastAPI）换掉，这块能力还活得下来吗？」** 活得下来 = 承载领域资产的纵向；活不下来 = 通用运行时/控制面能力的横向。

### 3.1 横向（通用运行时 / 控制面能力，可迁移、无行业绑定）

- **LangGraph 三层图骨架 + HITL interrupt 机制**（`workflow.py`/`check_human_review.py`）：通用编排 + 人在环模式，换任何行业都成立。
- **Bundle 交付/生命周期/验收台账**（control_plane + migration 016/025/058/068）：`draft/active/archived` × `created/deployed/published/superseded` 状态机、AcceptanceReport 4 层验收、节点级派发——纯交付平台能力。
- **PG 脊柱 + 7 队列 + pgmq/pg_notify 消息原语**：通用事件总线约束。
- **execution_run/graph_checkpoint/work_order 台账骨架**：字段是 JSONB 通用容器，schema 本身不含行业语义。
- **facade 迁移架构、dokku 部署契约、EVI 计算引擎的 dsbot 动态加载机制**（`evi_engine.py` 的 importlib 加载 + 数据充分度门禁）：通用工程能力。

### 3.2 纵向（承载领域资产，横向框架换掉也带得走）

- **三个专家诊断子图**（`generic_diagnosis`/`battery_thermal_safety`/`forecast_error_diagnosis`）：**电池热安全**、**预测误差诊断**是硬工业领域知识——即便不用 LangGraph，这套故障树/诊断路径逻辑就是资产。
- **AGE 本体图谱（ontology）+ knowledge_projection**（migration 073/075、F3 深挖记录）：`SpcDimensionSchema` owl:Class、`forecast.example.com/automotive_parts.owl` 车辆预测本体——具体行业的领域模型/业务判断规则，是最硬的纵向资产。
- **EVI 情报类型注册表 + 场景库**（`evi_engine.py` intelligence.json + `defaults/scenarios.yaml`/`ai_capabilities.yaml`）：制造业各场景的收益公式与 key_field 定义——纵向价值资产。
- **diagnosis_outcome 的 fault_tree_id / info_gain / diagnosis_path**：故障树 + 信息增益是领域诊断沉淀。
- **DMN 决策表 + 匹配规则**（`execution_run.matched_rules`/`policy_decision`）：业务判定规则，纵向。
- **coach_sessions 蓝图**（migration 022）：客户场景 → AI 能力 → dsapp 蓝图的行业方法论沉淀。

**结论**：dsruntime 是「横向执行框架为主、纵向领域资产以数据/配置形态挂载」的架构。代码骨架高度通用（换行业不用改图结构），领域知识集中沉淀在**专家子图逻辑 + AGE 本体 + EVI 场景库 + DMN 规则 + 故障树**这几处——这也是产品真正的护城河所在。

---

## 4. 反馈闭环 / 数据资产痕迹（核心焦点）

**结论先行：闭环是「已实现」而非 PPT 概念。** 「输入→推理→输出→实际结果（ground_truth）→人类纠正（correction）→再训练」的完整轨迹在代码与 schema 双层都能坐实。逐段证据：

### 4.1 输入 → 推理 → 输出（轨迹落库）

`agents_runtime.execution_run`（migration 025 L453）单表承载全轨迹四段 JSONB：`perception_data`（感知/输入）→ `decision_data`（推理/决策）→ `actions_data`（输出/动作）→ `feedback_data`（反馈）。写入由 `graph/nodes/check_human_review.py::build_execution_run_record()` + `persist_runtime` 节点完成，并有 `runtime_composition_execution_journal`（migration 082）做事件溯源（run.suspended/resumed 等 event_kind）。

### 4.2 输出 → 实际结果（ground_truth 分流）

**影子 vs 生产双表分流是本仓最有力的 ground_truth 证据**：

- `agents_runtime.edge_shadow_result`（migration 033）：dsapp 处于 `deployed`（影子）态时的边缘推理结果，字段 `dsproject_id`/`device_id`/`model_ref`/`predictions`(JSONB)/`status`/`envelope_event_id`。
- `agents_runtime.inference_result`（migration 072 加 `dsproject_id`+`occurrence_id`）：`published`（生产）态推理结果。

影子结果与生产结果分表，正是「新模型上线前拿真实数据对比实际结果」的 A/B 影子评估基础设施。

### 4.3 人类纠正（correction / HITL）

三处坐实：

1. **schema**：`agents_runtime.human_feedback`（L519，`decision`/`user_role`/`feedback_content`）+ `human_task_decision`（L635）。
2. **契约**：`hot_path/runtime/contracts/human_feedback.py::HumanFeedbackPayload`——`decision` 枚举 = `Approve/Deny/Correction/Alternative`，字段含 `modified_root_causes`/`modified_actions`/`override_fusion_weights`/`approval_status`。
3. **执行**：`check_human_review.py` 把 resume 的人类反馈 merge 回 decision，`rejected`+`override_fusion_weights` 触发原地重决策（`decision_version+1`）——**人类修正真的回流并改变了 Agent 行为**，不是只记日志。

### 4.4 价值归因 + 信息增益（评估沉淀）

- `evi_value.evi_record`（L536）：`baseline/current/target_value` + `value_delta` + `settlement_status` + `attribution_rule`——每次执行的价值兑现与归因。
- `agents_runtime.diagnosis_outcome`（L674）：`info_gain_updates` + `diagnosis_path` + `fault_tree_id`。
- `hot_path/runtime/services/feedback_service.py`：`PostgresFeedbackService` 计算 `info_gain = outcome_quality - decision.confidence`（success=1.0/partial=0.5/failed=0.0）——量化「这次推理比预期好/差多少」。
- `contracts/feedback.py::FeedbackProcessingResult`：`value_delta`/`labels`/`graph_patch_candidates`/`info_gain`/`vector_corrections`——反馈可回补图谱与向量。

### 4.5 闭环回到再训练（detect → signal → recompile）

**闭环的最后一环由 dsruntime 与 lads 分工完成，边界代码级写死**：

- `hot_path/runtime/services/feedback_export_service.py::PgFeedbackExportService`：5 个导出方法（export_execution_runs / evi_records / human_feedback / diagnosis_outcomes + analyse_bundle）。`analyse_bundle` 启发式：`success_rate<0.8`→drift、`avg_value_delta<0`→calibration、drift且`total_runs>100`→retrain。消费方 = lads（拿 info_gain/stats）+ dsproject-profiles（知识改进）。
- `control_plane/feedback_consumption.py::FeedbackConsumptionService`：消费侧三分析——`detect_drift`（失败率阈值）、`suggest_calibration`（人类 override 率 + EVI 退化 → 提高置信阈值）、`evaluate_retrain`（diagnosis_outcome 累计 info_gain）。**架构边界明写**：「workstation-runtime 检测并发信号；lads 消费信号并触发重编译」。
- `agent_coach` 侧闭环：`coach_sessions`（migration 022/083）沉淀教练对话 + 蓝图 + step_summaries，`evi_engine` 做价值评估——售前评估资产的迭代沉淀。

**闭环完整度判定**：`感知(perception_data)→决策(decision_data)→动作(actions_data)→实际结果(inference_result vs edge_shadow_result 影子对照)→人类纠正(human_feedback，Approve/Deny/Correction/Alternative + override 重决策)→价值/增益沉淀(evi_record/diagnosis_outcome/info_gain)→漂移检测发信号(FeedbackConsumptionService)→lads 消费重编译→新 Bundle 回 PG(BundleResolver 加载)进入下一轮`。**七个环节全部有代码或 schema 落地，是本仓最扎实的部分。**

---

## 5. 亮点 & 疑点

### 5.1 亮点

1. **闭环是真的**（见 § 4）：轨迹四段 JSONB + 影子/生产双表 ground_truth + HITL 修正回流重决策 + info_gain/EVI 沉淀 + detect-signal-recompile 分工，七环闭合，工程完整度罕见。
2. **最小内核信仰的架构落地**：能力降级链（PG 内 → py → LLM → 小模型 → 多模型串并联）+「主线永远是 PG、处理完必回写」两条铁律，把 ragflow/dsclaw/aiflow/simulator/storage 收成围绕 PG 的外挂而非平级服务，架构收敛度高。
3. **EVI 数据充分度门禁**（`evi_engine.py::_apply_data_sufficiency`）：数据不足直接抹掉裸数字，从工程上杜绝售前收益吹牛，是难得的「诚实设计」。
4. **HITL 幂等 checkpoint**：确定性 uuid5 checkpoint_id + interrupt 前先落库，replay 安全，处理了分布式重放这个真实难点。
5. **dsbot 单一真相源**：EVI 公式不 vendor、动态 importlib 加载 pip 包，上游更新自动生效——避免公式漂移。
6. **AGE 本体闭环端到端打通**（AGENTS.md F3 记录 10 层根因链全修复）：ontology 图从真实部署 AGE 返回，是纵向领域资产真正跑通的证据。

### 5.2 疑点 / 待深挖

1. **facade/vendor 迁移半途**：`control_plane/`、`hot_path/` 顶层是门面，真身在 `lisen_runtime_core/vendor/`，README 明说是「物理收敛第 1 阶段，保留旧 submodule 供 rollback」。迁移未完成期间双份源码树的一致性风险 —— **待深挖**：vendor 树与 lisen_runtime_core 是否有代码分叉。
2. **专家子图仅 3 个且偏窄**（generic/battery_thermal/forecast_error）：battery_thermal_safety 高度垂直，通用性存疑，新增行业需要写新子图，纵向资产的可复制性 —— **待深挖**：generic_diagnosis 是否足够通用能覆盖多数场景。
3. **dsclaw 集成 Batch A 未接线**：`check_human_review.py` 注释明写 `ipush_work_order_id` 恒为 None、dsClaw review API「deliberately unwired」，HITL 到 dsclaw 的远端工单链路是占位——**人类补全业务上下文这一段闭环，工单侧尚未真正打通**（待深挖实际接线进度）。
4. **AcceptanceReport pipeline_phases 有 optimistic fallback**：dokku phase-report 拿不到时 fallback 到「optimistic pass」，验收可能假阳性（AGENTS.md 已标 F2 dokku-admin build-arg 不生效的技术债）。
5. **Brain readiness 是兼容投影**：AGENTS.md 明说基于 current Bundle `published` 的 Brain readiness 是「待迁移兼容投影，不能解释为业务激活真相」——存在语义误读风险。
6. **僵尸容器运维尾巴**（F3 遗留）：dokku deploy 后旧容器未在 60s 窗口下线，负载均衡命中旧代码——非代码缺陷但污染线上稳定性，属 dokku-admin 顽疾。
7. **feedback 消费的阈值全是硬编码启发式**（success_rate<0.8 / value_delta<0 / total_runs>100）：drift/retrain 判定阈值写死在代码，缺可配置化，不同行业/dsapp 可能需要不同阈值——**待深挖**是否有 per-dsapp 阈值配置。

---

*本文结论均来自实际读过的代码与 migration：`README.md`、`AGENTS.md`、`docs/data-loop-collaboration.md`、`db/migrations/025_runtime_ledger_baseline.sql`（884 行）、`033`/`072`/`022`、`graph/workflow.py`、`graph/nodes/check_human_review.py`（497 行）、`agent_coach/coach/evi_engine.py`、`services/feedback_service.py`/`feedback_export_service.py`、`control_plane/feedback_consumption.py`、`contracts/human_feedback.py`/`feedback.py`。标注「待深挖」处为未读透、不臆测的部分。*
