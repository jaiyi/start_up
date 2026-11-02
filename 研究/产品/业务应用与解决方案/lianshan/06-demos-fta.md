# 产品仓库分析 06：demos-fta（前灯匹配不良 FTA 诊断 Agent）

> 分析日期：2026-09-14  
> 分析对象：`/Users/lijiayi/lianshan/agent/demos-fta`  
> 当前版本：`46da960`（工作区干净）  
> 方法：实读 `README.md`、`pyproject.toml`、`project_manifest.yaml`、`docs/fta-project-business-flow.md`、`agent/digital_employees.yaml`、目录结构与关键配置/资产文件。  
> 重要说明：本仓把 FTA 诊断拆成两段：**本仓负责三件套资产、数据集成、工单触发与 runtime signal 桥接；真正沿因果树执行诊断的主体在 dsclaw 数字员工侧**。因此本文只把 dsclaw 侧行为视作本仓声明与对接契约，不把它当成本仓本地实现。

---

## 1. 一句话定位 + 技术栈

**一句话定位**：`demos-fta` 是一个面向「前灯匹配不良」售后/质量工单的 FTA（Fault Tree Analysis）诊断 dsproject：把客户工单、测试标准、故障树和措施方案编译成 Bundle，运行期由工单触发 pgmq 信号，唤醒 dsclaw 数字员工沿故障树逐项排查、定位根因并给出改善措施。

**技术栈**：

- 语言/运行时：Python 3.11
- 项目框架：LADS dsproject + `fta_strict` profile（`project_manifest.yaml`）
- 核心依赖：`lads[compiler,iweb,net,integration,fta]==3.47.133`、Kedro、Pydantic、psycopg、openpyxl、boto3
- 数据与消息：PostgreSQL + pgmq；业务库内 `fta_diagnose` / `runtime_signal_outbox`，再 relay 到 workstation-runtime 的 `runtime_events`
- 知识表示：OWL 故障树（`front_lamp_mismatch.owl`）+ signal mapping + product applicability + measures
- UI/运行：LADS iWeb (`python3 -m runners.iweb_runner`) + pgmq worker (`python3 -m runners.pgmq_worker`)
- Agent 侧：`agent/digital_employees.yaml` 声明 dsclaw 数字员工，主模型 `gpt-5.5`
- 上游协作：dsbot × RAGFlow 建树，产出「测试项.xlsx / 措施方案.xlsx / 故障树.owl」三件套

---

## 2. 核心模块与数据流

### 2.1 离线建树与严格 Bundle 门禁

`README.md` 明确当前源工作簿为 `resources/source/FTA.xlsx`：

- 固定 10 sheets / 1,562 cells，采用字节 SHA-256 + 语义指纹双门禁；
- canonical tree 为 52 nodes / 51 edges，必须单根、无环、连通；
- FTA URI 为 `urn:lisen:fta:demos-fta:front-lamp-mismatch`；
- 79 条 requirements，四个产品覆盖数为 21/36/7/15；
- 6 条 measures，且 measures 到 root-cause leaf 的关联与 provenance 必须完整；
- threshold parameter 的 rule / target / unit / sheet / cell / row provenance 必须一致。

构建链路由 `fta_source.export.prepare_fta_assets()` 做归一化与静态校验，再由 strict compatibility CLI 与标准 Bundle v2 compiler 产出：

```text
FTA.xlsx
  → fta_source.capture_cli / build_cli / bundle_cli
  → prepare_fta_assets(...)
  → artifacts/knowledge_base/ontology/front_lamp_mismatch.owl
  → artifacts/integrate/fta/signal_mapping.yaml
  → artifacts/config/fta/product_applicability.yaml
  → artifacts/config/fta/measures.yaml
  → compiled typed_graph_ir.json / query plan
  → lads bundle build
```

这里最有价值的是：它不是只保存一份“故障树文档”，而是把 workbook 单元格、语义节点、OWL individual、测试项 requirement、产品适用性、措施方案都纳入可审计门禁。

### 2.2 运行期：工单触发而非先判异

`docs/fta-project-business-flow.md` 把 FTA 和 SPC 区分得很清楚：SPC 是先判异再触发诊断；FTA 则是**客户工单即问题已发生，工单本身就是触发源**。

运行期链路：

```text
客户工单进入 data_integrate 库
  → AFTER INSERT 触发器 pgmq.send('fta_diagnose')
  → FtaPgmqWorker 消费工单事件
  → 写入 runtime_signal_outbox
  → RuntimeSignalOutboxRelay 转发到 workstation-runtime PG 的 runtime_events
  → dsclaw 消费 workorder_event
  → fta-fault-diagnostician 数字员工被唤醒
  → 沿 front_lamp_mismatch.owl 逐项诊断
  → 自动判 / 人机交互 / 根因定位 / 措施建议
  → 诊断反馈回写或由 feedback projector 拉回
```

`pyproject.toml` 中声明的长期进程与定时任务对应这条链路：

- `web`：`python3 -m runners.iweb_runner`
- `worker`：`python3 -m runners.pgmq_worker`
- `desai_test_standard_detail`：每日同步德赛测试项标准
- `desai_work_order`：每 2 分钟同步售后工单并触发诊断
- `fta_feedback_projector`：每 2 分钟从 runtime feedback-export 拉取已审核诊断反馈，回写工单三列
- postdeploy migration：`pipelines.fta_schema_init:main`

### 2.3 数字员工与能力声明

`agent/digital_employees.yaml` 声明了两个员工：

| 员工 | 目标 | 职责 | 触发/能力 |
|------|------|------|-----------|
| `fta-fault-diagnostician` / 前灯故障诊断员工 | dsclaw | 接收前灯匹配不良售后工单，沿故障树逐项排查，与操作员交互获取测试结果，定位根因并给改善措施 | on_message；`event_type=fta_work_order`、`subject_type=front_lamp_part`；能力 `query-fault-tree`、`query-test-standard` |
| `fta-diagnosis-analyst` / 诊断分析员工 | dsclaw | 做售后工单日报/周报/按零件号、根因、城市、时间分组统计，不做故障树诊断 | 能力 `query-work-orders` |

这说明本仓的产品面不是“脚本诊断器”，而是**把 FTA 资产物化成 dsclaw 可调度的诊断员工**。

---

## 3. 横向 vs 纵向归属

### 横向（通用能力）

| 内容 | 判断 |
|------|------|
| LADS dsproject / Bundle v2 / `pyproject.toml` app 声明 | 通用交付与运行框架 |
| PostgreSQL + pgmq + RuntimeSignalOutboxRelay | 通用事件桥接能力，可服务 SPC、参数推荐等场景 |
| iWeb runner / analysis provider | 通用展示层 |
| strict build CLI、manifest、schema 校验 | 通用“资产可编译/可验收”工程纪律 |
| dsclaw digital employee manifest | 通用 Agent 编排入口 |

### 纵向（领域资产）

| 内容 | 领域含量 | 说明 |
|------|----------|------|
| `front_lamp_mismatch.owl` | 高 | 前灯匹配不良的因果树，52 节点/51 边，是可迁移的诊断知识资产 |
| `signal_mapping.yaml` | 高 | 79 个 requirement 到测试项/信号的映射，是诊断节点能否自动判的关键 |
| `product_applicability.yaml` | 中高 | 四类产品对应 requirement 覆盖差异，体现真实产品族约束 |
| `measures.yaml` | 高 | 根因 leaf 到改善措施的映射，直接连接诊断结果与处置动作 |
| 德赛测试项/工单集成 | 中高 | 绑定具体客户数据源、表结构、工单字段与业务触发时机 |
| 数字员工行为准则 | 中 | “逐项排查、不跳步、不编造测试结果、缺数据做人机交互”是 FTA 场景方法论 |

**结论**：本仓横向框架不稀缺，真正的纵向资产是“前灯匹配不良”这棵可审计故障树及其与测试标准、产品适用性、措施方案、客户工单的映射。若换掉 LADS/pgmq/dsclaw，这些 OWL/映射/措施资产仍可迁移，是产品护城河所在。

---

## 4. 反馈闭环 / 数据资产痕迹

本仓闭环分两类：

1. **资产可信闭环（已很强）**  
   FTA.xlsx → OWL / signal mapping / applicability / measures → strict bundle → checksum/provenance。源头、转换、产物都有门禁，能回答“这棵树从哪里来、有没有被篡改”。

2. **运行诊断闭环（仓内为桥接，执行在 dsclaw）**  
   工单触发 → pgmq → runtime_events → dsclaw 数字员工诊断 → feedback-export → `fta_feedback_projector` 回写。仓内能看到信号桥与回写投影，但“沿树执行每一步诊断、向操作员发卡、等待回填”的核心行为在 dsclaw/runtime 侧，需用 runtime receipts / 工单回写结果做 live acceptance。

需要谨慎表述的是：`docs/fta-project-business-flow.md` 仍标注部分 FACT 表（测试项结果表、工单表确切表名/事件日列）为待确认或待补；虽然仓内已有 `desai_work_order` 模块和 schedule，但生产是否完整接入，仍要看现场表名、增量水位和 live 数据验收。

---

## 5. 亮点 & 疑点

### 亮点

1. **FTA 资产强门禁**：workbook hash、语义指纹、树结构、requirement、OWL、product applicability、measures、provenance 全链路校验，避免“看起来有树，实际不可执行”。
2. **工单即触发源的产品判断清晰**：FTA 不再复用 SPC 的判异前置，而是围绕售后/质量工单做根因追溯，业务边界明确。
3. **诊断知识可迁移**：OWL + signal mapping + measures 是可移植的领域资产，不依赖某个 UI 或 runtime 实现。
4. **人机协作边界明确**：数字员工准则明确不能编造测试结果、不能跳过测试项、无法定位需上报人工。
5. **与 dsbot/RAGFlow 分工清楚**：dsbot/RAGFlow 负责“树怎么长”，本仓负责“树怎么打包、怎么被工单触发、怎么唤醒执行”。

### 疑点 / 风险

1. **诊断执行不在本仓**：本仓只声明员工并桥接信号，实际逐项诊断、交互补数据、根因确认在 dsclaw 侧；单看本仓不能证明诊断执行已端到端上线。
2. **客户 FACT 数据接入仍需现场验收**：业务流程文档对测试项结果表、工单表确切表名、事件日列、字段映射仍有待确认项。
3. **强依赖上游建树质量**：如果 dsbot/RAGFlow 生成的故障树或测试标准映射质量不足，strict build 只能保证一致性，不能保证诊断有效性。
4. **产品适用性范围窄**：当前是“前灯匹配不良”单一 FTA 场景；复制到更多质量问题需要重新建树、映射、措施和验收。
5. **反馈闭环需要 runtime 证据**：`fta_feedback_projector` 表明设计上可拉回诊断反馈，但闭环效果需要看真实工单的 diagnose_feedback / diagnose_path 回写率。

---

## 附：关键证据文件

- 总览：`README.md`
- 项目配置：`pyproject.toml`、`project_manifest.yaml`
- 业务流程：`docs/fta-project-business-flow.md`
- 源数据：`resources/source/FTA.xlsx`、`resources/source/source_manifest.yaml`、`resources/source/workbook_provenance.yaml`
- FTA 构建：`fta_source/export.py`、`fta_source/build_cli.py`、`fta_source/bundle_cli.py`
- 知识资产：`knowledge_base/ontology/front_lamp_mismatch.owl`、`integrate/fta/signal_mapping.yaml`、`config/fta/product_applicability.yaml`、`config/fta/measures.yaml`
- 数据集成：`data_integrate/desai_test_standard_detail/`、`data_integrate/desai_work_order/`
- 运行桥接：`runners/pgmq_worker.py`、`pipelines/fta_feedback_projector.py`、`pipelines/fta_schema_init.py`
- 数字员工：`agent/digital_employees.yaml`、`agent/minds/fta-fault-diagnostician.md`、`agent/minds/fta-diagnosis-analyst.md`
- 契约测试：`tests/test_fta_pgmq_worker.py`、`tests/test_fta_route_real_e2e.py`、`tests/test_source_reproducibility.py`、`tests/test_normalization_gate.py`
