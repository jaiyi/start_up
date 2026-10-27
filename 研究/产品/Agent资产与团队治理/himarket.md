# HiMarket：企业 AI 能力市场与 Skill 分发

> 调研口径：按本次会话日期 **2026-10-20** 截止，固定源码快照 [`6f86436`](https://github.com/higress-group/himarket/commit/6f86436eebd46b8531bbf2238604dbdb617938f5)（提交时间 2026-10-19 UTC）；仓库：[higress-group/himarket](https://github.com/higress-group/himarket)。资料来自该快照的 README、接口和服务实现；**没有安装、运行或接入本项目**。以下“提供/支持”指仓库声明或代码路径，不等于已验证生产行为。

## 结论与归类

HiMarket 是基于 Higress 的 **企业 AI 开放平台/能力市场**：把模型、MCP Server、Agent、Skill 和 Worker 作为可供管理员管理、开发者发现与订阅的产品。它同时涉及网关、门户、用量和审批；不是 WeKnora 一类知识库，也不是 DSH Runtime 本身。对团队知识工程最值得评估的是**面向消费者的 Skill 发现、包预览、版本与分发体验**，而不是把现有 Git 评审、资产权威或宿主装载回执直接交给它。[定位与功能矩阵](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/README.md#L34-L60)。

## 仓库确认的产品结构

| 层面 | 可确认的机制 | 与本项目的边界 |
|---|---|---|
| 平台拓扑 | README 分为 Higress/Nacos 等基础设施、管理员平台和开发者门户；管理员配置能力和策略，开发者发现、申请、订阅。来源：[架构](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/README.md#L62-L74)。 | 团队知识工作台的 Creation Session 和 Git canonical source 不因门户存在而自动成立。 |
| 能力市场 | README 列有模型、MCP、Agent、Skills、Workers，以及 HiChat/HiCoding；声称 Skill 包可上传、订阅、安装，产品可做多版本、灰度与回滚。来源：[功能矩阵](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/README.md#L44-L60)。 | 市场里的“订阅/安装”与本项目要求的目标 DSH profile 实际加载和真实任务成功是不同证据。 |
| Skill 包处理 | `POST /skills/{productId}/package` 接收 ZIP、标注 `@AdminAuth`；支持文件树、单文件内容、版本列表、草稿、下载和 Nacos 导入。上传服务限制 ZIP 文件 30 MB，并分别调用 AIRegistry 或 Nacos。来源：[SkillController](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/controller/SkillController.java#L40-L113)、[上传实现](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/service/impl/SkillServiceImpl.java#L75-L155)。 | 与“只有来源定位 / 目录清单未知 / 已取得包但缺契约与测试”的引入故事相邻；ZIP 大小限制和处理后端要在 PoC 中单独验证。 |
| 审核状态 | 管理员接口可提交 reviewing 并触发扫描，也允许 `online + force` 跳过常规审核；服务实现确实分流 `forcePublishVersion`。来源：[接口契约](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/controller/SkillController.java#L95-L114)、[状态分支](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/service/impl/SkillServiceImpl.java#L631-L672)。 | **不能把其审核状态当作本团队的 Git/MR/CI/人工审批回执**；强制发布权限与日志需单独核验。 |
| 查阅权限 | 文件树/单文件内容接口标注 `@PublicAccess`，但服务对非管理员只允许请求 `online` 版本；并非可据此推断草稿对外泄露。来源：[控制器](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/controller/SkillController.java#L69-L92)、[版本限制](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/service/impl/SkillServiceImpl.java#L982-L1011)。 | 仍须验证门户/产品/团队权限，尤其在线包里含 references 或 scripts 的情形；**目录可见不等于获准读取或执行**。 |
| 工程形态 | README 列本地 JDK 17/Node 18+/Maven/MySQL 8，以及 Docker Compose、Kubernetes Helm 部署路径；LICENSE 为 Apache-2.0。来源：[启动与部署](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/README.md#L91-L188)、[许可证](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/LICENSE#L1-L15)。 | 自托管需要网关/注册后端/数据库运维，不宜仅为一个 Skill 入口即引入整个平台。 |

## 对团队知识工程的评估建议（推断，而非现有集成）

1. **先比较注册/分发能力，不预设替换 SkillHub。** 现方案以 Git merge + CI 生出固定 digest，再由 SkillHub 记录 release、TeamAI/适配器分发，最后由 DSH 做安装/加载读回。若考虑 HiMarket，先决定它是门户、候选 registry，还是仅供市场经验参考；不能同时把 HiMarket 与 SkillHub 都声称是唯一 release 权威。参照本项目 [`05-系统架构与权威边界.md`](../../../项目/团队知识工程/方案/05-系统架构与权威边界.md)。
2. **把引入与发布拆开。** 用户可先提供有权来源定位、固定 revision 或不完整包；在本工作台记录原件、文件清单、缺项、差异、测试和审核。HiMarket 的 ZIP 上传是其产品操作，不是本工作台已受理或质量达标的证据。PoC 要验证原 Skill 目录、测试/契约、依赖锁是否无损保存，且如何从 Git digest 映射到市场版本。
3. **审查特权状态转移。** `force` 发布是明确存在的管理员路径；[删草稿流程](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/service/impl/SkillServiceImpl.java#L1075-L1106)还会调用处理 reviewing version 的方法，[该方法](https://github.com/higress-group/himarket/blob/6f86436eebd46b8531bbf2238604dbdb617938f5/himarket-server/src/main/java/com/alibaba/himarket/service/impl/SkillServiceImpl.java#L1573-L1603)可调用 Nacos publish。**这只是需要实测的状态/审批审计点，不据此宣称已发生越权**；须检验 Nacos 审核语义和权限。
4. **先做脱敏隔离 PoC**：验证 ZIP 解包与危险文件处理、在线文件查阅 ACL、审核/强制发布审计、固定版本/digest/撤回读回、与 DSH Skill 装载契约的兼容性。此文没有替产品声称已经具备本项目需要的全部门禁。

## 未验证事项

没有执行 HiMarket、Nacos/Higress 部署、上传真实 Skill、权限/扫描/强制发布的端到端测试；也未核验版本 digest 与 DSH 目标安装、加载或执行回执。因此本文是**源码与产品定位调研**，不是选型结论或安全认证。
