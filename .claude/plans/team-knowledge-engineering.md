# 团队知识工程项目架构设计与文档落位计划

## 目标

在 `项目/团队知识工程/` 建立一个设计型项目，围绕团队已有的三类系统形成可实施的整体架构：

- WeKnora：知识内容与检索服务面；
- SkillHub：Skill 资产注册、版本、审核、发布和分发控制面；
- DeepSeek Harness：Agent session、Skill 装载、工具调用和任务执行面；
- Git + CI：知识工程源文件、Skill 源码、评审、自动校验、制品和回滚的工程底座。

设计重点是把上下游衔接清楚，优先自动化低风险、确定性的步骤，同时保留知识晋升、敏感信息外发、高风险工具调用和正式规则变更的人工责任。

## 核心架构决策

1. **引入 Git，但不让 Git 承担所有职责**：Git 保存可审计的源文件和 Skill 包源码，提供 MR/PR、CODEOWNERS、CI、变更历史、回滚和发布触发；不保存运行时 session、动态状态、向量索引和密钥。
2. **WeKnora 是知识服务投影，不是唯一源文件库**：原始资料、规范化知识条目和已批准文档以 Git/对象存储中的 canonical source 为准，批准后由流水线同步/索引到 WeKnora；WeKnora 不负责 Skill 版本晋升和运行权限。
3. **SkillHub 是 Skill 控制面，不是知识库**：SkillHub 管理 Skill 包、namespace、owner、版本、maturity、审核晋升、安装和撤回；Skill 内只保留任务说明、契约、模板和必要引用，长文档与持续变化资料回到 WeKnora。
4. **DSH 是执行面，不是发布治理面**：DSH 按 profile 固定安装 SkillHub 的具体版本和 digest，调用 WeKnora 检索知识，依据 profile/plugin/tool policy 执行；Skill 声明的权限不能突破 DSH 运行时策略。
5. **自动化先做“候选、校验、同步、观测、提醒”**：自动捕获、去重、分类、关联、生成草稿、schema 校验、secret 扫描、golden case、发布包、WeKnora 索引、遥测聚合和过期提醒可以自动化；正式发布、知识晋升、敏感信息审批、高风险写入和删除保留人工 gate。
6. **只保留一条发布链**：`Git MR → CI 门禁 → 人工审核 → SkillHub beta → DSH 非生产回归 → stable 晋升 → DSH pin 版本 → WeKnora/运行遥测反馈`，避免从 WeKnora、SkillHub、DSH 各自直接修改形成多主写入。

## 文档结构

创建以下文件，内容彼此分工，不重复已有研究文档：

```text
项目/团队知识工程/
├── README.md
└── 设计/
    ├── 00-总体概览.md
    ├── 01-系统边界与职责分层.md
    ├── 02-上下游数据流与状态机.md
    ├── 03-知识与Skill资产模型.md
    ├── 04-Git与自动化发布流水线.md
    ├── 05-自动化治理与人工控制点.md
    ├── 06-运行反馈与知识闭环.md
    ├── 07-安全权限与审计.md
    └── 08-MVP实施路线与验证矩阵.md
```

### README.md

说明项目目标、当前阶段、三大系统与 Git 的职责边界、文档索引、非目标和验证状态。明确项目当前为架构设计与 PoC 准备，不宣称已完成部署。

### 00-总体概览.md

给出目标闭环、逻辑架构图、控制面/服务面/执行面/数据面分层，以及成功标准。明确团队知识工程不是“自动写文档”，而是把经验变成可审计、可检索、可调用、可反馈的资产。

### 01-系统边界与职责分层.md

分别定义 Git/CI、WeKnora、SkillHub、DSH、对象存储、身份权限、遥测平台和可选聚合服务的职责、输入、输出、禁止承担的职责和单一事实来源，解决产品之间互相越权与重复建设问题。

### 02-上下游数据流与状态机.md

描述从业务现场/会议/项目复盘/外部资料进入收件箱，到知识候选、审核、发布、索引、Agent 使用、反馈和复核的端到端链路。定义 `captured/draft/reviewed/approved/published/deprecated/rejected` 等状态，并区分知识资产状态、Skill 发布状态和运行任务状态。

### 03-知识与Skill资产模型.md

定义 canonical source、知识条目、证据、规则、案例、流程、Skill 包、版本、owner、successor、适用范围、权限、副作用、评测证据和遥测关联字段。说明哪些内容进入 WeKnora，哪些内容进入 Git，哪些内容进入 SkillHub，哪些只进入运行数据库。纳入 `SKILL.md`、`skill.yaml`、输入输出 schema、effects、permissions、golden cases 的渐进式规范。

### 04-Git与自动化发布流水线.md

回答是否需要 Git：需要，并给出仓库组织方式、目录约定、分支/MR、CODEOWNERS、CI 门禁、制品 digest、Webhook、SkillHub 发布、WeKnora 增量索引、DSH profile 更新和回滚。强调 Git 是源文件和变更审计底座，不能成为向量库、运行状态或密钥仓库。给出自动化流水线伪流程和失败补偿。

### 05-自动化治理与人工控制点.md

按“可自动化/需人工确认/禁止自动化”分类。自动化包括捕获、OCR/转写、去重、标签、关系候选、模板生成、schema 校验、内容安全扫描、评测、同步、提醒和报告；人工 gate 包括事实确认、知识晋升、Skill stable、敏感数据外发、权限扩大、高风险工具和删除/覆盖。设计元 Skill、确定性脚本和 CI 三层分工，避免把门禁交给模型提示词。

### 06-运行反馈与知识闭环.md

定义 DSH 运行事件如何携带 skill name/version/digest、knowledge document/version、profile、tool、outcome、人工纠正和成本/延迟等关联字段；说明 OTel + Phoenix/Langfuse 二选一的观测边界，以及 skill-telemetry 聚合层如何生成 owner 报告、触发复核、降级、回滚或知识候选。禁止从一次运行自动升级组织标准。

### 07-安全权限与审计.md

设计身份、namespace、RBAC、DSH profile、Skill 声明权限与实际工具策略的双层权限；规定敏感数据、提示词正文、工具参数、密钥、生产写入、人工确认、审计事件、版本冻结、fail-closed 和回滚要求。区分 L0-L5 风险级别，并明确异常、索引失败、发布失败和下游不可用时的降级策略。

### 08-MVP实施路线与验证矩阵.md

按 PoC 阶段拆解：Git/CI 源文件门禁、SkillHub 发布晋升、WeKnora 索引同步、DSH 固定版本装载、运行 trace 和反馈回流。列出验证项、通过标准、证据位置、owner、状态和后续触发项。第一阶段不引入 Paperclip、A2A、Backstage、完整依赖图或同时部署 Phoenix/Langfuse。

## 具体实施步骤

1. 创建 `项目/团队知识工程/设计/` 目录；
2. 编写 README 和 9 份设计文档，使用“设计中/未验证/待 PoC”状态标记，避免把研究假设写成已实施能力；
3. 更新 `项目/README.md`，加入团队知识工程入口；
4. 使用已有研究文档作为参考链接，不复制候选产品事实，尤其引用 `skillhub-vs-skills-manager-and-a2a-skill-design.md` 和 `skill-platform-private-deployment-comparison.md`；
5. 做 Markdown 链接检查和 `git diff --check`；
6. 由后续 PoC 逐项验证 SkillHub 与 DSH 的真实安装、pin、回滚、WeKnora 索引和遥测接口，再回写验证矩阵；
7. 代码实现不在本次范围内，不引入运行服务、依赖或外部部署。

## 验证标准

- 项目目录职责与现有 `研究/产品/Agent资产与团队治理/` 不重复；
- README 能明确三大系统和 Git 的边界；
- 至少一条完整上下游链路覆盖：来源 → Git/CI → SkillHub/WeKnora → DSH → 运行反馈 → 治理动作；
- 每个自动化步骤都有失败降级和证据记录；
- 每个不可自动化的 gate 都有责任人和输入输出；
- 文档中的已实现、设计假设、待验证项严格区分；
- 所有内部相对链接有效，工作树通过 `git diff --check`。
