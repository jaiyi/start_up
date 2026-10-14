# 团队知识工程

> 一个面向团队的 AI 工作台：把会议、资料和日常工作方式变成可确认、可测试、可版本化、可发布的知识与 Skill。

## 产品定位

本项目是**知识与 Skill 的创作发布工作台**，不是通用任务运行器，也不是 DeepSeek Harness 的替代品。

用户把材料或工作想法带进来，Agent 负责梳理、追问和起草，用户负责讨论、校正和确认；平台把确认后的内容提交到正式系统，并展示发布证据和下游交接状态。

```text
资料入口：会议纪要/资料 → 梳理讨论 → 知识草稿 → Git/MR/CI → WeKnora
能力入口：工作流描述 → 追问建模 → Skill + 测试 → Git/MR/CI → SkillHub
发布交接：approved release → 版本/digest → DSH Provider/discovery/load
反馈回流：Harness/业务反馈 → 知识复核或 Skill 回归 → 新的变更与发布
```

## 两种核心体验

首页只有两个创作入口，点击后会创建独立的 Creation Session；用户在会话内完成梳理、确认、测试、提交和发布，而不是在多个系统状态页面之间跳转。

### 1. 资料变知识

```text
拖入会议纪要/资料
  → Agent 摘要、拆解、定位来源和发现冲突
  → 用户逐条讨论、修订和确认
  → 生成知识资产草稿
  → 提交 knowledge-assets Git 仓库
  → WeKnora 建立 Wiki/索引
  → 后续 Harness 会话中的 Agent 可检索并引用
```

原始材料、模型推断、待确认事项和正式知识必须分开。未经人工确认、Git/CI 和审核的候选不得进入正式知识库。

### 2. 工作方式变 Skill

```text
描述一个重复的工作流
  → Agent 追问输入、步骤、判断、例外和输出
  → 生成 Skill 草稿、脚本/资源、契约和测试集
  → 用脱敏样例试跑、比较和修改
  → 用户确认并提交 Git
  → 审核通过后发布到 SkillHub
  → 交给 DeepSeek Harness 的 Skill Provider 消费
```

Skill 不只是 Prompt，而是可阅读、可测试、可版本化、可发布的能力包。工作台负责证明它可以发布；Harness 负责在自己的会话中发现、加载并运行它。

## 系统边界

| 系统 | 主要职责 | 本项目如何交接 |
|---|---|---|
| 团队知识/Skill 工作台 | 资料收件、知识/Workflow/Skill 草稿、测试、审核、Git/MR、发布状态、反馈候选 | 生成经过批准的版本、digest、package metadata 和引用 |
| knowledge-assets Git | 知识、Skill、契约、测试和审核后的 canonical source | 由工作台发起变更，不绕过分支保护和审核 |
| WeKnora | 已批准知识的 Wiki、索引、权限过滤、检索和来源引用 | 工作台展示 ingest/index/read-back 状态 |
| SkillHub | Skill package 的注册、版本和发布分发 | 工作台展示 release、version、digest 和真实状态 |
| DeepSeek Harness | Workspace、Session、Skill discovery/load、Agent 对话、工具、权限、运行时人工批准、恢复和运行观测 | 工作台只提供已发布资产并接收结构化反馈引用 |
| 业务系统/SPC 后端 | 业务事实、动态状态、计算、告警、工单和生产运行 | 工作台不复制业务运行状态机 |

发布后的 Skill 进入任务执行，是 DeepSeek Harness 会话工作台的职责，不是本项目的主要产品模块。

## 核心对象关系

```text
Workspace
└─ Creation Session
   ├─ Knowledge Draft / Workflow Draft / Skill Draft
   ├─ Draft Revision / Test / Evaluation
   └─ Asset Revision → Release → Handoff

Feedback Candidate → 新的 Creation Session

Harness session / 业务系统
  └─ 消费已发布版本并返回 feedback reference
```

- **Creation Session**：一次独立、可暂停、可恢复、可并行的知识或 Skill 创作上下文，不是正式资产，也不是 Harness Session。
- **Knowledge**：Agent 应该知道什么，以及依据、范围和复核条件。
- **Workflow**：用户实际如何完成一类工作，是生成 Skill 的中间建模对象。
- **Skill**：从工作流抽象出的可复用任务能力包。
- **Release**：经 Git/CI/人工审核并带固定版本和 digest 的可交付资产。
- **Feedback reference**：来自下游运行的结构化引用，不是本项目复制的完整运行记录。

## 首个垂直切片

1. 上传一份脱敏会议纪要；
2. 生成摘要、决策、规则、行动项、冲突和知识候选；
3. 用户讨论、修改并确认；
4. 提交 Git，并同步 WeKnora；
5. 描述一个相关的重复工作流；
6. 生成 Skill 草稿、资源和 3–5 个测试例；
7. 用样例试跑、比较并修改；
8. 确认后提交 Git、发布 SkillHub；
9. 生成交接记录，供目标 DeepSeek Harness 环境验证发现和加载。

首期不做本项目自己的任务执行入口、通用 Runtime、完整 Session/Run 控制面、运行时工具调用追踪、开放 Plugin 市场、多租户和高风险生产写入。

## 文档阅读顺序

1. [方案总览与关键决策](./方案/00-方案总览与关键决策.md)
2. [问题、用户与产品范围](./方案/01-问题、用户与产品范围.md)
3. [端到端工作台工作流](./方案/02-端到端知识工作流.md)
4. [知识与 Skill 资产模型](./方案/03-知识资产与生命周期.md)
5. [角色、治理与运营机制](./方案/04-角色、治理与运营机制.md)
6. [系统架构与权威边界](./方案/05-系统架构与权威边界.md)
7. [数据、状态与可追溯性](./方案/06-数据、状态与可追溯性.md)
8. [发布、安全与故障处置](./方案/07-发布、安全与故障处置.md)
9. [MVP 实施、验证与验收](./方案/08-MVP实施、验证与验收.md)
10. [工作台信息架构与核心对象](./方案/09-工作台信息架构与核心对象.md)
11. [Workflow 到 Skill 的生成、测试与发布](./方案/10-Workflow到Skill的生成、测试与发布.md)
12. [DeepSeek Harness 能力验证](./验证/03-DeepSeek%20Harness能力验证.md)

验证材料只回答“外部能力实际证明了什么”，不能把未验证的发布、索引、装载或运行显示为成功。

## 不可绕过的原则

- 模型不能直接发布知识或 Skill，也不能推送 protected `main`；
- Git/MR/CI/人工审核是正式发布门禁；
- WeKnora 只接收批准后的知识；SkillHub 不替代质量评测和审核；
- Skill 只能声明能力需求，不能自行扩大工具权限或数据范围；
- 不把聊天 Memory、运行日志或业务原文直接当正式资产；
- `approved`、`published`、`loaded`、`running` 和 `succeeded` 属于不同系统状态；
- 没有真实系统证据时，不声称已经发布、索引、装载或运行成功；
- 不提交生产 Token、Cookie、密码、业务原文或个人敏感信息。
