# MVP 实施、验证与验收

> 本文是唯一的实施路线和验收入口。首期交付知识与 Skill 创作发布闭环；DeepSeek Harness 的会话执行由下游能力验证和交接验证覆盖，不作为本工作台 Runtime 建设。

## 1. 交付方式

采用：**一个知识域、一个高频低风险工作流、一个 Git provider、一个 worker、一个知识 steward、一个 Skill owner、一个发布目标、一个下游 Harness 验证环境和一个腾讯云非生产部署环境**。

每个阶段留下版本、环境、fixture、运行命令、预期/实际结果、失败动作、owner、回滚方式和 Go/No-Go 决策。P0 的部署对象是 Team Knowledge Backend、worker、PostgreSQL、对象存储、现有 WeKnora 的独立测试空间，以及目标版本可确认时的 DSH/Harness、SkillHub 和 TeamLab 服务或 provider；DSH Desktop Electron 客户端通过本地/市场安装 Workbench Plugin，不作为腾讯云服务部署。当前用户认证复用 DSH Desktop 上下文，不以公司统一身份系统接入作为 P0 前提。

## 2. P0：双资产边界与能力侦察

### 交付

- 一个真实但脱敏、可回放的知识样本集和任务样本集；
- 腾讯云非生产 Team Knowledge Backend、worker、PostgreSQL、对象存储、网络/TLS、DSH auth context 映射、日志脱敏、备份恢复和监控基础；
- 已有 WeKnora 的独立测试 space，以及 Git↔WeKnora mapping 的验证数据；
- DSH/Harness、SkillHub 和 TeamLab 的目标版本、部署制品和健康检查验证；若无法确认，记录 blocker 并启用管理员/fake provider fallback；
- `team-knowledge-workbench` 的 package skeleton、server/client contract、构建产物和一次内部安装/重启/read-back 验证；
- 知识规范目录、taxonomy、domain/topic/path preview、Git↔WeKnora mapping 和迁移/退役 contract；
- 工作台首页、两个启动动作和 Creation Session 原型；
- principal/team membership/role binding、service identity、Git 提交人和 Skill 发布责任链模型；
- session、draft、asset revision、release、handoff、审批、operation/job/outbox/reconciliation 和反馈引用模型；
- 会话隔离、暂停/恢复、归档、分叉、只读和并发冲突规则；
- SkillHub/DSH handoff metadata 和 fake distribution contract，不要求真实 Harness runtime；
- Plugin manifest/tool contract 的预留边界和 fake provider contract，不要求真实 Plugin runtime；
- fake Git/WeKnora/SkillHub/TeamLab provider 或 adapter contract；
- Skill input/output、effects、能力需求和风险模型；
- 目标版本的 WeKnora 状态、SkillHub/TeamLab API、DeepSeek Harness Provider/discovery/load 能力记录；
- 不使用生产 Token 的验证证据。

### P0 退出

双资产 schema、非法状态、幂等、权限冲突、契约失败、运行归因、故障路径和人工 fallback 均有测试；腾讯云非生产环境可部署、可观测、可备份和可回滚；PostgreSQL migration、跨团队拒绝、Worker 重启恢复和外部操作对账可验证；WeKnora 测试 space 可完成 Git path/metadata/read-back 验证；Workbench package 可完成安装、重启、enabled/UI read-back；DSH/Harness、SkillHub、TeamLab 尚未确认的能力都有 owner、日期、blocker 和人工 fallback。

## 3. P1：双资产 MVP 闭环

### 知识交付

首页“从资料创建知识”必须创建独立 Knowledge Creation Session；会话内包含材料、候选卡片、变更包、Git provider、CI/CODEOWNERS、审核、WeKnora ingest/status/search、引用和复核任务。

### Skill 交付

首页“从工作流创建 Skill”必须创建独立 Skill Creation Session；会话内包含 Skill 需求卡、Workflow Draft、模板化创建、input/output schema、知识依赖、effects/能力需求声明、golden/regression/security、Git/CI 审核、digest、SkillHub/fallback 发布和 DSH handoff metadata。

- SkillHub/DSH Provider 未验证时使用管理员发布或 fake adapter，但必须保持 package、digest、approval、target 和回滚状态可追踪。

### P1 退出

- 非程序员不操作 Git 即可从两个启动动作进入独立会话，并创建知识和 Skill 草稿；
- 至少两个团队/asset space 可以安装同一 `team-knowledge-workbench`，且 Git、WeKnora、Creation Session、ACL、审计和发布状态完全隔离；
- 知识创建能生成规范 repo path，WeKnora 能读回相同 knowledge ID、logical path、version、source commit 和 ACL；
- 用户可以同时打开多个知识/Skill 会话，暂停、恢复、归档、分叉和只读；
- 会话上下文、材料、草稿、异步操作和回调不会串线；
- 同一正式资产的并发修改检测 base revision，冲突不会静默覆盖；
- 知识检索结果带 document/version/source/ACL；
- 发布版本能生成可供下游 Harness 验证的 version/digest/dependency metadata；
- 重复请求不重复创建 MR、release 或 index；
- CI 失败、契约冲突或权限超界不能发布；
- SkillHub、WeKnora 和 provider 超时有清晰状态和人工接管；
- 至少有一项真实或脱敏回放场景完成双资产生产线。

## 4. P2：发布交接与反馈闭环

### 交付

发布版本、digest、handoff target、交接读回、反馈引用、知识复核队列、Skill 回归队列、每周复核、每月质量报告、stale/纠正率/失败率提醒、备份 owner、退役和回滚流程。

### 退出

反馈不直接改正式资产；连续 4 周有真实消费或脱敏回放和复核记录；至少一个质量指标改善；知识问题能进入知识 MR，Skill 问题能进入 Skill 回归；未知交接状态可人工对账。

## 5. P3：DeepSeek Harness 消费能力验证

在创作发布闭环稳定后，验证目标 Harness 环境能否发现、加载并在自己的会话中消费固定 Skill 版本。验证内容包括 Provider/discovery/load、版本和 digest 一致性、知识依赖提示、profile/工具策略边界、人工批准、下游反馈引用和回滚协作。

本阶段不在本项目实现 Harness Session、Run、Tool Call 或业务任务状态机；只保留交接协议、验证结果和反馈引用。

## 6. P4：控制台/Gateway 与受控 Plugin 管理演进

只有在两个以上知识域或 Skill 稳定使用、出现第二 provider、人工状态查询成为瓶颈、需要集中权限/审计，或模块化单体无法接受地测试发布时，才评估 Console/Gateway/adapter、Plugin catalog/runtime、签名事件和低风险 MCP。

### Plugin 交付

- Plugin catalog 和最小 manifest/tool contract；
- 一个低风险外部系统适配器或受控内置 Plugin；
- 权限/凭据声明、Secret Manager 引用和 profile/tool policy；
- 安全、依赖/SBOM、兼容性、health、超时/重试/幂等门禁；
- 安装、启用、禁用、撤回、回滚和运行归因；
- Plugin 故障与 Skill 质量问题的反馈分流。

新增层不能改变 Git、WeKnora、SkillHub、DSH、Plugin package 和人工审核的权威边界。

## 7. 独立业务 Plugin、MCP 与高风险能力

验证第三方 Plugin、Registry/Marketplace、MCP、沙箱、多租户和生产写入。必须先有 P4 的真实价值、隔离构建、依赖扫描、审批、二次确认、观测和回滚证据。

## 8. 统一验收矩阵

| V-01 | 工作台与会话入口 | 首页有两个启动动作、最近创作和待处理事项；创建后进入正确的 Creation Session |
| V-02 | Workbench Plugin 安装 | package、canonical repository、digest、安装、重启、enabled/UI read-back 可验证；安装不被报告为资产发布 |
| V-03 | 多团队资产隔离 | 两个团队安装同一 Workbench，team/asset-space/Git/WeKnora/ACL/session/审计互相隔离 |
| V-04 | 知识目录与索引映射 | domain/topic/path preview、canonical key、Git↔WeKnora mapping、增量、移动、退役和旧索引保留可验证 |
| V-05 | 会话隔离与生命周期 | 多会话可并行；暂停、恢复、归档、分叉、只读可用且上下文不串线 |
| V-06 | 草稿与并发 | session/draft/revision 可追踪；同 base revision 并发提交触发冲突和人工合并 |
| V-07 | 双资产 schema/状态 | 合法/非法/重复/并发迁移有测试 |
| V-08 | Skill 创建 | 模板、metadata、契约和知识依赖可生成并审核 |
| V-09 | Skill 门禁 | schema、effects、能力需求、依赖、golden/regression/security 有效 |
| V-10 | Git 变更 | 知识/Skill 路径安全、MR 幂等、CI/审批有效 |
| V-11 | WeKnora | 来源/版本/ACL 可读回，失败保留旧版 |
| V-12 | Skill 发布 | digest、release、目标和回滚可读回 |
| V-13 | 非程序员体验 | 不操作 Git 可创建、确认、审核和发布 |
| V-14 | 交接协议 | 下游 target、version、digest 和依赖可追踪 |
| V-15 | 反馈分流 | 知识问题启动知识复核会话，Skill 问题启动 Skill 回归会话 |
| V-16 | 身份与责任链 | DSH principal、team/role ACL、Git service identity、approved_by/released_by/executed_by 和跨团队拒绝可审计 |
| V-17 | PostgreSQL 控制面 | migration、事务/乐观锁、幂等、备份恢复、Worker 重启和数据库故障的 unknown/degraded 状态可验证 |
| V-18 | 安全审计 | 无 secret 泄露、越权和不可追踪写入 |
| V-19 | 故障恢复 | 超时、丢回调、重复和未知状态可对账 |
| V-20 | 稳定发布 | released/rollback 有批准、证据、digest 和旧版本 pin |
| V-21 | 运营价值 | 至少一个场景减少重复劳动或返工 |
| V-22 | Plugin 预留契约 | P0 有 manifest/tool contract、权限边界；不要求真实业务 Plugin runtime |
| V-23 | Harness 能力验证（P3） | Provider/discovery/load 和反馈引用有可重复证据 |
| V-24 | 分发 contract | SkillHub/TeamLab/管理员路径中，MR、固定版本、目标交接、实际读回、回滚和 fallback 可验证 |
| V-25 | Agent Manifest 复用（后续） | 依赖 Skill/知识可追踪，不能绕过审批；不要求首期实现 |

详细平台实验见[验证材料](../验证/README.md)。

## 9. Coding agent 交付规范

每次只给 coding agent 一个小任务包：背景、范围、输入输出、禁止事项、失败测试、最小实现、验收命令、证据路径和回滚方式。先做 schema、状态机、fake provider、契约和回归，再做 UI 和真实 provider。

Agent 不拥有生产凭据，不直接 merge `main`，不执行任意 shell/路径，不隐藏未验证能力。完成后必须做独立 code review、安全 review 和范围检查。

## 10. Go/No-Go

以下任一项不通过，就保持当前阶段：双资产权限隔离、审计完整性、契约和回归、知识/Skill 版本可追踪、发布目标和交接读回、未知状态处理、旧版本保留、回滚、人工接管、secret 扫描、非程序员可用性或真实业务价值。P3 另需 Harness discovery/load 和反馈引用证据；P4 另需 Plugin 权限、安装、健康、兼容性和回滚证据。
