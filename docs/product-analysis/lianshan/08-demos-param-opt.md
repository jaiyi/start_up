# 产品仓库分析 08：demos-param-opt（制造参数推荐闭环 Agent）

> 分析日期：2026-09-14  
> 分析对象：`/Users/lijiayi/lianshan/agent/demos-param-opt`  
> 当前版本：`3e1d423`（工作区干净）  
> 方法：实读 `AGENTS.md`、`pyproject.toml`、`project_manifest.yaml`、`agent/digital_employees.yaml`、核心配置/模型 manifest/目录结构，并参考子任务对代码、workflow、pipeline 的只读分析。  
> 重要说明：本仓是参数推荐/调优 dsproject，已有多算法、Bundle、iWeb、PGMQ 与反馈框架；但真实 MES/设备下发等部分仍有 demo/stub 或人工确认边界，不能表述为“已全自动闭环控制设备”。

---

## 1. 一句话定位 + 技术栈

**一句话定位**：`demos-param-opt` 是面向理想工厂的制造参数推荐与调优闭环 Agent：围绕 NG 事件，把历史 OK 案例、材料/工况、工艺参数和反馈数据接入 PostgreSQL，通过六类算法路线生成参数建议，再用 BPMN/DMN、人审与推卡反馈推动 NG 闭环率提升。

**技术栈**：

- 语言/运行时：Python 3.11
- 项目框架：LADS dsproject，profile = `param_opt`
- 核心依赖：`lads[param.recom,param.gpr_recom,param.nn_recom,param.rule_tune,param.behavior_tune,param.sensitivity_tune,param.opt,param.mgmt,integration,iweb]==3.47.70`
- 数据与消息：PostgreSQL + pgmq；`param_recom` / `param_mgmt` schema
- 算法：相似案例召回、级联神经网络、GPR constrained search、专家规则、行为克隆、HGB sensitivity tune
- 模型/科学栈：PyTorch、scikit-learn、SciPy、NumPy、sentence-transformers、joblib
- 工作流：BPMN + DMN（dispatch routing、iteration policy、NG closure、readiness gate）
- UI：LADS iWeb；参数推荐与参数管理面板
- Agent：`param-recom-agent` 参数推荐助手，target = iclaw，主模型 `gemma-4-12b-it`
- 知识：OWL 本体 + knowledge projection，将 WorkCase / Material / ProcessParam / Recommendation / NgEvent 等投影为查询资产

---

## 2. 核心模块与数据流

### 2.1 产品目标与评价指标

`pyproject.toml` 把目标指标定义为：

- `metric_name = "ng_closure_rate"`
- 含义：经参数推荐调整后由 NG 转 OK 的工单占触发推荐 NG 工单比例
- baseline = 0%，target = 90%，evaluation_window = 7d

`AGENTS.md` 明确本仓是“理想工厂参数推荐/调优六算法 dsproject”，要求优先复用 LADS 通用能力，禁止直连 Kafka 驱动 Agent、自起 HTTP 服务、自建 Dokku app 或绕过 Bundle 下发模型权重。

### 2.2 六算法路线

| 路线 | 场景/方法 | 关键证据 |
|------|-----------|----------|
| R1 | 点焊相似案例召回 / embedding 检索 | `config/defaults/r1_param_recom_config.yaml`、`data/point_welding_cases.json` |
| R2 | 级联神经网络推荐 | `config/defaults/r2_nn_config.yaml`、`model/r2_nn/manifest.json`、`runners/worker_r2.py` |
| R3 | 激光焊接 GPR constrained search | `config/defaults/r3_gpr_recom_config.yaml`、`model/r3_gpr_recom/manifest.json`、`runners/worker_r3.py` |
| T1 | 注塑缺陷专家规则调参 | `config/defaults/t1_defect_rules.yaml`、`src/t1_rules.py` |
| T2 | 注塑行为克隆调参 | `config/defaults/t2_bc_config.yaml`、`runners/worker_t2.py` |
| T3 | 激光焊接 HGB 扰动灵敏度调优 | `config/defaults/t3_sensitivity_config.yaml`、`model/t3_hgb/manifest.json` |

模型证据：

- R3 GPR manifest：116 valid rows，objective = `actual_depth`，参数包括 `Power`、`RingLaserPower`、`Speed`、`Swing_frequency`、`Swing_width`、`Swing_height`，R2≈0.733，RMSE≈0.038。
- T3 HGB manifest：116 valid rows，带物理单调性约束与物理边界，R2≈0.593，RMSE≈0.044。
- R2 NN manifest：300 valid rows，输入含文本特征 `solder_type`、`nozzle_type` 和数值特征 `move_z`、`nozzle_dy`，输出按 `z`、`wh/wht`、`wl/wlt`、`sp_xy` 分组。

### 2.3 运行进程与定时任务

`pyproject.toml` 声明：

- 进程：
  - `web`：`python3 -m runners.iweb_runner`
  - `worker` / `worker_r1` / `worker_r2` / `worker_t1` / `worker_t2` / `worker_t3`：六路推理/调优 worker
- 定时任务：
  - 参数推荐报告：每 30 分钟
  - NG 反馈集成：每 10 分钟
  - 常州南预设参数同步：每 20 分钟
  - 常州南设备维度同步：每日 01:45
  - 参数变更告警推送：每小时 15 分
  - 参数一致性校验推送：每日 07:00 / 19:00
  - 参数管理推卡反馈投影：每 5 分钟
- migrations：bootstrap、seed knowledge、param-mgmt ipush seed

### 2.4 数据流

核心数据流可概括为：

```text
历史 OK 案例 / 材料库 / NG 反馈 / 设备层级 / 预设参数
  → data_integrate pipeline
  → PostgreSQL param_recom / param_mgmt
  → pgmq 六路 inference queue
  → R1/R2/R3/T1/T2/T3 worker
  → parameter.proposal.completed.v1
  → param_recom.recommendation_log
  → BPMN/DMN 判定：下发 / 人审 / 继续迭代 / 关闭 / 放弃
  → iWeb / 推卡 / 报告
  → 反馈投影与 NG closure 指标
```

关键文件：

- `integrate/data_sources.yaml`：声明 `history_case_library`、`material_database`、`ng_feedback` 等源与目标表
- `data_integrate/param_opt/stages.py`：将反馈写入 `param_recom.feedback`，触发推荐链路
- `pipelines/param_recom_schema_init.py`：创建 schema 与六路 inference queue
- `src/r3_gpr_persistence.py`：将候选建议写入 `param_recom.recommendation_log`，并通过 `bridge_event_id` 做幂等
- `pipelines/build_recommendation_report.py`：聚合推荐采纳、闭环率等指标

### 2.5 工作流与人审

`workflows/recommendation_loop.bpmn` 里有 `DataAwareness`、`RecommendParams`、`CheckDeviceStatus`、`ConfirmDispatch`、`DispatchResult`、`IntegrateInfo`、`ContinueOrAbortDecision` 等阶段。

`workflows/dmn_dispatch_routing.dmn` 的关键产品含义：只有 `dispatch_enabled` 与 `dispatch_enabled_runtime` 都成立时才进入设备下发，否则跳到集成/人审路径。也就是说当前产品设计本质上是**决策支持 + 审核后执行**，不是默认全自动调参。

---

## 3. Agent / AI 能力

`agent/digital_employees.yaml` 声明：

- key：`param-recom-agent`
- name：参数推荐助手
- target：iclaw
- role：NG 触发时基于历史工况相似度召回推荐工艺参数，并跟踪 NG 闭环迭代
- model：`gemma-4-12b-it`
- skills：`data-analysis`、`web-research`

`capability/param-recommendation.yaml` 定义能力契约：

- capability id：`capability.param-opt.recommend/v1`
- invocation mode：`async_message`
- request type：`parameter.proposal.requested.v1`
- completion type：`parameter.proposal.completed.v1`
- 幂等键：`request_id`
- scope：`param-opt:recommend`

这说明 Agent 的价值并不是“LLM 直接调参”，而是 LLM/员工身份作为协作入口，底层推荐仍由确定性/统计/机器学习算法与 workflow 承载。

---

## 4. 横向 vs 纵向归属

### 横向（通用参数优化平台能力）

| 内容 | 判断 |
|------|------|
| LADS dsproject / Bundle / iWeb / pgmq worker | 通用应用运行框架 |
| PostgreSQL schema、PGMQ、报告 pipeline | 通用数据闭环骨架 |
| BPMN/DMN 生命周期与 dispatch stages | 通用“建议-审核-下发-反馈”工作流 |
| GPR、NN、规则、行为克隆、HGB 等算法框架 | 多行业可复用的参数优化方法 |
| iPush seed / 推卡反馈投影 / 参数管理面板 | 通用协作与参数治理能力 |

### 纵向（制造工艺参数资产）

| 内容 | 领域含量 | 说明 |
|------|----------|------|
| 激光焊接参数与物理约束 | 高 | `Power`、`RingLaserPower`、`Speed`、摆动频率/宽度/高度及单调性约束 |
| 点焊/焊接案例库 | 高 | `point_welding_cases.json`、激光焊训练/经验 CSV 承载现场经验 |
| 注塑缺陷规则与行为克隆产品码 | 高 | T1/T2 把缺陷与保压/注射参数变化关联到具体产品 |
| 参数管理/一致性校验 | 中高 | 标准参数、设备参数、预设参数同步与变更推送，是现场治理资产 |
| NG 闭环率与采纳率指标 | 中高 | 把算法建议和真实质量结果连接，是产品效果评价资产 |
| 本体与 knowledge projection | 中高 | 将 WorkCase / Material / ProcessParam / Recommendation / NgEvent 结构化为可查询知识层 |

**结论**：本仓的横向能力是“多算法参数推荐框架”，纵向资产是制造工艺参数知识、物理边界、现场案例、缺陷-参数映射和反馈指标。真正可形成壁垒的是这些经验数据与闭环反馈，而不是某一个 GPR 或 NN 模型本身。

---

## 5. 反馈闭环 / 数据资产痕迹

本仓具备明确的闭环设计：

1. **输入**：历史 OK 案例、材料库、NG feedback、设备层级、预设参数。
2. **推理/建议**：六路 worker 根据事件生成参数建议。
3. **输出**：写入 `recommendation_log`，发出 `parameter.proposal.completed.v1`。
4. **决策**：BPMN/DMN 判定是否下发、是否继续迭代、是否关闭。
5. **人审/协作**：iWeb 面板、推卡、参数变更/一致性卡片。
6. **反馈**：NG 反馈集成、推卡反馈投影、推荐报告。
7. **指标**：NG closure rate、推荐采纳率、首轮命中率等。

但闭环成熟度需要分层看：

- **算法与数据结构闭环**：较完整，schema、queue、workers、报告、workflow 都有落点。
- **真实生产闭环**：仍需替换 demo/stub 数据源与设备适配器，尤其是 MES/检测反馈源和 OPC/PLC/MES 设备下发。
- **自动控制闭环**：当前设计上保留人审和 dispatch flag，安全边界合理，但不能宣称 out-of-the-loop 自主调参。

---

## 6. 亮点 & 疑点

### 亮点

1. **不是单算法 demo**：R1/R2/R3/T1/T2/T3 六路算法覆盖相似案例、NN、GPR、规则、行为克隆、敏感性调优，形成算法组合产品。
2. **闭环目标明确**：以 `ng_closure_rate` 为核心指标，把建议质量和业务结果挂钩。
3. **冷/热路径分离**：训练 pipeline 与在线 worker 分开，hot path 不做 fit，只加载 artifact 推理。
4. **物理约束进入模型**：T3 单调性、物理上下限，R3 参数空间，体现工艺经验对算法的约束。
5. **工作流安全边界清楚**：设备下发不是默认自动执行，必须经过 readiness/dispatch/human confirmation 路由。
6. **产品面扩展到参数治理**：不仅推荐，还包含参数变更告警、一致性校验、预设参数同步、反馈投影。

### 疑点 / 风险

1. **真实数据源仍有 stub 痕迹**：`data_integrate/param_opt/stages.py` 的 source 当前可见为空批次/待真实 MES 或检测反馈实现；生产价值取决于真实 NG 反馈接入。
2. **设备自动下发未实现**：代码与配置说明中保留 `dispatch_enabled=false` 或 no real OPC/PLC/MES adapter 的边界；当前更像“推荐+人审”而非自主控制。
3. **模型样本量有限**：R3/T3 训练样本 116 行、R2 300 行，适合 demo 或局部工艺验证，但跨材料、设备、供应商泛化需要更多数据。
4. **供应商/场景覆盖窄**：R3 manifest 的 categorical supplier 只有“海目星”，提示训练集覆盖面有限。
5. **算法多但运维复杂**：六路 worker、多个 cron、多个 schema、多个模型 artifact，对运维、监控和版本治理要求高。
6. **Guardrails 仍需加强**：`pyproject.toml` objective guardrails 为空；真实参数推荐应补设备安全、质量红线、审批策略、工艺窗口等硬约束。

---

## 附：关键证据文件

- 总览与约束：`AGENTS.md`
- 项目配置：`pyproject.toml`、`project_manifest.yaml`
- 业务/价值：`docs/business_problem.md`、`docs/value.md`、`metrics/metric_definition.yaml`、`metrics/acceptance.md`
- 数字员工：`agent/digital_employees.yaml`
- 能力契约：`capability/param-recommendation.yaml`
- 数据源与集成：`integrate/data_sources.yaml`、`data_integrate/param_opt/`、`data_integrate/czn_preset_param_sync/`、`data_integrate/czn_device_hierarchy/`
- 算法配置：`config/defaults/r1_param_recom_config.yaml`、`r2_nn_config.yaml`、`r3_gpr_recom_config.yaml`、`t1_defect_rules.yaml`、`t2_bc_config.yaml`、`t3_sensitivity_config.yaml`
- 模型资产：`model/r2_nn/manifest.json`、`model/r3_gpr_recom/manifest.json`、`model/t3_hgb/manifest.json`
- Pipeline：`pipelines/param_recom_schema_init.py`、`pipelines/train_gpr_model.py`、`pipelines/train_r2_nn_model.py`、`pipelines/train_r3_gpr_model.py`、`pipelines/train_t3_hgb_model.py`、`pipelines/build_recommendation_report.py`、`pipelines/param_mgmt_*`
- Worker：`runners/worker_r1.py`、`worker_r2.py`、`worker_r3.py`、`worker_t1.py`、`worker_t2.py`、`worker_t3.py`
- 工作流：`workflows/recommendation_loop.bpmn`、`dmn_dispatch_routing.dmn`、`dmn_iteration_policy.dmn`、`dmn_ng_closure.dmn`、`dmn_readiness_gate.dmn`
- UI：`analysis/iweb/provider.py`、`runners/iweb_runner.py`
- 知识：`knowledge_base/ontology/param_opt_domain.owl`、`contracts/knowledge_projection.yaml`、`knowledge_base/seeds/process_params.yaml`
