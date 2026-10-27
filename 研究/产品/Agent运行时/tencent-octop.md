# Octop：多用户、多 Agent 的自托管 AI 助手

> 调研口径：按本次会话日期 **2026-10-20** 截止，固定源码快照 [`4632d0f`](https://github.com/TencentCloud/Octop/commit/4632d0f42962e50527959a02ff58286d0f6b15e2)（提交时间 2026-10-20 UTC）；仓库：[TencentCloud/Octop](https://github.com/TencentCloud/Octop)。资料来自该快照的中文 README、架构文档、连接器目录与 LICENSE；**没有部署或测试**。README 的功能表述与规划项应分别看待。

## 一句话定位

Octop 是面向**个人、家庭和小团队**的自托管 AI 助手平台，把多用户/多 Agent、专家库、Web/CLI/IM 对话、定时任务、连接器、工作区和记忆组装成单进程产品。它是一个可替代或参考的**应用/运行工作台**，不是纯 Skill Registry，也不是 WeKnora 或本项目 DSH Workbench 的原生插件。[中文 README：定位](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L42-L79)、[架构概览](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/docs/architecture.md#L1-L34)。

## 产品、架构及适用边界

| 层面 | 公开资料可确认的设计/声明 | 对团队知识工程的判断 |
|---|---|---|
| 入口与执行 | Web UI、CLI、IM 与 Cron 汇入同一 Agent 运行体系；架构文档明确各入口的 Session key/协议；底层组合 `octop-harness`、`octop-gateway`，对话框架为 LangGraph。来源：[架构](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/docs/architecture.md#L1-L34)、[入口与 Session](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/docs/architecture.md#L81-L99)。 | 可借鉴跨入口统一对话/任务与可重启状态设计，但**不应误认作 DSH 的 Session、profile 或插件 API**。 |
| 数据与工作区 | 单 Python 进程；控制面（用户、Agent、会话、通道、定时任务等）默认 SQLite/WAL，可选 PostgreSQL；每个 Agent 的 Markdown/Skill/模板经 `BackendWorkspace` 访问，本地目录或远端存储与控制面数据分离。来源：[存储边界](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/docs/architecture.md#L101-L131)、[README：技术栈](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L87-L109)。 | 区分“控制面记录”和“Agent 工作区文件”值得参考，但后者不是经过 Git/MR/CI 的团队正式资产权威源。 |
| Agent 及技能 | README 列有专家库/共享、按 Agent 开关 Skill 的 `octop skills` CLI；README 的规划列表将“技能/子智能体资源共享池”列为已完成。来源：[专家与共享](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L110-L123)、[路线图](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L157-L177)、[CLI](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L414-L430)。 | 共享池是产品声称，不等于含本项目要求的来源授权、测试、Git 评审、不可变 digest、SkillHub release 和目标加载读回。 |
| 外部能力 | README 称提供 OAuth/MCP Connector、知识库和 ACP；[连接器清单](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/docs/connectors.md#L35-L65)列 `weknora`（`custom_fields` / `gateway`）与可添加自定义 MCP。来源：[产品概述](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L42-L60)、[连接器说明](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L404-L410)。 | **存在连接器条目≠已按本项目 team/asset-space ACL 接入 WeKnora、具备已发布知识的 read-back 或有权调用外部工具**。 |
| 安全与部署 | README 声称 JWT 多用户隔离、工具审批、Shell 命令防护与敏感信息脱敏，提供 Docker/本地等安装形态；LICENSE 为 MIT。来源：[安全声明](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L538-L545)、[部署](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L181-L305)、[许可证](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/LICENSE#L1-L20)。 | 声明不是已验证的租户隔离、安全审计或私有化验收；须逐入口核授权、秘密存储、沙箱、数据出站。 |

**不要混淆规划与现状。** README 将 AgentTeams 标为 Beta/进行中，把对话自动沉淀为 Skill、Managed Agents、Project 边界、浏览器 Skill 录制增强和插件市场列为规划；这些不应当作已经可用于本团队发布链的能力。[原始路线图](https://github.com/TencentCloud/Octop/blob/4632d0f42962e50527959a02ff58286d0f6b15e2/README_CN.md#L157-L179)。

## 对团队知识工程的评估建议（推断）

1. **把 Octop 放在宿主/执行面候选的位置评估**，而不是直接插进现有 `DSH Desktop Workbench + Team Knowledge Backend + Git/WeKnora/SkillHub` 的责任表。若想采用 Octop，须先明确是并列试验环境还是替换执行宿主；其 LangGraph/octop-harness、Session key 和工作区不能默认为 DSH 的对应物。参照本项目 [`05-系统架构与权威边界.md`](../../../项目/团队知识工程/方案/05-系统架构与权威边界.md)。
2. **借鉴可用的交互组织**：多入口共享 Agent、专家可复用、技能按 Agent 启用、工作区与控制面分离；但“分享专家”和“注册正式 Skill”仍应是不同动作，已有正式版的团队资产 ID 必须来自有权选择，外部包不能凭链接捏造团队 ID。
3. **验证工作区和权限的真实路径**：用非敏感演示账户分别测试 IM/Web/CLI 的身份与会话隔离、Connector 最小授权、WeKnora 检索 ACL、Skill 目录来源与执行许可、审批和撤权后果。若评估把已批准的固定 digest 分发进 Octop，要验证目标安装文件清单、实际载入版本及运行结果；**没有现成的本项目适配器证据**。

## 未验证事项

没有运行 Octop 或连接模型、IM、WeKnora、ACP、外部 MCP；没有核验多用户隔离、工具审批、Skill 共享池在当前版本的端到端语义，也没有比对 Octop/DSH 的实际协议兼容性。仓库 README 所谓“本地优先”不等于模型/Connector/IM 不向外发送数据；部署前必须按具体提供方和网络策略核对。
