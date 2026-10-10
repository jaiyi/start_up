# 诊断工作流、Pack 契约与自学习闭环

> 上游：[00-overview.md](00-overview.md)

## 0. 主线定位：一条告警事件就是一张工单

- 告警事件落库即工单创建（**由后端判异引擎写入**，DSH 侧只更新处理状态）；诊断会话挂在工单上。
- 主线 = 诊断 → 结论 → 闭环；飞书推送只是旁路提醒。
- 诊断全程的产出（证据快照、候选根因、gate 决策、最终结论、效果观察）**必须留存**——运营模式写业务数据不受限，禁止写的只是生产知识（故障树/控制限/规则）。
- 结论回流反馈表，是三支迭代的输入：故障树/Pack 候选（调试模式）、计算参数候选（控制限/规则）、样本库积累（算子模型迭代语料），见 §4.2。

> 载体说明：本章描述的 gate/会话/反馈引擎语义由 **plugin-workorder（平台通用工单引擎）** 承载，SPC 特有的证据与故障树查询由 **spc profile 诊断能力**以能力提供者接口注入（见 [02-plugins.md](02-plugins.md) §3/§7）。拧紧判异等后续判异类 profile 复用同一引擎。

## 1. 五个人工 gate（语义平移，载体更换）

| Gate | 名称 | Agent 辅助 | 人决定 |
|---|---|---|---|
| 1 | 问题定性 | 展示控制图、CPK/均值/波动趋势、三层归因摘要 | 是否进入诊断分析 |
| 2 | 诊断路径 | 按 process_key + Pack 建议分支 | 确认诊断路径 |
| 3 | 根因查证 | 执行证据查询、FTA 分支、区分事实/候选/待查证 | 确认根因 |
| 4 | 措施决策 | 形成候选措施（工艺措施/维保提醒）及适用条件 | 选定措施 |
| 5 | 效果观察与闭环 | 调效果验证（CPK/样本门槛） | 是否关闭 |

- gate 状态机在 plugin-workorder（平台通用引擎，gate 数量与语义由 profile 声明）+ platform-gateway `/api/gates` 路由 + Postgres；推进必须人身份 + 合法 decision + 幂等 request_id。
- **gate 级运营配置（2026-10-10 补，04-05 §6.2 `sla_policy`/`human_owner` 对位）**：每个 gate 在 Pack/profile 配置中声明 `owner_role`（按 process_key / severity 路由到角色）与 `sla_hours`；plugin-workorder 定时扫描超时 gate → 飞书升级（责任人 → 主管），升级事件落审计。首版只做"超时提醒升级"一档，不做自动改派/自动关单——结构现在定（配置项进 Pack 契约），实现随运营面板（第二步）落地。
- 审计事件 append-only；持久化失败不返回成功（沿现有 advance bridge 语义并修正其幂等缺口）。

## 2. Diagnosis Pack 统一契约

各工艺诊断逻辑不同，**接口与发布校验必须一致**。Pack 是版本化发布物：

```yaml
diagnosis_pack_id: spc.<event_type>.<process_key>/vN
process_key: <稳定工艺标识>
contract_schema_version: v1        # 本契约自身的版本
phenomenon_anchors:                # 告警现象 → 树节点;无匹配则显式失败,不回退
  - match: {cause: "...", side: "..."}
    node: <节点 IRI>
fault_tree:
  ontology_ref: <OWL 资源>
  namespace: <工艺专属 namespace>
  root_node: <根节点 IRI>
  # 存储形态（已决 2026-10-10）：树内容直接写在 Pack YAML 内（文件即工件），
  # query_fault_tree = 加载 Pack 版本后内存内有界遍历，不依赖 AGE/pgvector 等扩展。
  # 升级触发条件（满足其一再迁 PG JSONB / AGE）：单棵树规模超出内存有界遍历舒适区
  # （千节点级）；跨工艺/跨 Pack 的联合图查询诉求；拧紧 profile 出现异构树语义。
graph_query:                       # 有界查询
  max_depth / max_nodes / max_edges / timeout_ms
inspection_steps: [...]            # 必须人工完成的检查
recommendations: [...]             # 候选措施及适用条件
capability_refs: [...]             # 工具权限与自动化级别
knowledge_projection_version: ...
release:
  candidate_digest / approved_by / approved_at / previous_version
```

发布流水线（调试模式 → 运营模式，实现在 platform-core release-pipeline，SPC Pack schema 由 spc profile 注册，发布编排归 spc 知识配置能力）：

```text
编辑候选 Pack（调试模式,随便改）
  → 历史事件回放对比（spc 知识配置能力经 compute-client 派单 evaluate_batch
    + plugin-workorder 诊断编排对历史事件跑候选 Pack）
  → 自动校验（路径穿越/敏感值/资源存在性/引用完整性 —— 平移 pack_loader 检查,
    platform-core pack-validation + spc 注册的 Pack schema）
  → 工艺专家批准（人身份）
  → 版本号递增、digest 固定 → 进运营模式
  → 观测误报/漏报 → 必要时回滚到 previous_version
```

**新增工艺的验收**是整条回放链（事件标识 → 工艺路由 → Pack 校验 → 有界树查询 → gate → 反馈关联），不是"YAML 能解析"。资源白名单改为按 Pack 声明校验（保留其他安全检查），修正现有 `_ALLOWED_BUNDLE_RESOURCES` 固定集合导致新工艺被拒的问题。

## 3. 告警响应（运营模式）

见 [03-backend-compute.md](03-backend-compute.md) 唤醒投递契约。动作序列：**后端落库为工单 → platform-gateway 收到唤醒（校验签名 + event_id 幂等）→ plugin-workorder 创建诊断会话（编排 spc 诊断能力）→ 诊断产物落库 → 飞书提醒**。推理产物结构：

```text
{
  "facts": [...]          # 已查得的事实,带来源与版本
  "candidates": [...]     # 候选原因,引用故障树节点
  "to_verify": [...]      # 待人工查证项
  "suggestions": [...]    # 排障建议(候选措施,非决定)
  "warnings": [...]       # 降级/不可用原因
  "versions": { pack, knowledge_projection, schema }
}
```

发飞书群的消息只是提醒：附"请进工作台处理工单"的措辞与链接；**不在群里做出关单/改参数的决定**。工单的结论与闭环都在工作台/诊断会话内完成并落库。

## 4. 自学习闭环（两段式：收集 → 批准发布）

### 4.1 收集与关联

- 反馈来源（新架构统一为单一反馈表）：
  - gate 5 效果观察结论（措施是否有效、CPK 是否恢复）；
  - 人对告警的响应（真阳/误报标注）;
  - 专家在根因查证中的修正。
- 每条反馈关联：`source_event_id` → `process_key` + `pack_id@version` + 知识投影版本 + 诊断会话。
- 区分反馈类型（确认/误报/部分正确），不把"已点击"当"根因成立"。

### 4.2 三支去向（诊断知识 / 计算参数 / 样本库）

反馈不止驱动故障树迭代。SPC 场景的反馈按内容分三支去向，三支共用"收集 → 候选 → 回放验证 → 审批 → 发布"的两段式纪律：

| 支 | 反馈内容 | 去向 | 载体 |
|---|---|---|---|
| **诊断支** | 根因确认/修正、误报标注、缺失分支 | 故障树 / Pack 迭代（候选 → 回放对比 → 专家审批） | `spc.knowledge_pack_release` |
| **计算支** | 误报集中于某规则/窗口、控制限偏紧/偏松、判异参数不适配 | 计算参数候选：控制限重训建议、window/规则参数调整建议 | `spc.config_release` / `spc.pipeline_release`（同一条发布流水线） |
| **样本支** | 全部反馈（真阳/误报/根因修正 + 关联测量窗口） | 样本库积累，作为算子/模型迭代的训练与评测语料 | `spc.feedback_sample`（只积累，不是发布物；消费见下） |

```text
反馈汇总 → Agent 生成学习候选（三支分别产:缺失分支/anchor 修正 · 控制限重训与参数建议 · 样本条目）
  → 调试模式回放验证（对历史事件的增益/回归对比）
  → 工艺专家复核
  → 审批 → 新 Pack/规则/配置版本发布 → 观测 → 可回滚
```

**计算支细则**：误报/漏报模式经 Agent 汇总后，产出的是"参数调整建议"（如某 process_key 的规则参数放宽、控制限重训触发），不是直接改参数。候选经 compute-client 派 `retrain_control_limits` / 回放任务验证增益，人工审批后进 `config_release` / `pipeline_release`，计算节点重载生效——与 Pack 完全对称（00 §3.4 的"模型只产候选"对计算知识同样成立）。

**样本支细则**：样本库是算子迭代的语料，不是发布物。消费路径 = 算子交付链（[03-backend-compute.md](03-backend-compute.md) §5.1）：算法工程师经 `debug_operator` 沙箱任务以样本库为 dataset 回放对比——误报与根因修正样本兼作**回归测试集**（新算子版本必须在这些样本上不劣化），验证后走 ①–④ 部署。模型类算子（分类/预测类）的迭代直接以样本库为训练语料。

**模型不得直接修改**：生产故障树、控制限、SPC 规则、设备参数，不得自动关闭工单/gate。所有生产知识变更必须经 4.2 的审批链。

## 5. 经营价值闭环（EVI 最小集）

价值计算与诊断闭环绑定：**工单关闭（gate 5 人工确认）是价值落账的触发点**。

- **触发**：plugin-workorder 在 `workorder_status → closed` 时写一条 `spc.evi_record`（幂等：一工单一记录，重复关闭/重开不重复落账）。
- **首版字段（EVI-L1 留痕级，不追求财务精度）**：
  - 归因血缘：`event_id` / `process_key` / 诊断会话 + `pack_id@version`——"这个价值由哪个版本的诊断知识参与产生"可追溯；
  - 口径：`anomaly_type`、闭环时长（`business_alert_time → closed_at`）、措施是否有效、是否避免复发；
  - 价值：`estimated_impact`（按**受治理损失口径**估算：停线时长×单位损失、报废/返工估算；口径作为 `config_release` 的 `config_type=loss_basis` 发布——带 owner/版本/审批，是语义层第一个受治理资产；口径未发布则留空）+ `confidence_level`（estimated / business_confirmed）；
  - 确认：`confirmation_status`（未确认 / 业务确认）——客户业务负责人确认是 EVI-L2 的门槛，确认动作本身落审计。
- **展示**：运营工作台做**价值看板**——工单维度明细 + 月度汇总（闭环时长分布、误报率、避免损失累计、知识版本贡献）。调试模式不展示；看板对 `spc.evi_record` 只读。
- **升级路径**：字段第一天就有；损失口径配置、反事实基线与财务确认（EVI-L3/L4）等真实客户口径出现后再扩展——"为归因而结构化，不为归因而实现"（同 02 §9 纪律）。

## 6. 与现有实现的对应

| 现有 | 新架构 |
|---|---|
| 五 gate（demos provider/workbench） | platform-gateway `/api/gates` 路由 + plugin-workorder + Postgres 状态机 |
| Diagnosis Pack YAML + pack_loader 校验 | 契约扩展（anchors 按 process_key 路由、版本血缘）+ 校验平移至 platform-core pack-validation（spc 注册 schema） |
| FTA 投影/查询（Glue 专属） | Pack 声明 namespace/根节点,通用化 |
| 推荐引擎 `_GLUE_ACTIONS` | Pack recommendations 声明式承载 |
| 双反馈表 + 双 projector | 单一反馈表统一血缘 |
