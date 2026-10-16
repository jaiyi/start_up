# Team Knowledge Workbench：DSH Plugin、多团队资产与部署/知识结构补充计划

## 目标

基于 dsh-desktop 的实际仓库调研结果，更新团队知识工程方案，使以下决策成为一致的架构约束：

1. `team-knowledge-workbench` 是可复用、可进入 DSH Desktop Workbench 市场的产品/插件包；同一个 Workbench 可被多个部门安装。
2. `team-knowledge-asset` 是独立的团队资产域/资产仓库实例。不同团队安装同一个 Workbench 后，分别绑定自己的 asset space、Git 仓库、WeKnora space 和治理人员，资产、权限、审计与发布状态隔离。
3. DSH Desktop Workbench market 是宿主插件分发机制，不等同于 Team Knowledge asset registry，也不等同于本项目未来的开放 Plugin Marketplace。
4. P0 增加腾讯云非生产部署与能力验证工作：在已有 WeKnora 的基础上，部署/接入 Team Knowledge backend、DSH/Harness 验证环境和 SkillHub（前提是目标版本有可部署实现）；若 SkillHub 或 DSH 部署能力尚未确认，必须显式使用人工 fallback，不伪造集成成功。
5. 知识资产采用稳定、可治理的逻辑目录。Git 是知识事实的 canonical source，WeKnora 的展示路径和 metadata 映射必须与 Git 逻辑目录一致；禁止把知识文件平铺堆在根目录或让 WeKnora 形成另一套无法回溯的分类。

## 方案决策

### A. 产品、插件和资产的分层

```text
DSH Desktop / Workbench Market
  └─ team-knowledge-workbench（同一产品包，可被多个团队安装）
       ├─ Team Knowledge Backend adapter/UI
       ├─ Harness tool/Skill integration
       └─ team-specific configuration（不打进插件包）

Team A
  └─ team-knowledge-asset-A
       ├─ Git repository / protected branch / CODEOWNERS
       ├─ WeKnora space / knowledge base
       ├─ asset namespace / ACL
       └─ steward / reviewer / release policy

Team B
  └─ team-knowledge-asset-B
       ├─ 独立 Git / WeKnora / ACL / owner / audit
       └─ 可安装同一 team-knowledge-workbench 版本
```

Workbench package identity、DSH market catalog identity 和 Team Knowledge asset identity 必须分开；Workbench 安装成功不代表任何团队资产发布成功。

### B. 多团队安装与隔离

- Workbench 是可复用产品，不以团队名硬编码；配置通过受控 server-side tenant/team binding 注入。
- 每个 `asset_space` 至少绑定：`team_id`、`asset_repo`、`git_root`、`weknora_space_id`、`default_taxonomy_version`、`steward_ids`、`review_policy`、`distribution_targets`。
- 所有 Creation Session、source ref、draft、asset、operation、job、approval、release、handoff 和 feedback 都带 `tenant_id/team_id/asset_space_id`，服务端按租户和资源 ACL 校验，不能由客户端传入任意空间后直接使用。
- DSH Desktop 本地 state、session ownership 和 Workbench market install record 只保存宿主/本地安装状态；不能保存或替代团队资产正文、审批、版本和授权。
- 同一 Workbench 可以服务多个团队，但一次 DSH Runtime Session 仍只能有一个 Workbench owner；Workspace/session binding 必须显式记录。
- 首期采用“每团队独立 asset repo + WeKnora space”的默认隔离；若未来共享仓库，必须使用团队根目录、ACL、CODEOWNERS 和 cross-team deny，不把共享 monorepo 作为 P0 前提。

### C. P0 部署边界

```text
Tencent Cloud non-production
  ├─ Team Knowledge Backend / worker / database / object storage
  ├─ Git provider integration
  ├─ existing WeKnora（独立测试 space）
  ├─ SkillHub（目标版本可部署时）
  └─ DSH/Harness provider/runtime（目标版本可部署时）

User desktop
  └─ DSH Desktop + market/local installed team-knowledge-workbench plugin
```

DSH Desktop Electron shell 不直接部署到腾讯云服务器；服务器部署的是 Team Knowledge 控制面和经过验证的 DSH/Harness/SkillHub 服务或 provider。P0 只要求非生产、脱敏、可回滚验证环境，不把“服务可访问”写成“资产链路已集成”。

P0 部署清单包括：目标版本和制品、网络/域名/TLS、身份认证、租户隔离、数据库/对象存储、WeKnora 测试空间、DSH/SkillHub 健康检查、日志脱敏、备份恢复、资源预算、升级/回滚、监控和 owner。若 DSH 或 SkillHub 没有可确认的部署制品/API，保留人工发布/fake provider 路径并登记 blocker。

### D. 知识逻辑目录与 WeKnora 映射

默认知识仓库结构：

```text
team-knowledge-asset/
├── README.md
├── taxonomy/
│   └── v1.yaml
├── knowledge/
│   └── <domain>/
│       └── <topic>/
│           └── <knowledge-slug>/
│               ├── KNOWLEDGE.md
│               ├── metadata.yaml
│               ├── sources.yaml
│               └── CHANGELOG.md
├── profiles/
│   └── <profile>.yaml
└── CODEOWNERS
```

- `knowledge/<domain>/<topic>/<knowledge-slug>/` 是稳定逻辑路径；同一知识不得同时在多个路径维护正文。
- `KNOWLEDGE.md` 放可读正文，`metadata.yaml` 放 id/version/status/owner/sensitivity/taxonomy/source commit/review 信息，`sources.yaml` 保存受控来源引用；原始敏感材料不直接进入 Git。
- 创建知识时，Workbench 必须要求或建议 domain/topic，校验 taxonomy、slug、重复 canonical key 和 owner；新分类需要 steward 批准，不能由 Agent 随意造目录。
- WeKnora 以相同的逻辑路径和 metadata 建立 document/collection/space 映射：至少保留 `asset_space_id`、`knowledge_id`、`repo_path`、`domain`、`topic`、`version`、`source_commit`、`sensitivity`、`status` 和 ACL。
- Git 路径与 WeKnora 展示/过滤路径必须可双向追溯；WeKnora 的物理索引实现可以不同，但不能产生另一套无法映射的分类事实。
- 重命名、移动、合并、退役必须走 Git MR 和索引迁移/读回；不能直接在 WeKnora 后台改名后失去 Git 来源。旧路径保留 alias/redirect 或退役记录。
- P0/P1 验证新增：首次 ingest、增量更新、版本替换、重复 ingest、移动/重命名、退役、ACL、失败保留旧索引和 Git↔WeKnora round-trip。

## 修改文件

1. `项目/团队知识工程/README.md`
   - 将 `team-knowledge-workbench` 与 `team-knowledge-asset` 写成两个独立边界。
   - 明确同一 Workbench 可被多个团队安装，资产/权限/WeKnora space/Git repo 分别隔离。
   - 将 P0 部署与非生产验证纳入路线；删除“首期不做多租户”造成的歧义，改为“不建设通用 SaaS 多租户，但支持明确的团队 asset-space 隔离”。
   - 增加知识目录结构和 Git↔WeKnora 一致性原则。

2. `方案/00-方案总览与关键决策.md`
   - 产品定义和系统职责增加 Workbench package 与 Team Knowledge asset 的分离。
   - 核心决策增加 Workbench market、团队安装、配置绑定、asset canonical source 和 WeKnora 映射。
   - 阶段顺序调整：P0 增加腾讯云非生产部署基础和 DSH/SkillHub 能力侦察；P1 覆盖第二团队/第二 asset space 的隔离试装；后续再扩展市场正式准入。
   - 区分 DSH Desktop market、SkillHub 和未来 Plugin Marketplace。

3. `方案/01-问题、用户与产品范围.md`
   - 新增平台消费者：一个 Workbench 产品、多个团队资产空间。
   - 将跨团队推广从“未来多租户”改写为“同一插件多团队安装 + 独立资产治理”。
   - 增加团队管理员配置 Git/WeKnora/owner/policy 的任务和边界。

4. `方案/02-端到端知识工作流.md`
   - 在入口前增加 team binding/asset space 选择和授权校验。
   - 知识流程加入 taxonomy/domain/topic 选择、路径预览、重复检测、Git 目录生成和 WeKnora 同路径映射。
   - 增加 Workbench package 安装/配置到团队资产空间的流程；明确安装不是资产发布。
   - 增加双团队隔离和目录迁移的验证路径。

5. `方案/03-知识资产与生命周期.md`
   - 增加 `team-knowledge-asset` 作为独立资产域/仓库实例及其 metadata。
   - 增加规范化知识目录树、taxonomy、canonical path 和 WeKnora mapping metadata。
   - 扩展 asset/knowledge 元数据：`tenant_id/team_id/asset_space_id/repo_path/taxonomy_version/weknora_space_id`。
   - 明确知识正文权威在 Git，WeKnora 只按同一逻辑结构做索引/检索映射。
   - 将 DSH Desktop Workbench package 从业务 Plugin asset 中区分出来。

6. `方案/04-角色、治理与运营机制.md`
   - 增加 Workbench platform owner、team asset owner、WeKnora space admin、DSH distribution/runtime owner 的职责。
   - 增加跨团队安装同一 Workbench 的 RACI、团队边界和 cross-tenant deny。
   - 增加 taxonomy owner、路径迁移、目录治理和 WeKnora 对账责任。

7. `方案/05-系统架构与权威边界.md`
   - 增加 DSH Desktop client、Workbench Plugin package、Team Knowledge backend、team asset repository/space 和 Tencent Cloud deployment topology。
   - 权威边界中区分 Workbench package registry/market 与 team asset Git/WeKnora/SkillHub。
   - 增加 server-side team binding/auth、asset-space ACL、租户字段和安装配置回读。
   - 写明 DSH Desktop host state/ownership 不是授权，也不是共享团队控制面。
   - 写明 DSH launch token 不是 Workbench 后端通用 API credential；后台 worker 使用独立认证。

8. `方案/06-数据、状态与可追溯性.md`
   - 数据模型新增 `tenant/team/asset_space/asset_repository/taxonomy_node/workbench_installation/weknora_mapping/deployment_environment`。
   - 所有资源和 job 增加团队/资产空间关联；审计记录 Workbench version、team config、asset repo、WeKnora space、target 和 digest。
   - 增加 Git path↔WeKnora document mapping 状态、taxonomy migration 和 reconciliation 状态。
   - 区分 `workbench_installed`、`asset_published`、`weknora_indexed`、`dsh_loaded`。

9. `方案/07-发布、安全与故障处置.md`
   - 增加 Workbench Plugin market/install/update/uninstall/rollback 链；明确它不发布团队资产。
   - 增加 team binding、配置注入、跨团队授权、服务端认证、独立 worker credential 和 cancellation/audit。
   - 知识发布链增加 Git path 生成、WeKnora logical path read-back、移动/退役迁移和旧索引保留。
   - 增加腾讯云非生产部署、升级、备份、回滚和 unknown/reconciling 处置。

10. `方案/08-MVP实施、验证与验收.md`
    - P0 新增部署工作：Team Knowledge backend、DSH/Harness、SkillHub（若目标版本可部署）、WeKnora 独立测试空间、认证/监控/备份/回滚。
    - P0 增加 Workbench plugin package skeleton、单文件 client、内部安装验证和 team config contract。
    - P1 增加至少两个团队/asset space 安装同一 Workbench 的隔离验收。
    - 增加知识目录和 Git↔WeKnora round-trip 验收项。
    - 重新定义 P4/P5：DSH Workbench market 是产品分发路径，不应被“开放 Plugin Marketplace”条目否定；本项目仍不建设独立开放 Plugin registry。

11. `方案/09-工作台信息架构与核心对象.md`
    - 首页和首次进入流程增加团队/资产空间上下文，但避免将部署系统做成顶级导航。
    - 知识创作会话工作区增加“目标资产空间、知识目录、domain/topic/path preview、WeKnora mapping preview”。
    - 增加安装后首次配置向导/管理员入口，普通创作者只看到当前团队空间。
    - 增加同一 Workbench 多团队安装下的 session/asset isolation 展示规则。

12. `方案/10-Workflow到Skill的生成、测试与发布.md`
    - Skill 包和 knowledge dependency 路径加入 `asset_space_id/team_id` 以及固定 repository/revision metadata。
    - SkillHub 发布和 DSH handoff 区分“Workbench 已安装”与“Skill 已发布/加载”。
    - 增加跨团队同一 Workbench、不同 Skill/knowledge asset 的验证与反馈归因。

13. `验证/01-平台与Provider能力验证.md`
    - 增加 DSH Desktop Workbench package/market 实验：package layout、canonical repository identity、catalog/install/restart/enable/uninstall/readback。
    - 增加多团队安装同一 Workbench、team binding、cross-tenant deny、session ownership 和数据隔离实验。
    - 增加腾讯云 DSH/SkillHub 非生产部署 readiness 矩阵；没有真实部署证据时保留人工 fallback。
    - 扩展 WeKnora V-02 为 Git path↔WeKnora logical mapping、增量、移动、退役和对账实验。

14. `验证/03-DeepSeek Harness能力验证.md`
    - 写入 dsh-desktop 仓库事实：Workbench host、server/client contract、market installation、local state/ownership、安全边界和 restart/readback。
    - 明确 Workbench package market 与 Team Knowledge asset/SkillHub 分发边界。
    - 增加 TeamAI injection/handoff 必须验证 profile、revision、digest、installation、restart、enabled、UI/runtime readback 的矩阵。

15. 新增 `验证/04-DSH Desktop Workbench落地与多团队部署验证.md`
    - 作为 DSH Desktop 调研和落地专项验证材料，汇总仓库证据、插件包契约、市场准入、腾讯云部署拓扑、多团队安装隔离、失败恢复和证据模板。
    - 不把未确认的 SkillHub/DSH server API 写成已集成事实。

16. `项目/团队知识工程/验证/README.md`
    - 增加专项验证文档链接和“Workbench package market ≠ asset registry ≠ SkillHub ≠ Harness loaded”说明。

## 验证与质量检查

- 检查所有旧表述：`首期不做多租户`、`首期不做开放 Plugin Marketplace`、`P0 不要求真实部署`，按新边界改为不建设通用 SaaS/独立开放 registry，但支持 Workbench 多团队安装和 P0 非生产部署验证。
- 检查所有知识路径示例是否统一使用规范目录，避免同时出现多个根路径或平铺结构。
- 检查 `team-knowledge-workbench`、`team-knowledge-asset`、`Workbench market`、`SkillHub`、`DSH Runtime` 的术语边界。
- 检查 `workbench_installed ≠ asset_published ≠ weknora_indexed ≠ dsh_loaded ≠ running` 在 README、方案 00/05/07/08 和验证文档中保持一致。
- 检查每个异步操作是否带 `tenant_id/team_id/asset_space_id/session_id/idempotency_key/correlation_id/state_version`。
- 检查所有 WeKnora 发布链是否包含 `repo_path/source_commit/knowledge_id/version/ACL` 读回。
- 检查 DSH Desktop 安全事实：Renderer sandbox/context isolation、窄 IPC、ownership metadata 非授权、launch token 非通用 API credential。
- 运行 Markdown 内部链接检查、术语/旧表述搜索、`git diff --check`；本次只修改 Markdown，不执行代码测试。
- 不生成或提交腾讯云生产凭据、真实业务材料、Token、Cookie 或内部服务密钥；所有部署示例使用非生产/脱敏 placeholder。

## 预期结果

方案能同时回答：

- 为什么一个 team-knowledge-workbench 可以进入 DSH Desktop 插件市场并被多个团队复用；
- 为什么不同团队的 team-knowledge-asset、Git、WeKnora、权限和审计不会串线；
- 腾讯云已有 WeKnora、尚无 DSH/SkillHub 时 P0 先部署和验证什么；
- 知识创建时如何进入规范目录、如何避免平铺堆砌；
- 为什么 WeKnora 的逻辑结构必须与 Git 知识事实结构可双向映射；
- 为什么插件安装、知识发布、SkillHub 发布和 Harness loaded 仍是不同状态。
