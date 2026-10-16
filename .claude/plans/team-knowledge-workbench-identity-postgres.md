# 团队身份、共享认证与 PostgreSQL 方案补充计划

## 目标

在现有多团队 Workbench/asset-space 方案上补充三项决策，并完成上一轮四项文档清理：

1. 明确当前暂不接入公司统一身份系统，Workbench 先复用 DSH Desktop 的认证上下文；Team Knowledge Backend 必须验证并映射 DSH 身份，不能把 `desktopWorkbenchOwnership` 当授权。
2. 明确 Git、WeKnora、SkillHub、TeamLab 等内部组件可以复用统一的服务接入配置/服务身份，但不把用户 DSH token、launch token 或组件服务凭据互相混用。业务责任人和技术执行人分开记录。
3. 将 PostgreSQL 纳入 Team Knowledge Backend 的正式架构，保存团队成员映射、Creation Session、Draft、审批、外部操作、Job、幂等、对账和审计；Git/WeKnora/SkillHub/TeamLab 的专业数据权威边界不变。
4. 清理 Plugin Marketplace 术语、P5 多租户歧义、P0 重复样本项和 RACI 角色/章节编号问题。

## 身份与认证决策

### DSH 认证作为当前身份入口

- 不新增公司统一身份系统接入作为 P0 前提。
- 用户通过 DSH Desktop 登录/认证进入 Workbench；Workbench 后端只接受 DSH 宿主提供的、可验证的用户身份上下文。
- `desktopWorkbenchOwnership` 仅用于读取宿主 Session ownership metadata，不是授权依据。
- DSH launch token 仅用于宿主启动交换，不转发给 Team Knowledge API、Git、WeKnora、SkillHub、TeamLab 或后台 Worker。
- 后端映射稳定内部 `principal_id`、`dsh_subject`、display name 和当前 `team_id/asset_space_id`；客户端不能自行提交 `team_id`、owner、approver 或 publisher 作为可信字段。
- 后续若接入公司统一身份系统，保留认证适配器边界，不改变资产、审计和授权模型。

### 业务责任人与技术执行人

所有关键动作同时记录：

```text
requested_by / created_by / confirmed_by / approved_by / released_by
owner_id / executed_by / service_identity / source_commit / operation_id
```

- 人员 `principal_id`：创作者、协作者、steward、Skill owner、reviewer、publisher。
- 服务身份：Workbench Git service、WeKnora adapter、SkillHub publisher、TeamLab adapter、Worker。
- 默认由受控服务身份执行 Git commit/MR、WeKnora ingest、SkillHub release 和 TeamLab 同步；真实用户通过业务字段、审批记录、MR metadata 和 audit event 体现责任。
- 不允许 Agent 使用个人长期 Token、伪造 Git author、绕过人工审核或自行批准发布。
- 同一团队可以复用内部组件的服务接入配置，但每个 asset-space 仍必须有独立的资源绑定、ACL、审计和最小权限范围；“共享组件/认证”不等于“共享资产数据”。

### Git/Skill 发布链

补充统一示例：

```text
DSH user identity
  → Team Knowledge principal/session authorization
  → user confirms/approves
  → service identity executes Git/WeKnora/SkillHub/TeamLab operation
  → PostgreSQL records responsibility, operation and read-back
```

Git commit 的 author/committer 可以是 Workbench service account，但 MR/commit trailer/asset metadata 必须关联真实业务责任人。Skill release 记录 `skill_owner`、`approved_by`、`released_by`、`executed_by`、source commit、package digest、release id、target 和 read-back status。

## PostgreSQL 决策

### 架构定位

在架构拓扑中加入：

```text
Team Knowledge Backend
  ├─ PostgreSQL：过程控制面、权限映射、状态、Job、审计
  ├─ Object Storage：原始材料、附件、大型 fixture
  ├─ Git：正式知识/Skill canonical source
  ├─ WeKnora：知识 Wiki/索引/检索
  ├─ SkillHub：Skill package 分发
  └─ TeamLab：已批准资产的内部协作/分发适配（按实际能力验证）
```

PostgreSQL 不保存 Git/SkillHub/WeKnora 的替代事实，不直接写 WeKnora 内部数据库。

### 数据模型和约束

在 `方案/06` 中增加：

```text
principal
team_membership
role_binding
service_identity
credential_binding
approval
review_task
operation
job
outbox_event
idempotency_key
reconciliation_record
```

并为现有对象补充：

```text
requested_by
created_by
confirmed_by
approved_by
released_by
executed_by
service_identity_id
team_id
asset_space_id
session_id
correlation_id
state_version
```

要求：

- 所有团队资源和异步操作带 `team_id`、`asset_space_id`；
- `asset_space_id + canonical_key`、`asset_space_id + repo_path` 建立唯一约束；
- 外部调用由 `operation/job/outbox_event` 支持幂等、租约、重试、读回和 reconciliation；
- 小型结构化草稿可用 PostgreSQL JSONB，大型原始材料/附件放加密对象存储；
- PostgreSQL 使用独立 database/schema/user、私网/TLS、Secret Manager、备份和恢复验证；
- P0 验证跨团队拒绝、Worker 重启恢复、重复发布防重、数据库故障时的 `unknown/degraded` 状态。

## 文档修改范围

1. `README.md`
   - 增加 DSH 认证作为当前身份入口及后端重验证原则；
   - 增加 Git/WeKnora/SkillHub/TeamLab 共享服务接入但独立责任、ACL 和审计的说明；
   - 增加 PostgreSQL、对象存储和 Team Knowledge Backend 的部署组件；
   - 将末尾“不建设独立开放 Plugin Registry 或通用 SaaS 多租户”改为“不建设独立业务 Plugin Marketplace 或通用 SaaS 多租户控制面”，避免否定 DSH Workbench market。

2. `方案/00-方案总览与关键决策.md`
   - 在系统职责/阶段顺序中加入 DSH auth adapter、PostgreSQL 控制面和共享内部组件适配；
   - 将 P5 的“多租户”改为“通用 SaaS 多租户控制面”；
   - 增加身份责任链和 Git/Skill 发布责任区分。

3. `方案/01-问题、用户与产品范围.md`
   - 增加 DSH 认证入口、团队成员和角色映射；
   - 说明当前不要求接入公司统一身份系统，但保留未来 adapter；
   - 统一“不建设独立业务 Plugin Marketplace”表述。

4. `方案/03-知识资产与生命周期.md`
   - 将“首期不建设开放 Plugin Marketplace”改为“不建设独立业务 Plugin Marketplace”；
   - 增加资产 owner、提交人、审核人和 service executor 的区分。

5. `方案/04-角色、治理与运营机制.md`
   - 统一 `Distribution/platform owner` 与 `distribution/runtime owner` 的命名；
   - 保持 `## 2. RACI` 后补充明确的 `## 3. 审核与责任边界`（或等价标题），避免跳号；
   - 增加 DSH principal、Git service、WeKnora adapter、SkillHub publisher、TeamLab adapter 的 RACI/审计责任。

6. `方案/05-系统架构与权威边界.md`
   - 在拓扑、权威边界和 Team Knowledge Backend 章节加入 PostgreSQL、Object Storage、身份映射和服务身份；
   - 明确 DSH auth 是当前入口，launch token/ownership 不作为通用授权；
   - 增加 Git/WeKnora/SkillHub/TeamLab 共用服务接入配置但按 asset-space 隔离数据与权限。

7. `方案/06-数据、状态与可追溯性.md`
   - 增加身份、角色、服务身份、凭据绑定、外部操作、outbox、reconciliation 数据模型；
   - 增加 PostgreSQL 作为过程控制面、对象存储作为原始材料存储的边界章节；
   - 增加业务责任字段和技术执行字段；
   - 增加腾讯云 PostgreSQL 部署、备份、恢复、私网/TLS、独立账号和故障状态要求。

8. `方案/07-发布、安全与故障处置.md`
   - 在知识/Skill 发布链中增加 DSH principal → 用户确认/审批 → service identity 执行 → PostgreSQL 审计；
   - 明确 Git commit/MR、WeKnora ingest、SkillHub release、TeamLab sync 的 executed_by 和 read-back；
   - 增加服务凭据不互用、DSH token 不下传和数据库故障/对账处理。

9. `方案/08-MVP实施、验证与验收.md`
   - P0 增加 DSH auth adapter、principal/team/role mapping、PostgreSQL migration、独立账号、备份恢复和跨团队拒绝验证；
   - 删除 P0 重复的样本集交付项；
   - 验收矩阵增加身份责任链、PostgreSQL 过程数据、服务身份和审计证据；
   - 保持 SkillHub/DSH 未验证时的管理员/fake provider fallback。

10. `方案/09-工作台信息架构与核心对象.md`
    - 增加当前用户/团队资产空间上下文来自 DSH auth + 服务端绑定；
    - 普通创作者不配置身份系统，只看到授权团队/asset-space；管理员配置服务连接和角色；
    - 补充提交、审批和发布动作的责任人展示。

11. `方案/10-Workflow到Skill的生成、测试与发布.md`
    - 补充 Skill owner、approved_by、released_by、executed_by、service identity、source commit、package digest 和 release read-back。

12. `验证/01-平台与Provider能力验证.md`、`验证/03-DeepSeek Harness能力验证.md`、`验证/04-DSH Desktop Workbench落地与多团队部署验证.md`
    - 增加 DSH auth context 验证、后端重验证、伪造 team/asset-space 拒绝、服务身份最小权限、Git/WeKnora/SkillHub/TeamLab 共用接入但数据隔离；
    - 增加 PostgreSQL migration、备份恢复、Worker 重启、幂等和审计 read-back 验证；
    - 不把 DSH ownership metadata 或 launch token 写成授权方案。

## 验证与质量检查

- 搜索并消除“开放 Plugin Marketplace”与 DSH Workbench market 的歧义；
- 搜索并消除 P5“多租户”与 P1 多团队 asset-space 隔离的歧义；
- 检查 `方案/04` 标题编号和 RACI 角色命名；
- 检查 P0 重复样本项；
- 检查身份字段、服务身份和责任链在 README、方案 05/06/07/08/10 及验证文档一致；
- 检查 PostgreSQL 只作为过程控制面，不替代 Git/WeKnora/SkillHub/TeamLab 专业权威；
- 运行 Markdown code fence、内部链接、旧术语和 `git diff --check` 检查；
- 不写入真实 DSH token、Git/WeKnora/SkillHub/TeamLab 凭据或业务材料。

## 预期结果

方案能够明确回答：当前用户如何通过 DSH 认证进入 Workbench、谁对 Git 提交和 Skill 发布负责、哪些身份实际执行外部操作、PostgreSQL 为什么必要，以及 Git/WeKnora/SkillHub/TeamLab 在共享内部接入条件下如何保持团队资产和审计隔离。
