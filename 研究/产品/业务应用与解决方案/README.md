# 业务应用与解决方案产品研究

本目录收录以**端到端业务任务成果**为交付物的应用，以及已有多篇递进研究的跨层产品体系。工业、航天、办公等行业/场景仅作为[交叉导航](../场景索引.md)标签；底层模型、单项组件和通用执行框架按主要能力归入各自目录。公司专题在对象下保留阅读顺序，不按技术层拆散。

## 当前研究对象

| 对象 / 专题 | 定位与证据边界 | 入口 |
|---|---|---|
| ZooWork | 交付型企业 Agent 平台；角色 Skill、审批和业务动作的厂商主张须与实际验证区分 | [产品调研](./zoowork.md) |
| 连山产品体系 | 内部产品、代码仓与当前能力的研究和诊断；不是项目实现或上线验收 | [01–10 阅读顺序](#连山产品体系) |
| Lattice | 外部工业 AI 产品公开能力研究与工程架构反推；推断不当作厂商确认的实现 | [01–02 阅读顺序](#lattice) |
| 航天 CAE | DeepSeek Harness、WeKnora 与 CAE 工具链在航天仿真任务中的**应用侧分析与可行性研究**，不是已部署产品 | [三篇专题](#航天-cae-应用侧分析) |

## 连山产品体系

依次阅读 01–08 产品/基础设施与场景能力研究、09 当前产品体系诊断、10 AI Native 任务闭环平台视角下的产品诊断。此处链接仅指向研究文档，不引入额外背景资料。

| 顺序 | 研究文档 |
|---|---|
| 01 | [Lisen Infra](./lianshan/01-lisen-infra.md) |
| 02 | [LADS](./lianshan/02-lads.md) |
| 03 | [DSRuntime](./lianshan/03-dsruntime.md) |
| 04 | [Workstation / iClaw](./lianshan/04-workstation-iclaw.md) |
| 05 | [边缘推理](./lianshan/05-edge-inference.md) |
| 06 | [FTA 场景演示](./lianshan/06-demos-fta.md) |
| 07 | [SPC 场景演示](./lianshan/07-demos-spc.md) |
| 08 | [参数优化场景演示](./lianshan/08-demos-param-opt.md) |
| 09 | [当前产品诊断](./lianshan/09-current-product-diagnosis.md) |
| 10 | [AI Native 任务闭环平台视角下的连山产品诊断](./lianshan/10-AI-Native任务闭环平台视角下的连山产品诊断.md) |

## Lattice

1. [01 产品调研](./lattice/01-产品调研.md)：外部产品与公开能力。
2. [02 工程架构反推](./lattice/02-工程架构反推.md)：从资料推断的架构，需与已确认事实区分。

## 航天 CAE 应用侧分析

| 文档 | 分析侧重点 |
|---|---|
| [DeepSeek Harness 航天 CAE Simulation Agent](./航天CAE/deepseek-harness-aerospace-cae-simulation-agent.md) | 仿真任务中的工具调用、求解、人审与审计闭环 |
| [WeKnora + DeepSeek Harness 航天 CAE Agent](./航天CAE/deepseek-harness-weknora-aerospace-cae-agent.md) | 知识底座、Agent 层、CAE 工具链与状态存储的分工 |
| [航天 CAE 工具链可行性调研](./航天CAE/deepseek-harness-aerospace-cae-toolchain.md) | 商业 API、开源仿真栈及 GUI 兜底的可行性与不确定性 |

通用执行框架本身见[任务运行与编排](../任务运行与编排/README.md)；知识后端见[知识库与检索](../知识库与检索/README.md)。这些方案分析均不能用作已经集成、部署或通过验收的证据。

## 研究边界

- 产品事实、公开能力和外部案例留在产品研究；连山当前诊断、产品判断及外部能力映射留在本专题。
- AI Native 任务闭环平台的方向判断与设计推演见[`洞察/AI原生转型/`](../../../洞察/AI原生转型/)；具体 AI 平台试点见[`项目/SPC-DeepSeek-Harness/`](../../../项目/SPC-DeepSeek-Harness/)；自己的架构决策、实现计划、测试及验证结果进入 `项目/`。
- 比较行业业务应用时，关注私有化部署与企业环境适配，工业数据、业务状态及现场系统接入，行业知识/工艺经验/诊断流程沉淀，HITL、人审、EVI、价值归因与反馈闭环，从 demo 到生产系统的工程化路径，以及行业 Know-how 与 Agent 工作流结合方式；这些是**评估问题**，并非对目录内对象能力的统一确认。
