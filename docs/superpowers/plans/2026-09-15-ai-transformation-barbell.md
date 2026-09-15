# AI Transformation Barbell Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the existing enterprise AI transformation essay into a clear three-document structure: `05` as the overview, `05-01` as the large-enterprise self-built barbell roadmap, and `05-02` as the SME managed-barbell/data-sovereignty roadmap.

**Architecture:** This is a documentation refactor, not a code change. Preserve `05-企业侧转型.md` as the strategic overview, create two focused follow-up essays for implementation paths, and update `docs/insights/README.md` so the navigation reflects the new structure. Avoid deleting source arguments from the project; migrate detailed implementation material from `05` into the new files, leaving summaries and links behind.

**Tech Stack:** Markdown, Git, shell validation with `rg`, `git diff`, and line-count checks.

---

## File Structure

### Files to modify

- Modify: `docs/insights/05-企业侧转型.md`
  - Responsibility: Enterprise-side AI transformation overview.
  - Target role after refactor: explain why the barbell structure is needed, define the principle, summarize what enterprises must externalize, and route readers to `05-01` / `05-02` for concrete paths.

- Modify: `docs/insights/README.md`
  - Responsibility: Insights index.
  - Target change: split row 5 into a mini-group for `05`, `05-01`, and `05-02`.

### Files to create

- Create: `docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md`
  - Responsibility: Large-enterprise roadmap for self-building the barbell structure.
  - Scope: black-hole scenario selection, 90-day launch, 12-month expansion, 3-year target state, scenario differences for supply chain, scheduling, and yield.

- Create: `docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md`
  - Responsibility: SME roadmap for outsourcing parts of the barbell while retaining data sovereignty.
  - Scope: readiness check, managed barbell structure, vendor responsibilities, data sovereignty four-piece set, 90-day trial, 12-month cooperation, 3-year anti-lock-in target, vendor checklist.

### Files not to modify

- Do not modify: `docs/insights/01-*.md`, `02-*.md`, `03-*.md`, `04-*.md`, `06-*.md`, `07-*.md`.
- Do not modify: `docs/companies/*`.
- Do not modify: `docs/superpowers/specs/2026-09-15-ai-transformation-barbell-design.md` unless a discrepancy is discovered during implementation review.

---

## Content Boundaries

### `05` should retain these strategic sections

1. 企业的几种典型姿势：干等、乱采购、自建试点、全员手搓。
2. 组织正解：杠铃结构，包括底部放开、顶部薄平台、中间不要。
3. 杠铃结构外部框架：barbell strategy、双元组织、Bimodal IT、AI Hub。
4. 沉淀什么：反馈数据、决策理由、经营账。
5. 人和考核：in-the-loop / on-the-loop / out-of-the-loop，审核 AI 是新技能。
6. IT 与业务 P&L：AI 不能只是 IT 项目，业务一号位必须背经营结果。
7. 曾鸣框架：AI 自主运营比例、硅基员工占比、黑洞效应、智能复利。
8. New routing section: 大企业自建杠铃，中小企业托管杠铃。

### `05` should compress or migrate these implementation sections

Move detail-level content into `05-01` or `05-02`, leaving a short summary in `05`:

- Thin top platform team responsibilities.
- Assessment redesign for AI reviewers.
- RACI and staged timeline.
- Agent incorporation process.
- SME managed barbell model.
- Data sovereignty four-piece set.
- Public infrastructure / vendor-managed operation discussion.

### `05-01` must include these exact major sections

```markdown
# 05-01 · 大企业 AI 转型的杠铃结构落地路径

> 讨论稿 / 会更新 · 最近更新 2026-09-15
>
> **一句话结论**：大企业 AI 转型不要从“建平台 / 改组织 / 买工具”开始，而要从一个高价值黑洞场景开始，用真实经营结果反推组织、平台、考核和 P&L。

---

## 0. 这篇回答什么
## 1. 起点不是组织架构，而是黑洞场景
## 2. 三类优先黑洞场景
## 3. 90 天启动：先跑通一个最小闭环
## 4. 12 个月扩展：从试点到杠铃结构
## 5. 3 年目标态：AI-native 组织常态
## 6. 三类场景的落地路线差异
## 7. 行动清单
```

### `05-02` must include these exact major sections

```markdown
# 05-02 · 中小企业 AI 转型：托管杠铃与数据主权

> 讨论稿 / 会更新 · 最近更新 2026-09-15
>
> **一句话结论**：中小企业不要照抄大企业的 AI 杠铃结构。更现实的路径是借外部垂直 AI-native 运营商托管试错和治理，但把反馈数据、schema 和退出权留在自己手里。

---

## 0. 这篇回答什么
## 1. 先判断：你是不是撑不起自建杠铃
## 2. 中小企业的替代结构：托管杠铃
## 3. 外部运营商该承担什么
## 4. 数据主权四件套
## 5. 90 天试用路线
## 6. 12 个月合作路线
## 7. 3 年目标态：形成轻量反脆弱能力
## 8. 供应商筛选清单
## 9. 最容易踩的坑
## 10. 一句话结论
```

---

## Implementation Tasks

### Task 1: Snapshot Existing `05` Structure

**Files:**
- Read-only: `docs/insights/05-企业侧转型.md`
- Read-only: `docs/superpowers/specs/2026-09-15-ai-transformation-barbell-design.md`

- [ ] **Step 1: Inspect current headings**

Run:

```bash
rg -n "^## |^### " docs/insights/05-企业侧转型.md
```

Expected output includes these existing headings:

```text
## 1. 企业的几种典型姿势（各有优缺）
## 2. 组织正解：杠铃结构（barbell）
## 3. 最该关注的问题：沉淀什么？
## 4. 被低估的坑：AI 原生化不是技术问题，是人和考核
## 5. IT 与业务的协作：不共享 P&L 就必然失败
## 6. 参照曾鸣：智能体经济、两个指标与黑洞效应
## 7. 展开①：薄顶部平台团队——管什么、不管什么，边界怎么划
## 8. 展开②：考核怎么改，才能真正奖励"审核 AI"
## 9. 展开③：转型时间线与责任矩阵（可落地模板）
## 10. 展开④：中小企业没能力搞杠铃两头，怎么办？
## 存疑 / 待进一步验证
## 参考来源
```

- [ ] **Step 2: Confirm no unrelated files are dirty before edits**

Run:

```bash
git status --short
```

Expected before implementation starts:

```text
```

If output is not empty, inspect it. Proceed only if dirty files are expected documentation work from this plan.

- [ ] **Step 3: Commit checkpoint if the plan file is uncommitted**

Run:

```bash
git status --short docs/superpowers/plans/2026-09-15-ai-transformation-barbell.md
```

If the plan file appears as untracked or modified, commit it before changing insights docs:

```bash
git add docs/superpowers/plans/2026-09-15-ai-transformation-barbell.md
git commit -m "docs: plan enterprise AI barbell split"
```

Expected commit subject:

```text
docs: plan enterprise AI barbell split
```

---

### Task 2: Create `05-01` Large-Enterprise Roadmap

**Files:**
- Create: `docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md`

- [ ] **Step 1: Create the file with the full planned structure**

Write `docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md` with this content:

````markdown
# 05-01 · 大企业 AI 转型的杠铃结构落地路径

> 讨论稿 / 会更新 · 最近更新 2026-09-15
>
> **一句话结论**：大企业 AI 转型不要从“建平台 / 改组织 / 买工具”开始，而要从一个高价值黑洞场景开始，用真实经营结果反推组织、平台、考核和 P&L。

---

## 0. 这篇回答什么

`05-企业侧转型.md` 已经解释了为什么企业 AI 转型需要“杠铃结构”：底部放开、顶部薄平台、中间不要。但如果只停留在结构边界，企业还是不知道第一步怎么走。

这篇只回答一个问题：

> 大型制造 / 能源 / 汽车 / 高端装备企业，如何从今天的 AI 混乱状态，一步步落地杠铃结构？

默认企业画像：

- 已有 IT / 数据 / 数字化团队；
- 已有 ERP / MES / QMS / PLM / 数据平台等基础系统；
- 已有局部 AI 试点、工具采购或一线野生 agent；
- 但还没有组织级反馈闭环、收编机制、经营归因和 P&L 对齐。

核心主线不是“先建 AI 中台”，而是：

```text
先选黑洞场景
  ↓
90 天跑通第一个闭环
  ↓
12 个月完成收编、治理、考核、P&L 对齐
  ↓
3 年形成 AI-native 组织常态
```

---

## 1. 起点不是组织架构，而是黑洞场景

大企业最常见的错误，是一上来就讨论组织架构：要不要成立 AI 委员会、要不要建 AI 中台、要不要全员发工具、要不要统一采购模型。

这些都不是第一步。第一步应该是选一个能吸住数据、任务、人才和管理注意力的**黑洞场景**。

黑洞场景的选择公式：

```text
黑洞场景 = 经营价值 × 数据闭环 × 组织可推动性
```

| 维度 | 判断问题 | 低分信号 | 高分信号 |
|---|---|---|---|
| 经营价值 | 能不能挂到库存、延期、产能、良率、报废、返工、客诉、现金流？ | 只是办公提效、报告生成、知识问答 | 能直接影响经营指标，业务一号位愿意关注 |
| 数据闭环 | 有没有输入、决策、执行、结果、反馈？反馈周期多快？ | 只有历史文档，没有结果回填 | 每次决策后都有执行和结果，可持续记录 |
| 组织可推动性 | 有没有明确业务 owner？是否能改流程？跨部门阻力有多大？ | 只有 IT 或数字化部门热 | 业务负责人愿意背指标，现场愿意配合改流程 |

不要选“听起来最 AI”的场景，要选能形成组织引力的场景。一个合格黑洞场景，会让数据、流程、专家经验、管理注意力和预算不断向它聚集。

---

## 2. 三类优先黑洞场景

### 2.1 供应链管理

典型问题：

- 供应商风险预警；
- 物料短缺；
- 交付延期；
- 库存积压；
- 质量风险前移；
- 采购、计划、物流、质量脱节。

为什么重要：

- 经营价值极高，能直接连到库存、交付、现金流、停线风险；
- 高层容易听懂，不需要把价值解释成抽象 AI 指标；
- 一旦跑通，会天然牵引采购、计划、质量、生产、财务协同。

最大难点：

- 跨部门严重；
- 数据分散在采购、计划、物流、质量、供应商体系；
- 责任归属复杂；
- 很多问题发生在企业边界之外，供应商不一定配合。

建议定位：

```text
供应链管理适合作为 12 个月扩展场景，不一定适合作为第一个 90 天场景。
```

如果第一步就从全局供应链优化切入，很容易陷入跨部门泥潭。更稳的方式是先从供应商质量风险、关键物料缺料、某一类交付延期等局部切口开始。

### 2.2 排产 / 计划优化

典型问题：

- 订单优先级；
- 产能约束；
- 设备瓶颈；
- 换型成本；
- 计划频繁变更；
- 人工排产经验不可复制。

为什么重要：

- 反馈周期短；
- 结果可衡量；
- 与产能、交付、库存直接相关；
- 很适合智能体辅助决策。

最大难点：

- 约束复杂；
- 现场真实约束常常不在系统里；
- 人工经验强，老计划员未必愿意把判断逻辑外化；
- 如果只做算法最优，可能与现场执行相冲突。

建议定位：

```text
排产适合作为第一批黑洞场景，但要控制范围：先从一个产线 / 一个车间 / 一个产品族开始。
```

不要一上来做全厂 APS 重构。先把某个局部场景中的约束、决策、人工修正和实际结果沉淀下来。

### 2.3 生产良率 / 质量闭环

典型问题：

- 良率波动；
- 工艺参数异常；
- 设备状态影响质量；
- 报废 / 返工；
- 客诉；
- 根因分析靠专家经验。

为什么重要：

- 数据闭环相对清晰；
- 与质量损失、报废、返工、客诉直接相关；
- 很适合沉淀“结果 + 推理过程 + 实际结果”；
- 容易把 AI 价值讲成经营语言。

最大难点：

- 需要打通工艺、设备、质量、检验、供应商数据；
- 根因归因难；
- 现场可能不愿意把经验外化；
- 如果考核仍按人工处理量，专家没有动力教会 AI。

建议定位：

```text
生产良率 / 质量闭环最适合作为 90 天启动场景之一。
```

它通常比供应链更局部，比全局排产更容易形成反馈闭环，也更容易用 EVI 证明价值。

---

## 3. 90 天启动：先跑通一个最小闭环

90 天的目标不是“上线一个 AI”，而是回答：

```text
这个场景有没有资格成为组织级黑洞？
```

### 第 0–2 周：选场景

动作：

1. 用“经营价值 × 数据闭环 × 组织可推动性”打分；
2. 只选一个场景；
3. 明确业务 owner；
4. 明确一个经营指标；
5. 明确数据范围；
6. 明确 90 天不追求大而全，只追求闭环。

输出物：

```text
黑洞场景立项单
```

立项单至少写清：

| 字段 | 内容 |
|---|---|
| 场景 | 例如某产线良率波动、某产品族排产、某类关键物料风险 |
| 业务 owner | 对经营指标负责的人，不是 IT 项目经理 |
| 经营指标 | 良率、报废、返工、延期、库存、停线、现金流等 |
| 数据范围 | 输入数据、人工决策记录、执行结果、业务结果 |
| 90 天目标 | 跑通反馈闭环，而不是追求全自动 |

### 第 3–6 周：建最小反馈闭环

动作：

1. 梳理输入数据；
2. 梳理当前人工决策过程；
3. 记录 AI / 人的建议；
4. 记录执行结果；
5. 记录实际业务结果；
6. 记录人工修正理由。

关键规则：

```text
每次 AI 介入，都必须留下：
输入 → 判断/推理 → 建议动作 → 人工修正 → 执行结果 → 业务结果
```

这条链路比模型本身更重要。没有它，系统不会学习，组织不会沉淀，项目结束就归零。

### 第 7–10 周：引入 Agent / 工作流

不要一上来做全自动。顺序应该是：

```text
先做人机协同
再做局部自动
最后再提高 AI 自主运营比例
```

每个 agent 都要标清：

- 决策权限：建议、需授权执行、可自动执行；
- 人类监督档位：in-the-loop、on-the-loop、out-of-the-loop；
- 失败兜底机制：谁接管、多久接管、如何回滚；
- 数据记录方式：是否记录输入、推理、动作、修正、结果；
- 业务指标：它到底影响哪个经营数字。

### 第 11–12 周：做 EVI 复盘

90 天结束时不要只问“AI 好不好用”，要问：

1. 经营指标有没有变化；
2. 哪些收益可归因；
3. 哪些只是相关不是因果；
4. 哪些流程必须改变；
5. 哪些 agent / 工具值得收编；
6. 哪些不值得继续；
7. 业务 owner 是否愿意继续背指标；
8. 数据闭环是否能持续自动记录。

如果这 8 个问题答不上来，就不是黑洞场景，只是一个 AI 试点。

---

## 4. 12 个月扩展：从试点到杠铃结构

12 个月目标是从“一个试点”进入“组织结构变化”。这里才真正开始落地杠铃。

### 4.1 收编机制

把野生 agent 分四类：

| 类型 | 例子 | 处理方式 |
|---|---|---|
| 个人效率工具 | 写邮件、总结会议、生成周报 | 允许存在，只做轻治理 |
| 小团队工作流 | 班组质量复盘、计划员辅助排程 | 登记、监控、共享模板 |
| 影响业务决策的 agent | 供应商风险建议、排产建议、质量异常判断 | 必须进入收编流程 |
| 影响经营结果 / 风险 / 合规的 agent | 自动拦截批次、自动调整计划、自动触发采购动作 | 必须产品化、审计、设兜底 |

收编流程：

```text
发现 → 登记 → 评分 → 加固 → 产品化 → 复用 → 下放
```

评分维度：

| 维度 | 高分信号 |
|---|---|
| 经营价值 | 已经影响经营指标 |
| 复用潜力 | 不只一个人或一个班组能用 |
| 数据闭环 | 输入、推理、动作、结果、修正都能记录 |
| 风险等级 | 权限边界清楚，有兜底机制 |
| 业务 owner | 有人愿意背结果 |

### 4.2 薄顶部平台团队成型

顶部团队不是产能中心，而是管“规则和复利”。

该管：

- 数据标准；
- agent 登记；
- 权限；
- 审计；
- 评估；
- 复用组件；
- 可观测；
- 收编流程；
- EVI 方法论。

不该管：

- 替业务想需求；
- 替业务承包所有交付；
- 以工单量证明自己价值；
- 把所有野生创新都卡成审批流程。

一句话：

```text
顶部集中的是规则，不是产能。
```

### 4.3 业务一号位开始背 P&L

从第一个黑洞场景扩展到多个场景时，必须明确：

```text
AI 转型不是 IT 项目，是业务经营项目。
```

责任转移：

| 阶段 | 谁主责 | 背什么 |
|---|---|---|
| 试点期 | 业务 owner + 顶部平台共担 | 单场景闭环和指标变化 |
| 扩展期 | 业务一号位 | 经营结果和流程改变 |
| 常态期 | 业务部门 | AI 作为自己的生产方式 |

CDO / CIO / 顶部平台负责人不应该替业务背 P&L。他们背的是治理、标准、数据资产、安全和收编机制。

### 4.4 考核从“人干了多少”改成“人机系统贡献多少”

旧考核奖励“人自己多干活”，新考核要奖励“人把 AI 管好、训好、用好”。

| 旧考核 | 新考核 | 目的 |
|---|---|---|
| 个人处理量 / 工单数 | 人机联合产出 | 让人愿意把活交给 AI |
| 人工准确率 | 审核质量、漏审率、拦截率 | 奖励会监督 AI 的人 |
| 故障后补救 | 兜底成功率、接管时效 | 奖励 on-the-loop 能力 |
| 项目上线数 | agent 复用贡献、收编贡献 | 奖励沉淀和复用 |
| 部门局部 KPI | 可归因经营增量 | 避免虚荣指标 |

任何单一指标都会被博弈，所以必须成组使用。拦截率要和漏审率一起看，接管次数要和故障率一起看，agent 数量要和经营增量一起看。

---

## 5. 3 年目标态：AI-native 组织常态

3 年后不应只是“上线了很多 AI 应用”，而是形成一种新常态：

```text
业务部门自己会发现高价值场景
一线能长出野生 agent
顶部能快速收编
数据能持续反馈
考核奖励人机协同
P&L 能证明 AI 价值
```

可观察指标：

| 指标 | 含义 | 警惕 |
|---|---|---|
| AI 自主运营比例 | 多少业务动作由 AI 独立或半独立完成 | 不能脱离风险等级盲目追高 |
| 硅基员工占比 | AI agent 在组织中的有效劳动占比 | 不能变成“上了多少机器人”的虚荣 KPI |
| 黑洞场景数量 | 已经形成反馈飞轮的核心场景数量 | 宁可少而深，不要多而散 |
| Agent 收编率 | 野生 agent 中有多少进入受支持产品 | 收编不是审批一切 |
| 反馈数据质量 | 是否沉淀输入、推理、动作、结果、修正 | 没有实际结果回填就不算闭环 |
| 可归因经营增量 | AI 对库存、良率、交付、成本等指标的贡献 | 必须能区分因果和相关 |

目标不是让 AI 替代所有人，而是让组织从“人直接干活”逐步变成“人设计、监督、兜底、优化人机系统”。

---

## 6. 三类场景的落地路线差异

| 场景 | 适合作为 90 天启动？ | 适合作为 12 个月扩展？ | 最大难点 | 建议路径 |
|---|---|---|---|---|
| 生产良率 | 高 | 高 | 根因归因、现场经验外化 | 先做单产线 / 单产品族质量闭环，再扩展到供应商和工艺 |
| 排产 | 中高 | 高 | 约束复杂、计划频繁变化 | 先做人机协同排产建议，再逐步自动化局部约束 |
| 供应链 | 中 | 极高 | 跨部门、跨公司、责任边界复杂 | 先从关键物料 / 供应商风险切入，再扩展到全链路协同 |

大企业最稳路径通常不是先做最大场景，而是：

```text
先用良率 / 局部排产跑通闭环
再扩展到供应链这种经营价值更大但组织阻力更高的场景。
```

---

## 7. 行动清单

### 7.1 CEO / 业务一号位

- [ ] 选一个黑洞场景，而不是同时铺开十个 AI 试点。
- [ ] 指定业务 owner，而不是只让 IT 负责。
- [ ] 明确一个经营指标。
- [ ] 接受 90 天先跑闭环，不追求全自动。
- [ ] 允许流程和考核被试点反推修改。

### 7.2 CDO / CIO / 顶部平台负责人

- [ ] 建最小治理护栏，而不是大而全 AI 中台。
- [ ] 建 agent 登记和收编机制。
- [ ] 规定反馈数据链路：输入、推理、动作、修正、结果。
- [ ] 建 EVI 复盘模板。
- [ ] 不以工单量证明团队价值。

### 7.3 一线业务团队

- [ ] 把人工决策过程记录下来。
- [ ] 记录为什么采纳或修正 AI 建议。
- [ ] 反馈实际业务结果。
- [ ] 把有复用价值的野生 agent 上报收编。
- [ ] 从“自己干活”转向“监督 AI 干活”。

---

## 一句话收口

```text
大企业自建杠铃，不是先画组织图，而是先让一个黑洞场景转起来。
```

黑洞转起来之后，组织、平台、考核、P&L 才有真实抓手；否则所有 AI 转型都会退化成工具采购、PPT 中台或一线散兵。
````

- [ ] **Step 2: Verify required headings exist**

Run:

```bash
rg -n "^## " docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md
```

Expected output includes exactly these major headings:

```text
## 0. 这篇回答什么
## 1. 起点不是组织架构，而是黑洞场景
## 2. 三类优先黑洞场景
## 3. 90 天启动：先跑通一个最小闭环
## 4. 12 个月扩展：从试点到杠铃结构
## 5. 3 年目标态：AI-native 组织常态
## 6. 三类场景的落地路线差异
## 7. 行动清单
```

- [ ] **Step 3: Validate key terms are present**

Run:

```bash
rg -n "黑洞场景 = 经营价值 × 数据闭环 × 组织可推动性|供应链管理|排产|生产良率|90 天|12 个月|3 年|收编机制|人机联合产出" docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md
```

Expected: at least one match for each listed term.

- [ ] **Step 4: Commit `05-01`**

Run:

```bash
git add docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md
git commit -m "docs: 增加大企业AI杠铃落地路线"
```

Expected commit subject:

```text
docs: 增加大企业AI杠铃落地路线
```

---

### Task 3: Create `05-02` SME Managed-Barbell Roadmap

**Files:**
- Create: `docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md`

- [ ] **Step 1: Create the file with the full planned structure**

Write `docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md` with this content:

````markdown
# 05-02 · 中小企业 AI 转型：托管杠铃与数据主权

> 讨论稿 / 会更新 · 最近更新 2026-09-15
>
> **一句话结论**：中小企业不要照抄大企业的 AI 杠铃结构。更现实的路径是借外部垂直 AI-native 运营商托管试错和治理，但把反馈数据、schema 和退出权留在自己手里。

---

## 0. 这篇回答什么

`05-企业侧转型.md` 讲的是企业 AI 转型的总论，`05-01` 讲的是大企业如何自建杠铃。但大量中小制造企业根本撑不起这套结构。

它们常见状态是：

- 有真实制造、供应链、质量、排产问题；
- 有 ERP / MES / QMS 的一部分，但系统不完整；
- IT 团队很小，更多是运维 / 系统实施；
- 没有专门 AI 团队；
- 老板知道要转型，但不知道从哪里开始；
- 很容易被外部供应商卖工具、卖大屏、卖 demo。

这篇只回答一个问题：

> 中小企业撑不起完整杠铃时，如何借助外部垂直 AI-native 运营商，同时不丢掉数据主权？

一句话：

```text
AI 能力可以外包，经营数据和反馈轨迹不能外包。
```

---

## 1. 先判断：你是不是撑不起自建杠铃

先别急着学大企业成立 AI 平台团队。先问 6 个问题：

| 问题 | 如果答案是“否” |
|---|---|
| 是否有 5–10 人以上的数据 / AI / 数字化骨干？ | 顶部平台撑不起来 |
| 是否有多个业务部门愿意试点？ | 底部试错密度不够 |
| 是否有稳定数据平台或至少统一数据库？ | 反馈闭环难以沉淀 |
| 是否有业务 owner 能背经营指标？ | AI 会变成老板工程 |
| 是否能持续投入 12 个月以上？ | 做不出组织复利 |
| 是否有人能管理外部 AI 供应商？ | 容易被供应商锁死 |

如果大部分答案是否定，就不要自建完整杠铃。

```text
不是所有企业都需要拥有 AI 平台。
但所有企业都需要拥有自己的经营数据和反馈轨迹。
```

---

## 2. 中小企业的替代结构：托管杠铃

大企业杠铃是：

```text
顶部薄平台 + 底部业务试错
```

中小企业托管版是：

```text
外部垂直 AI-native 运营商
  承担部分顶部平台能力 + 部分底部试错能力

企业自己
  保留业务 owner + 数据主权 + 经营判断
```

换句话说：

```text
运营商负责“跑”
企业负责“判”
数据必须留在企业可控位置
```

中小企业不需要假装自己是大厂。它真正要避免的是：工具是供应商的、数据是供应商的、模型是供应商的、经验也沉淀到供应商那里，最后自己只剩一张账单。

---

## 3. 外部运营商该承担什么

运营商可以承担：

- AI 工具和 agent 搭建；
- 供应链 / 排产 / 良率场景模板；
- 数据接入方案；
- 工作流编排；
- 模型调用；
- 可观测；
- 基础权限和审计；
- 试点运营；
- 一线培训；
- 复盘报告。

但运营商不该独占：

- 原始业务数据；
- 反馈轨迹；
- 推理过程；
- 人工修正理由；
- 业务结果数据；
- schema 定义；
- 指标口径；
- 退出后的数据使用权。

判断一个供应商是否危险，核心看它是否想把“跑服务”和“占数据”绑在一起。服务可以付费，数据不能拱手送出。

---

## 4. 数据主权四件套

### 4.1 数据落在你的库

要求：

```text
输入、推理、建议、人工修正、执行结果、业务结果
必须写入企业自己控制的数据库 / 数据湖 / 对象存储。
```

运营商可以读、可以算、可以服务，但不能成为唯一数据持有人。

如果数据只在供应商系统里，换供应商就等于从零开始。

### 4.2 schema 不用供应商私有格式

要求：

```text
主干字段标准化
领域扩展字段可导出
业务编码、工序、设备、供应商、缺陷码属于企业资产
```

不要让供应商把数据存成只有它自己系统能读懂的格式。数据在你手里但读不懂、迁不走，等于没有主权。

### 4.3 决策理由必须一起沉淀

不只记录：

```text
AI 建议采购 A
AI 建议调高产量
AI 判定此批次有质量风险
```

还要记录：

```text
为什么这么建议？
依据了哪些数据？
人是否采纳？
人为什么修正？
实际结果如何？
```

否则只是结果日志，不是能复利的数据资产。

### 4.4 退出权写进合同

合同必须写清：

- 全量数据导出；
- 导出格式；
- 导出周期；
- 解约后供应商删除副本；
- 企业保留历史反馈轨迹；
- 模型 / agent 配置能否导出；
- 指标口径和 schema 文档归属；
- 供应商用企业数据训练通用模型必须单独授权。

退出权不是解约时才有用，而是合作期间的议价权。没有退出权，供应商就知道你走不了。

---

## 5. 90 天试用路线

### 第 0–2 周：选一个小但真痛的场景

中小企业不要一上来做全公司 AI。

优先选：

- 一个供应商质量风险；
- 一个排产瓶颈；
- 一个良率波动问题；
- 一个库存 / 缺料问题。

要求：

```text
问题够痛
数据够近
owner 够明确
周期够短
```

### 第 3–6 周：接入最小数据

不要追求完整数据平台，先打通：

```text
一个业务对象
一条流程
一个反馈结果
```

例子一：

```text
供应商 → 批次 → 检验结果 → 异常判断 → 人工处置 → 后续质量结果
```

例子二：

```text
订单 → 工序 → 产能约束 → 排产建议 → 人工调整 → 实际交付结果
```

### 第 7–10 周：运营商跑服务，企业盯数据沉淀

运营商可以负责工具和试点，但企业必须每天盯：

- 数据有没有写回自己的库；
- 人工修正理由有没有记录；
- 实际结果有没有回填；
- 指标口径有没有统一；
- 是否能导出。

这里企业最容易偷懒：觉得供应商在跑就行。错。中小企业真正该学会的不是写模型，而是看住数据闭环。

### 第 11–12 周：试点评估

不是评估“AI 好不好用”，而是评估：

1. 是否有可归因经营改善；
2. 是否沉淀了可复用反馈数据；
3. 是否减少了人的重复劳动；
4. 是否暴露了流程 / 数据问题；
5. 是否存在供应商锁定风险；
6. 是否值得进入 12 个月合作。

如果只有 demo 效果，没有数据沉淀，不进入长期合作。

---

## 6. 12 个月合作路线

如果 90 天通过，进入 12 个月。

重点不是买更多工具，而是：

- 固化一个场景；
- 扩展两个相邻场景；
- 建轻量内部 owner；
- 建最小数据台账；
- 建供应商月度复盘；
- 建退出演练；
- 建指标口径；
- 建人工修正机制。

12 个月后，企业至少要拥有：

```text
一个懂业务 + 懂数据的内部 owner
一套自己的反馈数据
一套可导出的 schema
一套供应商管理机制
一套可归因经营指标
```

如果 12 个月后这些都还在供应商脑子里和供应商系统里，这不是转型，是外包依赖加深。

---

## 7. 3 年目标态：形成轻量反脆弱能力

中小企业 3 年后不一定要自研 AI 平台，但应该做到：

```text
换供应商不归零
换模型不归零
换系统不归零
核心反馈数据仍在自己手里
业务 owner 能判断 AI 有没有用
```

目标不是“拥有 AI 技术”，而是：

```text
拥有选择、评估、替换 AI 服务的能力
```

这就是中小企业的反脆弱能力。它不一定比供应商更懂模型，但必须比供应商更懂自己的业务结果和数据资产。

---

## 8. 供应商筛选清单

必须问：

1. 数据存在哪里？
2. 是否支持数据双写？
3. schema 是否开放？
4. 是否记录推理过程？
5. 人工修正理由能否记录？
6. 实际业务结果是否回填？
7. 是否支持全量导出？
8. 解约后数据怎么处理？
9. 是否会用我的数据训练你的通用模型？
10. 是否能按经营指标而不是功能上线验收？
11. 是否接受 90 天试点后再签长期合同？
12. 是否有同类制造业场景经验？

如果供应商对数据归属、导出、schema、退出权含糊其辞，优先级直接下调。

---

## 9. 最容易踩的坑

| 坑 | 后果 |
|---|---|
| 只买工具，不改流程 | AI 变成新大屏 |
| 数据全在供应商系统里 | 未来被锁死 |
| 只看 demo，不看反馈闭环 | 项目结束即归零 |
| 没有内部 owner | 供应商说什么就是什么 |
| 不记录人工修正理由 | 专家经验仍然没外化 |
| 不做退出演练 | 以为有数据，实际迁不走 |
| 用功能上线验收 | 没有经营价值，只有项目交付 |

---

## 10. 一句话结论

```text
大企业自建杠铃，守住黑洞；
中小企业托管杠铃，守住数据主权。
```

中小企业不需要假装自己是大厂，但必须守住一件事：

```text
AI 能力可以外包，经营数据和反馈轨迹不能外包。
```

守不住数据主权的托管，是把未来的定价权拱手让人。
````

- [ ] **Step 2: Verify required headings exist**

Run:

```bash
rg -n "^## " docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
```

Expected output includes exactly these major headings:

```text
## 0. 这篇回答什么
## 1. 先判断：你是不是撑不起自建杠铃
## 2. 中小企业的替代结构：托管杠铃
## 3. 外部运营商该承担什么
## 4. 数据主权四件套
## 5. 90 天试用路线
## 6. 12 个月合作路线
## 7. 3 年目标态：形成轻量反脆弱能力
## 8. 供应商筛选清单
## 9. 最容易踩的坑
## 10. 一句话结论
```

- [ ] **Step 3: Validate key terms are present**

Run:

```bash
rg -n "托管杠铃|数据主权|schema|退出权|运营商负责|企业负责|90 天|12 个月|换供应商不归零|供应商筛选清单" docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
```

Expected: at least one match for each listed term.

- [ ] **Step 4: Commit `05-02`**

Run:

```bash
git add docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
git commit -m "docs: 增加中小企业AI托管杠铃路线"
```

Expected commit subject:

```text
docs: 增加中小企业AI托管杠铃路线
```

---

### Task 4: Refactor `05-企业侧转型.md` Into Overview and Router

**Files:**
- Modify: `docs/insights/05-企业侧转型.md`

- [ ] **Step 1: Update the opening conclusion**

In `docs/insights/05-企业侧转型.md`, replace the opening block at lines 2-12 with:

```markdown
> 讨论稿 / 会更新 · 最近更新 2026-09-15
>
> **一句话结论**：这波折腾对企业不可避免。干等、乱采购、自建试点、全员手搓——四种姿势各有各的坑，纯任何一端都会死。真正该关注的不是“上了哪些 AI”，而是**沉淀了什么**：反馈数据、决策理由、隐性经验和经营账。组织上的总原则是**杠铃结构**：底部放开、顶部薄平台、中间不要；但落地路径要按企业体量分开看——大企业自建杠铃，见 `05-01`；中小企业托管杠铃，见 `05-02`。
>
> 外部数据给这套判断兜了底：MIT 2025 年调研显示约 **95% 的企业级 GenAI 项目拿不到可衡量的 P&L 回报**，根因是“学习断层”（系统留不住反馈、不进化）而非模型能力——这恰好是本篇要解的组织题。
```

- [ ] **Step 2: Add route note under section 2**

After the paragraph ending with this sentence:

```markdown
杠铃的关键动作是**"收编"**：让自下而上的野生创新，通过顶部的产品化沉淀下来复利。
```

Insert:

```markdown
> 本节只讲结构原则，不讲完整路线图。真正落地时要先分企业类型：
> - 大企业：见 `05-01-大企业AI转型的杠铃结构落地路径.md`，从黑洞场景启动，自建杠铃；
> - 中小企业：见 `05-02-中小企业AI转型：托管杠铃与数据主权.md`，托管杠铃两头，但守住数据主权。
```

- [ ] **Step 3: Replace detailed sections 7-10 with a concise route index**

In `docs/insights/05-企业侧转型.md`, replace everything from the heading:

```markdown
## 7. 展开①：薄顶部平台团队——管什么、不管什么，边界怎么划
```

through the end of section 10, immediately before:

```markdown
## 存疑 / 待进一步验证
```

with:

```markdown
## 7. 落地路径索引：大企业自建杠铃，中小企业托管杠铃

本篇只讲原则。真正落地时要先分企业类型。

| 企业类型 | 正解 | 详见 |
|---|---|---|
| 大型制造 / 能源 / 汽车 / 高端装备企业 | 从黑洞场景启动，自建杠铃结构 | `05-01-大企业AI转型的杠铃结构落地路径.md` |
| 中小制造企业 / 供应商型企业 | 托管杠铃两头，但守住数据主权 | `05-02-中小企业AI转型：托管杠铃与数据主权.md` |

一句话：

```text
大企业自建杠铃，守住黑洞；
中小企业托管杠铃，守住数据主权。
```

### 7.1 大企业：从黑洞场景启动

大企业的问题通常不是“没有 AI 资源”，而是资源散、试点散、业务不背 P&L、平台团队容易膨胀成新中台。

因此大企业不要从“建平台 / 改组织 / 买工具”开始，而要先选一个黑洞场景：

```text
黑洞场景 = 经营价值 × 数据闭环 × 组织可推动性
```

供应链管理、排产、生产良率都可以成为黑洞场景，但启动顺序不同：良率和局部排产更适合 90 天跑通闭环；供应链经营价值更大，但跨部门阻力更高，更适合 12 个月扩展。

具体路线见 `05-01-大企业AI转型的杠铃结构落地路径.md`。

### 7.2 中小企业：托管运营，但不托管数据主权

中小企业通常养不起顶部平台团队，也没有足够的一线公民开发者密度。硬学大企业自建杠铃，会变成“老板工程 + 供应商 demo + 数据散落”。

更现实的路径是：

```text
外部垂直 AI-native 运营商托管试错和治理；
企业自己守住业务 owner、数据主权、反馈轨迹、schema 和退出权。
```

AI 能力可以外包，经营数据和反馈轨迹不能外包。具体路线见 `05-02-中小企业AI转型：托管杠铃与数据主权.md`。
```

- [ ] **Step 4: Update uncertain-items section if it references removed sections**

Run:

```bash
rg -n "第 7 节|第 8 节|第 9 节|第 10 节|10\.1|10\.2|展开①|展开②|展开③|展开④" docs/insights/05-企业侧转型.md
```

If references point to removed detailed sections, replace them with the new document references:

```markdown
- `05-01` 中关于薄顶部平台、考核、RACI 与阶段路线的写法，仍可继续用更多企业案例验证。
- `05-02` 中关于数据主权、标准合同和外部运营商托管边界的写法，仍需结合具体供应商合同与行业协会模板验证。
```

- [ ] **Step 5: Verify overview no longer contains old detailed headings**

Run:

```bash
rg -n "^## 7\. 展开|^## 8\. 展开|^## 9\. 展开|^## 10\. 展开" docs/insights/05-企业侧转型.md || true
```

Expected output:

```text
```

- [ ] **Step 6: Verify new route index exists**

Run:

```bash
rg -n "落地路径索引|05-01-大企业AI转型的杠铃结构落地路径|05-02-中小企业AI转型：托管杠铃与数据主权" docs/insights/05-企业侧转型.md
```

Expected: matches for all three terms.

- [ ] **Step 7: Commit overview refactor**

Run:

```bash
git add docs/insights/05-企业侧转型.md
git commit -m "docs: 精简企业AI转型总论入口"
```

Expected commit subject:

```text
docs: 精简企业AI转型总论入口
```

---

### Task 5: Update Insights README Navigation

**Files:**
- Modify: `docs/insights/README.md`

- [ ] **Step 1: Replace the existing row for item 5**

In `docs/insights/README.md`, replace the row:

```markdown
| 5 | `05-企业侧转型.md` | 杠铃组织、该沉淀什么、审核≠干活、IT-业务共享 P&L |
```

with these three rows:

```markdown
| 5 | `05-企业侧转型.md` | 企业 AI 转型总论：杠铃结构、隐性经验外化、考核与 P&L |
| 5-1 | `05-01-大企业AI转型的杠铃结构落地路径.md` | 大企业从黑洞场景启动，90 天 / 12 个月 / 3 年落地杠铃结构 |
| 5-2 | `05-02-中小企业AI转型：托管杠铃与数据主权.md` | 中小企业借外部运营商托管 AI 能力，但守住反馈数据和退出权 |
```

- [ ] **Step 2: Update the cross-page skeleton if needed**

If `docs/insights/README.md` contains the mainline judgment item:

```markdown
6. 企业侧：杠铃组织 + 逼企业外化隐性经验/算实经营账；"审核 AI"是新技能但考核还在按"干活"发奖。
```

Replace it with:

```markdown
6. 企业侧：总原则是杠铃结构；大企业从黑洞场景自建杠铃，中小企业托管杠铃但守住数据主权；共同目标都是外化隐性经验、算实经营账、让“审核 AI”进入考核。
```

- [ ] **Step 3: Verify README links reference all three docs**

Run:

```bash
rg -n "05-企业侧转型|05-01-大企业AI转型|05-02-中小企业AI转型" docs/insights/README.md
```

Expected: matches for all three docs.

- [ ] **Step 4: Commit README update**

Run:

```bash
git add docs/insights/README.md
git commit -m "docs: 更新企业AI转型洞察目录"
```

Expected commit subject:

```text
docs: 更新企业AI转型洞察目录
```

---

### Task 6: Final Documentation QA

**Files:**
- Verify: `docs/insights/05-企业侧转型.md`
- Verify: `docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md`
- Verify: `docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md`
- Verify: `docs/insights/README.md`

- [ ] **Step 1: Check all target files exist**

Run:

```bash
for f in \
  "docs/insights/05-企业侧转型.md" \
  "docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md" \
  "docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md" \
  "docs/insights/README.md"; do
  test -f "$f" && printf "OK %s\n" "$f" || printf "MISSING %s\n" "$f"
done
```

Expected output:

```text
OK docs/insights/05-企业侧转型.md
OK docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md
OK docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
OK docs/insights/README.md
```

- [ ] **Step 2: Scan for accidental placeholders**

Run:

```bash
rg -n "TBD|TODO|待补|待定|placeholder|FIXME" docs/insights/05-企业侧转型.md docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md docs/insights/README.md || true
```

Expected output may include existing intentional “待核实” references in `05-企业侧转型.md`, but must not include `TBD`, `TODO`, `待补`, `待定`, `placeholder`, or `FIXME`.

- [ ] **Step 3: Check for old detailed headings in overview**

Run:

```bash
rg -n "^## 7\. 展开|^## 8\. 展开|^## 9\. 展开|^## 10\. 展开" docs/insights/05-企业侧转型.md || true
```

Expected output:

```text
```

- [ ] **Step 4: Check line counts stay manageable**

Run:

```bash
wc -l docs/insights/05-企业侧转型.md docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
```

Expected guideline:

```text
Each file should remain under 800 lines.
```

If a file exceeds 800 lines, reduce repetition rather than splitting again.

- [ ] **Step 5: Review final diff**

Run:

```bash
git diff --stat HEAD~4..HEAD
```

Expected changed files include:

```text
docs/insights/05-企业侧转型.md
docs/insights/05-01-大企业AI转型的杠铃结构落地路径.md
docs/insights/05-02-中小企业AI转型：托管杠铃与数据主权.md
docs/insights/README.md
```

Also run:

```bash
git log --oneline -5
```

Expected: recent commits include the four documentation commits from Tasks 2-5 plus the plan commit if it was not already committed.

- [ ] **Step 6: Final status check**

Run:

```bash
git status --short
```

Expected output:

```text
```

- [ ] **Step 7: Push branch**

Run:

```bash
git push
```

Expected output includes either a successful push or:

```text
Everything up-to-date
```

---

## Self-Review Checklist

- [x] Spec coverage: every requirement from `docs/superpowers/specs/2026-09-15-ai-transformation-barbell-design.md` maps to a task.
- [x] File responsibilities are explicit.
- [x] New documents have full section structures and concrete content.
- [x] `05` refactor has exact replacement text and routing section.
- [x] README update has exact replacement rows.
- [x] Validation commands and expected outputs are specified.
- [x] No placeholder terms are used as future work instructions.
- [x] The plan keeps the work documentation-only and avoids unrelated refactors.
