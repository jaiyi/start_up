# 收敛团队知识工作台与 DeepSeek Harness 边界

## 调研结论

已核查两类材料：

1. 官方公开仓库 `deepseek-ai/deepseek-harness` 的 README 和 User Guide；
2. 本地 `agent/deepseek-harness` 实现及其 `dsh-memory-evolution-web` 插件。

官方 Web UI 当前产品主线是：

```text
启动 dsh web
  → 配置 Model
  → 选择 Workspace
  → 创建 Session
  → 对 Agent 发送任务
  → Agent 读写 workspace、运行命令、委托工作和维护计划
  → Web UI 按运行时权限请求操作批准
```

官方文档明确把 Web UI 定义成 Agent 会话工作台；官方仓库的核心定位是 `Everything is a Plugin`，插件向运行时注册能力。Skill/插件的加载、会话、工具调用和运行批准属于 Harness 运行面。

本地实现进一步显示：

- DSH Web UI 已有 workspace 选择、session、model 设置和 Agent 任务执行；
- `dsh-memory-evolution-web` 已提供长期记忆设置、来源授权、整理任务、Skill 候选、独立评估、批准、发布、禁用和回滚；
- 已发布 Skill 后续由 DSH Skill Provider / 当前会话按需加载，属于 Harness 会话能力；
- 记忆/Skill 插件的 WebUI 是运行时插件的管理界面，不应被直接等同为本项目要建设的知识工程产品。

## 对产品边界的修正

本项目的工作台应收敛为：

> **团队知识与 Skill 创作发布工作台**：帮助用户把会议/资料整理成可审核的知识资产，把日常工作方式整理成可测试的 Skill 包，并将确认后的版本提交 Git、同步 WeKnora 或发布到 SkillHub。

不再把本工作台定义为任务执行工作台，也不在本项目中复制 DeepSeek Harness 的会话运行面。

### 本项目负责

```text
资料/会议纪要
  → 梳理、抽取、讨论、修改、确认
  → Knowledge asset
  → knowledge-assets Git
  → WeKnora Wiki/索引

工作流/日常做法
  → Agent 追问、结构化建模
  → Skill 草稿（SKILL.md、script、references、schema）
  → 测试集、样例和评测
  → 用户确认
  → knowledge-assets Git
  → SkillHub release
```

### DeepSeek Harness 负责

```text
已发布的 Knowledge/Skill/Plugin
  → Harness workspace/session
  → Skill discovery/load
  → Agent 对话和任务执行
  → Tool calls、权限、人工批准、运行状态和会话恢复
  → 运行反馈
```

本项目只接收 Harness 运行反馈的结构化引用，并将其转成知识复核或 Skill 修订候选；不复制完整 session、run、tool-call、receipt、outbox 和任务状态机。

## 必须修改的产品表述

将原来的：

> 工作台负责创建、治理、装载、运行和持续改进。

改为：

> 工作台负责知识与 Skill 的创作、验证、审核、版本化和发布；DeepSeek Harness 负责发布后 Skill 的发现、挂载、会话执行和运行时反馈。

将原来的产品主线：

```text
Task → Workflow → Run → Gate → Artifact → Outcome → Feedback
```

收敛为：

```text
Source/Workflow → Draft → Review/Test → Git/WeKnora/SkillHub Publish
                                          ↓
                             DeepSeek Harness consumes releases
                                          ↓
                             structured feedback returns to workbench
```

## 具体实施修改

### 1. 重写 `项目/团队知识工程/README.md`

- 产品名称和第一句话改为“知识与 Skill 创作发布工作台”；
- 把 Harness 会话作为外部消费方介绍；
- 删除“工作台外提交任务、工作台挂载 Skill、工作台展示运行结果”的主产品描述；
- 保留发布后被 DSH 消费，但明确不属于本工作台；
- 将首个垂直切片改成“会议纪要→知识发布”和“工作流→Skill 测试发布”。

### 2. 重写 `方案/00-方案总览与关键决策.md`

- 产品主语改为创作、验证、审核、发布；
- 把 DSH 定义为下游运行宿主而非本工作台的运行模块；
- SkillHub 作为 Skill release 目标，WeKnora 作为知识索引目标；
- 删除 Task/Run/Outcome 是本工作台核心对象的表述；
- 增加 `published` 与 `loaded/running` 的边界决策。

### 3. 重写 `方案/01-问题、用户与产品范围.md`

保留资料沉淀和工作流固化问题，删除/降级：

- 任务执行工作台；
- 运行时人工 Gate；
- 业务 Task owner / Outcome owner；
- 工作台负责完整任务状态和外部副作用。

补充工作台用户：贡献者、知识 steward、Skill owner、测试/评测负责人、审核人、发布/分发 owner。

### 4. 重写 `方案/02-端到端知识工作流.md`

主文档只保留三段：

1. 会议/资料→知识资产→Git/WeKnora；
2. 日常工作流→Skill 包→测试集/样例评测→Git/SkillHub；
3. 发布后的交接协议：工作台把固定版本交给 DSH，DSH 负责后续加载和执行。

删除本工作台的：

- 任务创建；
- Skill runtime 挂载步骤；
- 任务运行时间线；
- 本工作台完整运行反馈控制面。

### 5. 重写 `方案/09-工作台信息架构与核心对象.md`

工作台一级页面收敛为：

- 我的工作区/待办；
- 资料收件箱；
- 知识草稿与审核；
- Workflow/Skill 草稿；
- 测试集与样例运行；
- Git 提交/MR；
- WeKnora 索引状态；
- SkillHub 发布状态；
- 运行反馈入口（只看摘要/引用，不承载 Harness 会话）。

删除“任务与运行”作为本工作台一级导航。可保留一个“发布后使用说明/下游链接”入口。

核心对象收敛为：Workspace、Workbench Session、Source Material、Knowledge Draft/Asset、Workflow Draft、Skill Draft/Release、Test Case、Evaluation Run、Publication、Feedback Reference。`Task`、完整 `Run`、`Artifact/Outcome` 只作为下游系统引用，不在本工作台建完整模型。

### 6. 重写 `方案/10-Workflow到Skill的生成、测试与发布.md`

保留当前最有价值的部分：

- Agent 追问；
- Workflow Draft；
- Skill 包结构；
- script/references/schema；
- golden/boundary/exception/regression/security test；
- 样例试跑；
- Git/CI/MR；
- SkillHub 发布和版本固定。

删除“工作台外任务执行时挂载 Skill”的详细运行时设计，改为一节交接契约：

```text
approved release
  → version/digest/package metadata
  → SkillHub/分发适配器
  → DSH Skill Provider/discovery/load
  → Harness session consumes it
```

### 7. 修正文档中的边界链接

- 现有 `03-08` 中关于 DSH 运行时、profile、run trace 的内容不全部删除，但改成“下游运行时约束/验证项”；
- 删除本项目工作台自建完整 Workflow Engine、Outbox、Receipt、Reconciliation 的表述；
- 将本地 Harness 的 WebUI、Memory Evolution、Skill 动态加载作为外部能力验证材料，而不是本项目产品需求；
- 保留“工作台接收结构化运行反馈并产生知识复核/Skill 回归候选”。

## 验收标准

- 用户能在本工作台上传会议纪要，完成梳理、讨论、确认和知识发布；
- 用户能在本工作台描述工作流，生成 Skill 文件包和测试集；
- 用户能在本工作台运行样例、查看评测差异并修改 Skill；
- 知识正式版本能进入 Git 并同步 WeKnora；
- Skill 正式版本能进入 Git 并发布 SkillHub；
- 工作台明确显示“已发布，交由 DeepSeek Harness 消费”，而不是伪装成已经运行；
- DSH 运行时的 session、tool call、人工批准和任务恢复不在本工作台重复实现；
- 运行反馈可以通过引用回到本工作台，形成新的知识/Skill 修订候选。

## 不纳入本次修改

- 不修改 DeepSeek Harness 源码；
- 不声称官方 Web UI 与本地 fork 版本完全一致；
- 不将社区桌面端/插件市场的能力当作官方能力；
- 不实现 Git、WeKnora、SkillHub 的真实连接，只修正产品方案边界。
