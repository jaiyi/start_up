# 任务运行与编排产品分析

本目录用于分析 Agent Runtime、Workflow、Harness、任务执行控制面及运行时邻接组件。Kestra 是通用工作流编排而非完整 Agent 运行时；REA 是证据型 MCP 工具组件，LoongSuite dsh-plugin 是运行观测插件。

它关注的不是某一个模型有多强，也不是某一个 Agent 能不能完成单点任务，而是：

```text
模型如何被封装成可控、可审计、可复用、可进入业务流程的执行者。
```

---

## 1. 为什么需要这个分类

随着企业开始把 Claude、OpenAI、DeepSeek、Qwen、火山、通义、私有模型接入内部业务，问题会从“模型能不能回答”升级为：

```text
模型能不能接工具？
工具调用有没有权限？
业务动作能不能确认和回滚？
任务状态在哪里维护？
执行过程有没有 trace？
失败后能不能恢复？
成本、质量和安全如何治理？
```

这些问题不是模型层、知识库层或单一 Coding Agent 能完全解决的，而是 Runtime / Harness / Control Plane 层的核心职责。

---

## 2. 与相邻类别的边界

| 类别 | 核心对象 | 典型问题 | 与本目录的区别 |
|---|---|---|---|
| [软件工程工具](../软件工程工具/README.md) | 代码仓、工程任务、编辑与测试 | 面向工程的执行者/辅助工具；本目录关注通用执行环境和控制面 |
| [Agent 记忆与学习](../Agent记忆与学习/README.md) | 运行轨迹、评估、经验蒸馏、Harness 改进 | 事后学习和迭代；本目录偏事前约束和事中执行控制 |
| [人机协作与产物](../人机协作与产物/README.md) | Agent 产物、协作资料、任务空间 | 管结果和协作界面；本目录管任务运行时 |
| [知识库与检索](../知识库与检索/README.md) | 文档、知识切片、RAG、Wiki | 提供可引用的上下文；本目录决定如何使用上下文并调用工具 |
| [数据治理与隐私](../数据治理与隐私/README.md) | 数据资产、权限、血缘、质量、合规、隐私 | 数据控制面；本目录是任务执行控制面 |
| [数据与语义平台](../数据与语义平台/README.md) | AI 数据基座、本体语义层、Agent 数据底座 | 供给语义与数据；本目录组织任务执行 |
| [Agent 资产与团队治理](../Agent资产与团队治理/README.md) | Skill、团队配置、组织、预算和发布治理 | 团队资产控制面；本目录偏运行时执行控制 |
| [模型工程与服务](../模型工程与服务/README.md) | 训练复现、预测/决策、模型接入 | 提供模型能力或客户端接入；本目录负责任务状态和工具动作 |
| [业务应用与解决方案](../业务应用与解决方案/README.md) | 端到端业务任务成果 | 航天 CAE 等应用侧分析不等于通用运行时能力或已部署证明 |

---

## 3. 当前分析对象

| 产品文档 | 产品 / 能力 | 类型判断 | 核心问题 |
|---|---|---|---|
| [DeepSeek Harness](./deepseek-harness.md) | DeepSeek Harness | DeepSeek 模型进入工具、工作流、权限、状态和评测体系的运行时形态 | DeepSeek 类模型如何从 API 调用走向企业级任务闭环 |
| [DeepSeek Harness demo 架构与插件分析](./deepseek-harness-demo-architecture-and-plugin-analysis.md) | DeepSeek Harness demo | 本地 demo 的 FixedWorkflow、DSH 插件、混合对话、长期记忆和 Skill 演进分析 | 哪些 runtime / plugin / security / memory evolution 模式可借鉴到应用方案 |
| [openJiuwen](./openjiuwen-agent-core-and-claw.md) | openJiuwen（agent-core / JiuwenClaw） | 分层开源的 Agent 产品矩阵：运行时 SDK + 个人 AI 管家 + 编排 / 记忆 / 推理配件 | checkpoint 中断恢复的运行时原语、Skill 自演进无质检的治理风险，以及与 OpenClaw 的同构对照 |
| [Docker Agent](./docker-agent.md) | docker/docker-agent（Docker 官方实验项目） | 声明式 YAML Agent CLI 插件 + OCI 分发 + 四档安全模式 | Agent 定义如何像容器镜像一样分发，用户 CLI 选择优先于配置默认的安全原则 |
| [PraisonAI](./praisonai.md) | PraisonAI（MervinPraison，MIT） | 五层 Agent 栈 + Managed Agents 执行位置语义的多 agent 框架全家桶 | tools_run_on / run_on 双语义、completion_reason 枚举退出、doom-loop 检测等循环纪律 |
| [REA](./rea.md) | REA（morluto/rea） | **邻接对象：证据型 MCP 工具运行时** | Evidence contract、provider binding、progress/cancel/cleanup 与模型侧 schema 投影 |
| [LoongSuite dsh-plugin](./loongsuite-dsh-plugin.md) | LoongSuite dsh-plugin | **邻接组件：DSH 运行时 OTel GenAI Trace/Metric 插件** | 遥测采集、内容默认关闭与 Skill 级归因/资产发布回执如何分工 |
| [Kestra](./kestra.md) | Kestra | **普通工作流编排平台，非 Agent 运行时** | 后台异步任务的重试、状态与回执如何与 DSH、PG、Git 和 WeKnora 权威事实分工 |

航天 CAE 的[仿真 Agent](../业务应用与解决方案/航天CAE/deepseek-harness-aerospace-cae-simulation-agent.md)、[WeKnora + DSH 方案](../业务应用与解决方案/航天CAE/deepseek-harness-weknora-aerospace-cae-agent.md)和[工具链调研](../业务应用与解决方案/航天CAE/deepseek-harness-aerospace-cae-toolchain.md)是应用侧分析；[laya](../模型工程与服务/laya-typed-decision-engine-and-server.md)与[Magpie](../模型工程与服务/magpie.md)以模型决策/接入为主；[Harness²](../Agent记忆与学习/harness2.md)以事后优化为主；[Octop](../人机协作与产物/tencent-octop.md)以协作工作台为主；[DSH SuperAgent 原型](../软件工程工具/dsh-superagent-prototype.md)是非官方、非沙箱的编程研究原型。这些跨类链接只做对照，不重复归类。

TeamAI、Paperclip 和 SkillHub 等团队资产、组织和发布治理产品，见[Agent 资产与团队治理](../Agent资产与团队治理/README.md)。

---

## 4. 评估维度

后续分析这类产品时，建议重点看：

1. **模型接入**：是否支持 DeepSeek、Claude、OpenAI、Qwen、私有模型，多模型路由和 fallback 是否清晰。
2. **上下文装配**：是否能把知识库、业务对象、历史状态、权限信息和任务目标组装成稳定上下文。
3. **任务协议**：是否有 Prompt / Task Protocol / Skill 定义机制，而不是只靠临时 prompt。
4. **工具调用**：是否支持 Function Calling、MCP、API、数据库、企业系统连接器。
5. **权限边界**：工具、数据、动作是否有 RBAC、scope、审批、敏感操作拦截。
6. **状态管理**：长任务、子任务、重试、暂停、恢复、幂等、补偿是否可管理。
7. **Workflow / Multi-agent**：是否支持固定 workflow、动态计划、多角色协同、人机协同。
8. **Human in/on the loop**：高风险动作是否能让人确认，低风险动作是否能自动推进。
9. **Trace 与审计**：是否记录 prompt、上下文、工具调用、输入输出、审批、失败原因、成本。
10. **评测与质量治理**：是否支持离线评测、线上反馈、回归测试、bad case 管理。
11. **企业集成**：是否能接入 SSO、组织权限、API 网关、数据治理、日志平台、告警系统。
12. **部署形态**：SaaS、私有化、混合云、本地开发环境的边界是否清楚。

---

## 5. 对 Agent 时代的意义

Harness 会成为模型与业务系统之间的“任务执行控制面”。推荐关系是：

```text
用户 / 业务系统 / 自动触发器
        │
        ▼
Agent Runtime / Harness
        ├── 模型路由：DeepSeek / Claude / OpenAI / Qwen / 私有模型
        ├── 上下文：知识库 / 文档 / 本体 / 历史状态 / 业务对象
        ├── 工具层：MCP / API / SQL Endpoint / Workflow / 企业系统连接器
        ├── 控制层：权限 / 审批 / schema validation / 幂等 / 回滚
        ├── 观测层：trace / audit log / eval / cost / feedback
        ▼
业务数据库 / 数仓 / ERP / MES / CRM / OA / 知识库 / 文档系统
```

如果没有这一层，企业很容易变成每个部门都自己接一套模型 key、prompt、脚本和工具，短期 demo 很快，长期会出现成本不可控、权限不可控、审计缺失、经验无法复用、故障难恢复等问题。

---

## 6. 对我们当前项目的启示

### 6.1 家庭营养师项目

家庭营养师 Agent 现在的架构已经体现了轻量 Harness 思路：

```text
稳定知识：Git Markdown + WeKnora 知识库
动态状态：独立 Docker Postgres
状态读写：Family Nutrition MCP Service
对话入口：WeKnora Agent / 微信入口
```

后续要继续强化：

- MCP 工具必须保持 allowlist，不暴露任意 SQL；
- 长期偏好变更必须经过用户确认；
- 推荐、库存扣减、反馈学习要有审计记录；
- 菜谱知识和动态状态要分层，不把 Wiki 当业务数据库；
- 重要规则要沉淀为版本化 prompt / skill / policy。

### 6.2 连山产品

连山如果做工业 Agent 平台，Harness 层会比单纯“接一个大模型”更重要。

工业场景里的 Harness 应该管理：

- 工厂、产线、设备、工艺、质量、人员、权限等业务对象上下文；
- MES、EAM、QMS、PLM、ERP、数仓、知识库等系统连接；
- 工单创建、状态更新、复盘报告、知识回写等受控动作；
- 诊断过程 trace、专家确认、价值归因、EVI 证据链；
- 多模型和行业模型路由、成本控制、结果质量评测。

换句话说，工业 Agent 的壁垒不只是模型或 RAG，而是：

```text
业务对象语义层 + 受控工具层 + 任务状态层 + 人审审计层 + 反馈学习层
```
