# 诊断工作流、Pack 契约与自学习闭环

> 上游：[00-overview.md](00-overview.md)

## 0. 主线定位：一条告警事件就是一张工单

- 告警事件落库即工单创建（**由后端判异引擎写入**，DSH 侧只更新处理状态）；诊断会话挂在工单上。
- 主线 = 诊断 → 结论 → 闭环；飞书推送只是旁路提醒。
- 诊断全程的产出（证据快照、候选根因、gate 决策、最终结论、效果观察）**必须留存**——运营模式写业务数据不受限，禁止写的只是生产知识（故障树/控制限/规则）。
- 结论回流反馈表，是调试模式故障树迭代的输入。

## 1. 五个人工 gate（语义平移，载体更换）

| Gate | 名称 | Agent 辅助 | 人决定 |
|---|---|---|---|
| 1 | 问题定性 | 展示控制图、CPK/均值/波动趋势、三层归因摘要 | 是否进入诊断分析 |
| 2 | 诊断路径 | 按 process_key + Pack 建议分支 | 确认诊断路径 |
| 3 | 根因查证 | 执行证据查询、FTA 分支、区分事实/候选/待查证 | 确认根因 |
| 4 | 措施决策 | 形成候选措施（工艺措施/维保提醒）及适用条件 | 选定措施 |
| 5 | 效果观察与闭环 | 调效果验证（CPK/样本门槛） | 是否关闭 |

- gate 状态机在 workorder-diagnosis 域插件 + gateway `/api/gates` 路由 + Postgres；推进必须人身份 + 合法 decision + 幂等 request_id。
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
graph_query:                       # 有界查询
  max_depth / max_nodes / max_edges / timeout_ms
inspection_steps: [...]            # 必须人工完成的检查
recommendations: [...]             # 候选措施及适用条件
capability_refs: [...]             # 工具权限与自动化级别
knowledge_projection_version: ...
release:
  candidate_digest / approved_by / approved_at / previous_version
```

发布流水线（调试模式 → 运营模式，实现在 spc-core release-pipeline，knowledge-config 域编排）：

```text
编辑候选 Pack（调试模式,随便改）
  → 历史事件回放对比（knowledge-config 域经 compute-client 派单 evaluate_batch
    + workorder 域诊断能力对历史事件跑候选 Pack）
  → 自动校验（路径穿越/敏感值/资源存在性/引用完整性 —— 平移 pack_loader 检查）
  → 工艺专家批准（人身份）
  → 版本号递增、digest 固定 → 进运营模式
  → 观测误报/漏报 → 必要时回滚到 previous_version
```

**新增工艺的验收**是整条回放链（事件标识 → 工艺路由 → Pack 校验 → 有界树查询 → gate → 反馈关联），不是"YAML 能解析"。资源白名单改为按 Pack 声明校验（保留其他安全检查），修正现有 `_ALLOWED_BUNDLE_RESOURCES` 固定集合导致新工艺被拒的问题。

## 3. 告警响应（运营模式）

见 [03-backend-compute.md](03-backend-compute.md) 唤醒投递契约。动作序列：**后端落库为工单 → gateway 收到唤醒（校验签名 + event_id 幂等）→ workorder 域创建诊断会话 → 诊断产物落库 → 飞书提醒**。推理产物结构：

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

### 4.2 候选生成与发布

```text
反馈汇总 → Agent 生成学习候选（缺失分支/anchor 修正/规则参数建议）
  → 调试模式回放验证（对历史事件的增益/回归对比）
  → 工艺专家复核
  → 审批 → 新 Pack/规则版本发布 → 观测 → 可回滚
```

**模型不得直接修改**：生产故障树、控制限、SPC 规则、设备参数，不得自动关闭工单/gate。所有生产知识变更必须经 4.2 的审批链。

## 5. 与现有实现的对应

| 现有 | 新架构 |
|---|---|
| 五 gate（demos provider/workbench） | gateway `/api/gates` 路由 + workorder 域 + Postgres 状态机 |
| Diagnosis Pack YAML + pack_loader 校验 | 契约扩展（anchors 按 process_key 路由、版本血缘）+ 校验平移至 spc-core pack-validation |
| FTA 投影/查询（Glue 专属） | Pack 声明 namespace/根节点,通用化 |
| 推荐引擎 `_GLUE_ACTIONS` | Pack recommendations 声明式承载 |
| 双反馈表 + 双 projector | 单一反馈表统一血缘 |
