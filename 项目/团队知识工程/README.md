# 团队知识工程

> 面向 40 人业务团队的知识与 Skill 双资产 AI 工作台，并沿着受控 Plugin 管理持续演进：让业务人员把资料和任务经验沉淀为可治理、可运行、可复用、可复核的团队能力。

## 当前状态

当前处于 **P0：双资产边界与能力侦察**。本项目不是只做 WeKnora 知识库，而是同时建设两条资产生产线，并让它们汇合到 Agent 运行：

```text
知识生产线：资料 → 知识草稿 → 确认/审核 → Git/CI → WeKnora → 可引用知识
Skill 生产线：任务需求 → Skill 草稿 → 契约/权限/测试 → Git/CI → 发布/装载 → 可运行 Skill

知识版本 + Skill digest + profile
  → Agent 运行
  → 结果/反馈/业务结果
  → 知识复核或 Skill 回归

治理闭环与分发闭环分开：
- 治理闭环决定什么可以成为正式知识、Skill 或后续 Plugin；
- 分发闭环决定已批准版本如何安全到达目标 dsh/profile，并能读回、回滚和审计。
```

长期演进为三个独立资产域：

```text
Knowledge：Agent 应该知道什么
Skill：Agent 应该如何完成一类任务
Plugin：平台或 Agent 可以调用哪些受控外部能力

Skill 组合 Plugin 提供的工具完成任务；Plugin 不等于 Skill。
```

第一步只建设知识 + Skill：先跑通双资产创建、治理、装载、运行和反馈闭环；待双资产稳定并出现外部系统复用、集中权限/凭据或运行时隔离需求后，再扩展 Plugin 管理。

未经过目标环境验证的 DSH、WeKnora、SkillHub、DeepSeek Bot、Console 或 Gateway 能力，均不得视为已经集成。

## 如何阅读

按产品和落地顺序阅读：

1. [方案总览与关键决策](./方案/00-方案总览与关键决策.md)
2. [问题、用户与产品范围](./方案/01-问题、用户与产品范围.md)
3. [端到端双资产工作流](./方案/02-端到端知识工作流.md)
4. [知识与 Skill 资产模型](./方案/03-知识资产与生命周期.md)
5. [角色、治理与运营机制](./方案/04-角色、治理与运营机制.md)
6. [系统架构与权威边界](./方案/05-系统架构与权威边界.md)
7. [数据、状态与可追溯性](./方案/06-数据、状态与可追溯性.md)
8. [发布、安全与故障处置](./方案/07-发布、安全与故障处置.md)
9. [MVP 实施、验证与验收](./方案/08-MVP实施、验证与验收.md)

外部平台事实和源码评估放在[验证材料](./验证/README.md)，不能反过来定义产品目标。

## 核心判断

- 这是知识和 Skill 的双资产工作台，不是只有知识检索的系统。
- **知识**回答 Agent“应该知道什么”；**Skill**回答 Agent“应该如何完成一类任务”。
- Git 是知识源文件、Skill 源码、契约、测试、metadata 和评审的 canonical source。
- WeKnora 只负责已批准知识的索引、权限过滤和检索；它不能替代 Skill 管理。
- Skill/Agent 分发由已验证的 SkillHub、TeamAI distribution adapter 或管理员流程承担；TeamAI 负责 Git-based 初始化、同步、版本切换和本地 dsh 注入，但不负责事实审批、Skill 质量、知识检索或 Plugin runtime。
- DSH 负责 profile、Skill 装载、工具调用、人工确认和运行结果。
- Plugin 是长期演进的独立资产域，负责受控工具/外部系统能力的 manifest、权限、安装、健康和运行时治理；它不替代 Skill 管理。
- 模型负责提取、摘要、分类、起草和发现冲突；脚本负责 schema、权限、依赖、secret 和回归门禁；人负责事实、范围、风险和发布责任。
- 先用模块化单体 + 持久化 worker；Console/Gateway/Plugin runtime/多 provider 是演进形态，不是双资产目标的替代品。

## 当前阶段状态

- **已决定**：双资产产品边界、知识/Skill 关系、Git/WeKnora/SkillHub/DSH 权责、人工控制点和阶段顺序；分发层与治理层分离，TeamAI 是可替换的分发适配层候选；Plugin 是长期独立资产域，不进入首期硬依赖。
- **待验证**：目标版本的 DSH loader/profile、SkillHub API、TeamAI CLI/repository/hooks/local injection、WeKnora 索引状态、Plugin/tool 扩展、权限/凭据和 Bot 适配。
- **延后**：多租户、完整 Gateway、完整 Plugin Registry/Runtime、MCP 高风险工具、跨团队数字员工、Bot 协作和生产写入；不是延后 Skill 管理。
- **禁止**：模型直接发布知识或 Skill、Agent 直接 push/merge `main`、Skill 自行扩大权限、把 Bot Memory 当正式资产。

## 与其他项目的边界

`项目/SPC-DeepSeek-Harness/` 是验证 DSH/Agent 平台能力的业务试点；本项目沉淀可复用的知识与 Skill 双资产方法。

`研究/产品/Agent资产与团队治理/` 记录外部产品事实和横向选型；本项目记录团队自己的决策、验证和实施结果。

## 维护规则

- 方案目录回答“目标是什么、如何运行、如何治理和如何落地”；验证目录回答“外部能力实际证明了什么”。
- 每个关键决策只有一个权威位置；其他文档通过链接引用，不重复改写。
- 知识、Skill、运行和发布状态都必须有证据；超时、回调丢失和状态未知不能展示为成功。
- 不提交生产 Token、Cookie、密码、业务原文或个人敏感信息。
