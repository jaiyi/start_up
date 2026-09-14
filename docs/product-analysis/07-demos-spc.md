# 产品仓库分析 07：demos-spc（SPC 智能过程管控）

> 分析日期：2026-09-14  
> 分析对象：`/Users/lijiayi/lianshan/agent/demos`  
> 当前版本：`787cea6`（工作区有未提交改动：`action_contracts/iwork_create.yaml`、`contracts/knowledge_projection.yaml`、`contracts/ontology/evidence_lineage.yaml`、`decision_capabilities/glue_root_cause.yaml`、`project.lock`、`pyproject.toml`、`tests/test_operational_ontology_contracts.py`、`tests/test_spc_bundle_assets.py`、`workflows/spc_alert_dispatch.dmn`）  
> 方法：实读 `AGENTS.md`、`pyproject.toml`、`docs/spc-architecture-for-proposal.md`、`agent/digital_employees.yaml`、仓库结构与关键 pipeline/配置路径。  
> 重要说明：本仓是 `demos-spc` dsproject，当前工作区存在未提交改动；本文按“仓库当前可见状态”分析，不把未提交内容视为已发布事实。

---

## 1. 一句话定位 + 技术栈

**一句话定位**：`demos` 是连山理想工厂 SPC（统计过程控制）智能过程管控 dsproject：把点焊、涂胶、LASD 等工艺测量数据实时/批量接入 PostgreSQL，自动评估控制图适用性、训练控制限、按 Nelson Rules 在线判异，推送飞书交互卡片，并把严重异常桥接到 workstation-runtime / dsclaw 数字员工做根因诊断与反馈闭环。

**技术栈**：

- 语言/运行时：Python 3.11
- 项目框架：LADS dsproject，profile = `manufacturing_control`
- 核心依赖：`lads[spc,integration,iweb]==3.47.119`、psycopg、kafka-python、confluent-kafka、CloudQuery/aiohttp、NumPy/SciPy、matplotlib、Pillow
- 数据平面：PostgreSQL + pgmq；SPC schema（samples / measurements / control_limits / rule_results / capability_results / window_config 等）
- 数据源：Kafka 实时流（点焊、SCA 涂胶）、CloudQuery 批量（LASD、主档/设备层级）
- 判异：控制图 + Nelson Rules + Cpk/Cp/Pp/Ppk + assessment/trainer
- 运行：LADS iWeb、pgmq worker、cron retrain/assessment/feedback projector/chart image sender
- 推送：pg_ipush / 飞书交互卡片，支持按钮回调
- Agent：dsclaw 数字员工（SPC 质量诊断员工、点焊追溯排查员工），主模型 `gpt-5.5`
- 知识：OWL 本体（`spc_dimension.owl`、`spc_diagnosis.owl`、`glue_defect_fta.owl`、`weld_trace.owl`）+ seed rules

---

## 2. 核心模块与数据流

### 2.1 从“采-判-报-诊-值”的产品价值链看

`docs/spc-architecture-for-proposal.md` 把产品价值链定义为五步：

```text
① 采：实时汇聚点焊/涂胶等生产测量数据
  → ② 判：控制图 + 判异规则自动识别质量异常
  → ③ 报：秒级推送到责任人，可一键处理/忽略
  → ④ 诊：AI 数字员工做人机料法环根因分析
  → ⑤ 值：把避免的返工/索赔损失量化为 EVI
```

这也是本仓的产品主线：不只是画控制图，而是把质量异常从发现、触达、处置、诊断、收益核算串成闭环。

### 2.2 数据接入与 SPC 主表

`AGENTS.md` 和仓库结构显示，本仓围绕多条数据集成 pipeline：

- `data_integrate/spot_welding_spc/`：点焊 Kafka 直写
- `data_integrate/sca_spc/`：涂胶 SCA Kafka 消费
- `data_integrate/lasd_spc/`：LASD CloudQuery 批量拉取
- `data_integrate/czb_device_hierarchy/`、`czn_device_hierarchy/`：设备层级同步
- `data_integrate/czb_test_standard_detail/`、`czn_test_standard_detail/`：工艺主档同步

核心表关系：

```text
spc.observed_systems
  → spc.instruments
    → spc.windows
      → spc.samples
        → spc.measurements
      → spc.control_limits
      → spc.rule_results
      → spc.capability_results
      → spc.window_config

spc.dim_testing_item / spc.dim_device_hierarchy
spc.push_rules / spc.push_log / spc.alert_feedback
```

### 2.3 在线判异、控制限训练与自动评估

`pyproject.toml` 声明了运行进程：

- `web`：iWeb 可视化
- `worker`：pgmq worker，在线消费判异任务
- `spot_welding_spc` / `sca_spc` / `sca_spc_czn`：实时数据接入 worker

定时任务：

- `spc_assessment_cron`：每日 02:40 做全量适用性评估
- `spc_retrain_cron`：每小时重训控制限与 Cpk
- `spc_feedback_projector`：每分钟投影工单/推卡反馈
- `spc_chart_image_sender`：每分钟给最近推送告警附控制图截图
- 主档/设备层级同步：每日低频同步

`AGENTS.md` 描述了训练与评估的工程逻辑：系统自动判断窗口适合哪种控制图、是否需要 Box-Cox、是否要 percentile 兜底、是否存在趋势/偏移，并通过 `sigma_multiple` / `target_arl0` 统一控制告警灵敏度。

### 2.4 告警、推卡与 runtime 桥接

关键链路：

```text
measurement 写入
  → pgmq spc_evaluate / worker 判异
  → spc.rule_results
  → PG trigger / sink 产生 critical violation 推送
  → iPush 飞书交互卡片（确认处理 / 忽略）
  → spc_feedback_projector 把按钮反馈投影为 true_positive / false_positive
  → runtime_bridge 把关键 SPC 事件转 runtime.signal.outbox
  → workstation-runtime runtime_events
  → dsclaw 数字员工诊断
```

`pyproject.toml` 中 `[project.entry-points."lads.messaging.sinks"]` 声明 `runtime_bridge = sinks.spc_runtime_bridge_sink:spc_runtime_bridge_sink`，说明本仓已经把 SPC 事件作为 runtime signal 的源头，而不是只在本应用内闭环。

### 2.5 数字员工

`agent/digital_employees.yaml` 声明两个员工：

| 员工 | 职责 | 触发 / 能力 |
|------|------|-------------|
| `spc-quality-diagnostician` / SPC 质量诊断员工 | 分析 SPC 严重违规和 Cpk 退化，提交可追溯诊断并等待人工确认 | on_message；`event_type=spc_cpk_trend`；能力包括 `query-spc-data`、`verify-measure-effect`、`query-glue-change-log`、`query-environment-data` |
| `weld-trace-investigator` / 点焊追溯排查员工 | 工程师输入车号后追溯焊点检测数据与 ±50 时序邻居异常 | 能力 `list-weld-options`、`query-weld-trace` |

这使本仓从“SPC 监控工具”进一步扩展为“质量诊断员工的事件源与证据库”。

---

## 3. 横向 vs 纵向归属

### 横向（通用过程控制平台能力）

| 内容 | 判断 |
|------|------|
| LADS dsproject / Bundle / iWeb / pyproject app 声明 | 通用应用框架 |
| PostgreSQL + pgmq + worker/cron 运行模型 | 通用事件处理与调度能力 |
| 控制图、Nelson Rules、Cp/Cpk 计算 | 统计过程控制的通用算法能力，可迁移到多数制造行业 |
| Assessment / Trainer 自动选图、重训控制限 | 通用 SPC 平台能力 |
| iPush 飞书卡片、callback、runtime bridge | 通用告警和工作流集成能力 |

### 纵向（制造质量领域资产）

| 内容 | 领域含量 | 说明 |
|------|----------|------|
| 点焊 / 涂胶 / LASD 数据映射 | 高 | 不同工艺的数据格式、窗口编码、规格限、异常语义是现场知识 |
| `spc_dimension.owl` / `spc_diagnosis.owl` / `glue_defect_fta.owl` / `weld_trace.owl` | 高 | 把质量维度、缺陷、追溯关系、本体过滤器做成资产 |
| 推送路由与责任人配置 | 中高 | 设备/产线/工序到责任群组的现场组织知识 |
| TAA/人机料法环诊断链 | 高 | 异常原因分类、措施生成、验证跟踪是工艺经验资产 |
| sigma/ARL、点焊零值抑制、漂移检测等现场调优 | 中高 | 来自实际误报/漏报治理经验，难以纯靠通用库获得 |

**结论**：本仓的底层算法与运行框架横向性强，但产品价值不在“能画控制图”，而在把多工艺数据接入、窗口自动建模、告警克制、交互反馈、数字员工诊断和 EVI 量化连成一套可落地的制造质量闭环。

---

## 4. 反馈闭环 / 数据资产痕迹

本仓的闭环比单纯监控系统更完整：

1. **数据闭环**：Kafka/CloudQuery → `spc.samples` / `spc.measurements` → 控制限/判异结果 → 历史段展示与重训。
2. **告警闭环**：critical violation → 飞书卡片 → 操作员确认/忽略 → `spc.alert_feedback` / feedback projector → 后续阈值与规则调优。
3. **诊断闭环**：SPC 趋势异常 → runtime signal → dsclaw 数字员工 → 工单/诊断结果 → 人工确认。
4. **价值闭环**：EVI 面板与收益量化，把每次拦截的潜在损失变成可汇报经营收益。
5. **知识闭环**：`submit_new_knowledge` / ontology seeds / diagnosis ontology 让新经验有机会沉淀回知识库。

需要注意：`docs/spc-architecture-for-proposal.md` 是面向立项评审的价值说明；生产闭环是否已在每个场景完全跑通，需要结合当前未提交改动、Bundle build 结果、runtime receipts 与 live acceptance 继续核验。

---

## 5. 亮点 & 疑点

### 亮点

1. **业务链路完整**：采集、判异、推送、诊断、量化收益五环都有对应模块，而非单点算法 demo。
2. **告警治理成熟**：cooldown、stale sample guard、熔断、控制图截图、卡片按钮回调、false positive 投影，体现真实线上告警治理经验。
3. **自动适配数据分布**：Assessment + Trainer 根据样本量、分布、漂移、MR-sigma、Box-Cox、percentile 等动态决策控制图方案。
4. **多工艺覆盖**：点焊、涂胶、LASD、工艺主档、设备层级都已有模块入口，说明不是单工艺 PoC。
5. **数字员工接入**：SPC 质量诊断员工与点焊追溯员工把 SPC 结果升级为可交互诊断能力。
6. **强可视化产品面**：iWeb 提供 SPC 控制图、Assessment、Pipeline 状态、EVI、TAA 等面板。

### 疑点 / 风险

1. **工作区存在未提交改动**：当前 `demos` 仓有 9 个 modified 文件，涉及 Bundle/本体/DMN/测试，需确认这些改动是否已验证、是否应纳入分析基线。
2. **外部依赖多**：Kafka、CloudQuery、PostgreSQL、pgmq、runtime PG、iPush、dsclaw、workstation-runtime 都是链路关键点，任一缺失都会让闭环退化。
3. **告警参数治理复杂**：自适应控制限、sigma/ARL、OOC 兜底、漂移检测、熔断等机制强大但复杂，容易出现“为什么这次报/没报”的解释成本。
4. **诊断执行依赖 dsclaw live 证据**：本仓声明员工和 capability，但数字员工是否真正被 runtime 唤醒、是否具备有效 tools，需要看 live acceptance。
5. **现场数据质量决定效果上限**：设备层级、工艺主档、规格限、Kafka 数据时序与 dt 分区裁剪若不准，SPC 算法再好也会误报/漏报。
6. **SPC 到自动处置仍以人审为主**：这是安全合理的，但商业表述上不能说成“全自动调参/全自动处置”。

---

## 附：关键证据文件

- 总览与约束：`AGENTS.md`
- 项目配置：`pyproject.toml`
- 价值说明：`docs/spc-architecture-for-proposal.md`、`docs/SPC_ONBOARDING.md`、`docs/spec-spc-adaptive-retrain.md`
- 数据集成：`data_integrate/spot_welding_spc/`、`data_integrate/sca_spc/`、`data_integrate/lasd_spc/`、`data_integrate/*_device_hierarchy/`、`data_integrate/*_test_standard_detail/`
- SPC pipeline：`pipelines/spc_schema_init.py`、`pipelines/spc_assessment_cron.py`、`pipelines/spc_retrain_cron.py`、`pipelines/spc_runtime_signal.py`、`pipelines/spc_feedback_projector.py`、`pipelines/spc_chart_image_sender.py`
- 运行入口：`runners/pgmq_worker.py`、`runners/iweb_runner.py`、`sinks/spc_runtime_bridge_sink.py`
- UI：`analysis/iweb/provider.py`
- 数字员工：`agent/digital_employees.yaml`、`agent/minds/spc-quality-diagnostician.md`、`agent/minds/weld-trace-investigator.md`
- 能力与工具：`capability/query_spc_data.yaml`、`capability/query_weld_trace.yaml`、`capability/verify_measure_effect.yaml`、`agent/tools/`
- 知识资产：`knowledge_base/ontology/spc_dimension.owl`、`spc_diagnosis.owl`、`glue_defect_fta.owl`、`weld_trace.owl`、`knowledge_base/seeds/`
- 工作流：`workflows/spc_alert_dispatch.dmn`
- 测试：`tests/test_spc_*`、`tests/test_iweb_*`、`tests/test_runtime_signal_relay_wiring.py`、`tests/test_repository_secret_hygiene.py`
