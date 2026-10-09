# SkillHub vs Skills Manager 对比与面向 A2A 的 Skill 资产设计

## 1. 调研对象与资料来源

- **iflytek/skillhub**（讯飞，GitHub 约 5.2k stars / 837 forks，Apache-2.0，Java 21 + Spring Boot 3.2.3 + React 19，2026-03 创建，活跃维护中，仅 37 个 open issues）：自托管的企业 Agent Skill 注册中心。
- **xingkongliang/skills-manager**（个人开发者 @JayTL00，约 5.8k stars / 482 forks，MIT，Rust + Tauri 2 + React 19，2026-03 创建，活跃，245 个 open issues）：跨 54 个编码工具管理本地 Skill 库的桌面应用 + CLI。
- 资料来源：两个仓库的 GitHub API 元数据与 README（2026-09-29 读取），未做部署实测。
- 调研性质：产品对比 + 选型建议 + Skill 资产结构设计（面向未来跨团队 A2A 编排调度）。

---

## 2. 一句话定位

**SkillHub**：企业级、自托管的 Skill **注册与治理平台**——发布、版本化、命名空间、RBAC、评审、审计、检索、CLI 分发，"a registry and governance platform — not a skill collection"。

**Skills Manager**：个人开发者本地的 Skill **库房与分发台**——把散落在 54 个编码工具（Claude Code、Codex、Cursor、Copilot、OpenClaw……）里的 Skill 收进一个中央库，按需 symlink/copy 部署到各工具。

```text
SkillHub 解决"组织的 Skill 资产放在哪、谁管、怎么发"；
Skills Manager 解决"我一个人的 Skill 在多工具间怎么装、怎么同步"。
```

两者同名不同层：一个是服务端 control plane，一个是桌面 data plane。它们甚至不是严格竞品——后文会论证组合用法。

---

## 3. 核心能力拆解

### 3.1 Skills Manager：单机技能库房

- **统一库房**：Git repo / 本地目录 / `.zip` / `.skill` 包 / skills.sh 市场安装，全部进 `~/.skills-manager` 中央库（SQLite 记元数据）；
- **Presets**：把 Skill 组成命名预设，一键对某个 agent 范围批量启停；
- **三类工作区**：Global（按 agent 列出其全局目录里所有 Skill，含不是经它装的）/ Project（项目本地 Skill 目录与中央库双向同步）/ Linked（任意目录挂为 Skill 根）；
- **部署模型**：symlink 或 copy 到各 agent 的 skills 目录，卡片上的 agent 徽标实时反映部署状态；
- **备份与多机同步**：登录 GitHub 一键建私有备份仓库；**skill 级合并**（不是文本行级）——一台机器重命名、另一台机器改内容可以干净合并；真冲突不阻塞，进"Needs attention"，三选一且每步可撤销；快照可恢复。secrets 永不出本机，>100MB 的 Skill 自动排除；
- **Agent 自管**：内置 `manage-skills` Skill + 发布 CLI 到 `~/.skills-manager/bin/`，agent 通过 CLI 的 `--json` 结构化输出驱动安装/部署/巡检，而不是绕过后台直接改 agent 文件夹；
- **治理面**：无。没有服务器、没有 RBAC、没有评审流、没有审计日志（只有本地活动日志），资产归属是"这台机器的这个人"。

### 3.2 SkillHub：组织注册中心

- **发布与版本**：Skill 包上传 + semver + 自定义 tag（`beta`/`stable`）+ `latest` 自动跟踪；
- **命名空间**：team / global 两级，每个 namespace 自带成员与角色（Owner / Admin / Member）和发布策略；
- **评审与治理**：namespace admin 审团队内发布，平台 admin 门禁晋升 global scope；治理动作全部进审计日志；
- **发现**：全文检索 + 按 namespace / 下载量 / 评分 / 时间过滤；可见性规则保证只看到有权看的；
- **协作信号**：star、评分、下载量——组织内最佳实践的社区化运营；
- **账户与令牌**：OAuth 身份合并、scoped API token（前缀哈希存储）；
- **CLI 优先**：`@astron-team/skillhub` 原生 CLI + ClawHub 协议兼容层（search/inspect/install 兼容，publish 用一方 CLI）；REST API + Python 示例；
- **工程化**：多模块 Maven clean architecture、Flyway 迁移、S3/MinIO 可插拔存储、Docker Compose / K8s manifests / Helm chart、Prometheus + Grafana 监控、安全扫描器组件、上传扩展名 allowlist；
- **生态集成**：OpenClaw、Hermes Agent、DeepSeek Harness、HarnessClaw、AstronClaw（企业微信/钉钉/飞书通道、130+ 官方 Skill）、Loomy 桌面助手、astron-agent 编排框架（SkillHub 里的 Skill 可被加载进生产工作流）；
- **格式**：完全兼容 anthropics/skills 的 `SKILL.md` 格式（name/description frontmatter + 附属文件）——开放集合里的 Skill 可以直接发布进私有注册中心；
- 隐私治理、内容安全、CoC、安全披露文档齐全；AAIF 准成员，属讯飞 Astron 开源生态。

---

## 4. 对比：优劣势

| 维度 | Skills Manager | SkillHub |
|---|---|---|
| 部署形态 | 桌面 App + 本地 CLI，零服务器 | 服务端私有化（Docker/K8s/Helm），要运维 |
| 资产归属 | 个人本机（备份在个人 GitHub 私仓） | 组织 namespace，与人解耦 |
| 版本治理 | Git 历史 + 上游更新检查 | semver + tag + latest + 评审晋升 |
| 权限与审计 | 无 | RBAC（Owner/Admin/Member）+ namespace 策略 + 审计日志 |
| 团队协作 | 多机同步（同一个人） | 多人发布、评审、评分、订阅 |
| 分发方式 | 本地 symlink/copy 到 54 个工具 | registry URL + CLI + 全文检索 + API token |
| 生态位 | 编码工具适配面**更宽**（54 个 agent 开箱即用） | Agent 平台集成更深（OpenClaw/Astron/飞书通道） |
| 维护主体 | 个人开发者（bus factor = 1） | 讯飞组织仓库 + Astron 生态 + 企业治理文档 |
| 技术栈 | Rust/Tauri，轻 | Java/Spring + PG/Redis/S3，重 |
| 技术亮点 | skill 级合并、结构化 CLI 错误、agent 自管协议 | clean architecture、协议兼容层、可插拔存储 |

**各自的根本短板（都指向同一个缺口）：**

- Skills Manager 的短板是**没有组织层**——几十人团队用它，等于每人一个库房 + 各自的 GitHub 备份仓，资产不归部门、无法统一发现、无评审无审计，"为组织调度做准备"这一条完全不满足；
- SkillHub 的短板是**治理止步于发布**——它管住了"谁能发、发什么版本、谁审"，但 README 全文没有出现：Skill 的**质量评测**（eval 集合、金样本、回归）、**运行遥测**（成功率、使用量、成本回填）、**依赖管理**（Skill 之间的依赖与 blast radius）、**能力契约**（输入输出 schema、副作用声明）。它本质上是 **npm registry 的企业私仓形态**——npm 解决了分发，从来没解决质量。

---

## 5. 选型判定：几十人业务团队怎么选

**结论：选 SkillHub，明确且没有悬念。** 判据从我们的 04-06 框架直接推导：

1. **资产有 owner 才有生命**——Skills Manager 的资产 owner 是"个人 + 他的笔记本"，人走资产走；SkillHub 的 namespace + 成员角色 + 审计让资产归部门；
2. **跨团队复用的前提是统一发现**——调度器（未来的编排层）要能检索能力，只能检索一个服务端 registry，不可能去 40 台桌面机拼凑；
3. **A2A 的信任基础是版本与评审**——别的团队敢把你的 Skill 编排进它的流程，靠的是 semver + stable tag + 评审记录，不是"他说这个能用了"；
4. **运维成本可控**——几十人团队一套 Docker Compose + MinIO 就能跑，不需要专职平台团队；
5. **生态同构**——理想环境是飞书 + OpenClaw + Skill 社区，SkillHub 的 AstronClaw/OpenClaw 集成路径与此同构，团队心智不用换。

**但两个修正意见（顾问视角，防止选型变成终点思维）：**

- **组合而非二选一**：两者是 C/S 两端。推荐形态是——SkillHub 做团队 registry，开发者本机继续用 Skills Manager 管理多工具部署（SkillHub CLI 支持 `--dir` 指定安装目录，理论上可指向 Skills Manager 的中央库目录，未实测）。个人效率工具不必因团队选型而废掉；
- **认清 SkillHub 只覆盖四件事里的两件**。我们 04-06 给资产注册公共品定的职责是：**登记、治理、证据、遥测**。SkillHub 覆盖登记与治理（做得不错），证据与遥测空白。这意味着上 SkillHub 只是起点，第 6 节的设计就是为补齐后两件。

---

## 6. 面向 A2A 的完善 Skill 资产设计

> 前提判断：当前事实标准格式（anthropics/skills 的 `SKILL.md`：`name` / `description` frontmatter + 附属文件）只解决了**被检索**，没有解决**被调度**。人类读 description 决定用不用一个 Skill 是可行的；一个跨团队的编排器要决定"把这个任务委托给谁"，需要的是**机器可校验的能力契约**。设计目标：同一份资产，本地 agent 装载可用，包装成 endpoint 后可被 A2A 调度器协商调用。

### 6.1 一个完善 Skill 的七层结构

```text
my-skill/
├── SKILL.md                 # ① 入口层：人读。name/description/何时用/何时不用/反例
├── skill.yaml               # ② 契约层：机器读。注册中心索引与调度决策的核心
├── contract/
│   ├── input.schema.json    #   输入 JSON Schema（参数、类型、约束）
│   ├── output.schema.json   #   输出 Schema + 结论四态标注（含 UNVERIFIED）
│   ├── effects.yaml         #   副作用声明：只读 / 写哪些系统 / 是否可逆
│   └── permissions.yaml     #   权限需求：需要的 MCP 工具、数据范围、最小集
├── resources/               # ③ 知识层：参考文档、模板、字段字典、示例
├── scripts/                 # ④ 程序层：确定性步骤（可执行、可测试、不烧 token）
├── tests/
│   ├── golden/              # ⑤ 证据层：金样本输入输出
│   ├── eval.md              #   评测集、通过标准、最近一次评测结果与 commit
│   └── regression/          #   回归用例（升版本必须全绿）
├── agent-card.yaml          # ⑥ 协商层：A2A 导出——能力广告 + 协商参数
├── CHANGELOG.md             # ⑦ 治理层：版本史、变更原因、breaking 标注
└── LICENSE
```

各层的设计理由：

- **① 入口层**保持向后兼容 `SKILL.md` 格式——SkillHub 和所有 agent 平台直接认它，零迁移成本；
- **② 契约层**是新增的关键件。注册中心的索引不再只读 frontmatter 两个字段，而是读 `skill.yaml` 的全量声明；
- **③④ 分离知识层与程序层**，对应我们在 17 案例里的收敛结论：确定性流程不该烧 LLM token，能写成脚本的步骤进 `scripts/`，LLM 只处理真正需要判断的环节；
- **⑤ 证据层**是对"治理止步于发布"的正面回答：没有 eval 证据的 Skill 不允许打 `stable` tag——把 maturity 和 evidence 绑死；
- **⑥ 协商层**是面向未来的门：今天没人消费它，明天编排器靠它做能力发现与协商。

### 6.2 skill.yaml 契约设计（关键字段）

```yaml
apiVersion: skill/v1
name: supply-demand-imbalance-analysis
version: 1.4.2                      # semver，breaking 变更必须 major
license: Apache-2.0
owner: zhangsan                     # 唯一责任人
successor: lisi                     # 继任者——离职不断档
visibility: team:supply-chain       # namespace，晋升 global 需评审
maturity: beta                      # experimental / beta / stable / deprecated

capabilities:                       # 一个 Skill 可暴露多个能力
  - id: analyze-imbalance
    description: 供需断点分析与定位
    inputs: contract/input.schema.json
    outputs: contract/output.schema.json
    effects:                        # 编排器做权限协商的依据
      reads: [mcp:o9-planning]
      writes: [mcp:feishu-doc]
      irreversible: false
    outputConfidence: four-state    # verified / unverified / partial / failed

requires:                           # 依赖声明——blast radius 的基础
  tools: [mcp:o9-planning@>=2.1, mcp:feishu]
  skills: [data-quality-check@>=2.0]   # Skill 间依赖
  modelClass: reasoning             # fast / reasoning——路由层的选型依据

sla:                                # 调度器的成本与延迟预算
  typicalLatency: 30s
  typicalCostPerRun: 0.02

evidence:                           # 与 maturity 绑定，注册中心校验
  evalPassRate: 0.92
  lastEvalCommit: a1b2c3
  goldenCases: 18

telemetry:                          # 注册中心回填，不由作者手填
  installs30d: 214
  successRate: 0.87
  avgCostPerRun: 0.017
  lastUsed: 2026-09-25
```

### 6.3 A2A 编排视角的五个设计决策

**（1）一份资产、两种供给形态。** 本地形态：agent 装载 `SKILL.md` + `scripts/`，Skill 在消费方进程里执行；服务形态：把 capability 包装成一个 agent endpoint，`agent-card.yaml` 即其 AgentCard，Skill 变成被调度的服务。契约层（②）和协商层（⑥）保证两种形态行为一致——这是"为组织调度做准备"的确切含义：不用重写，只需包装。

**（2）编排器的三个决策依据都要落在资产上。** 能力发现靠 `capabilities`；可信度排序靠 `maturity + evidence + telemetry`（一个成功率 0.87、18 个金样本全绿的 beta，比一个没有证据的 stable 更该被调度）；协商靠 `effects + permissions + sla`——跨团队调用本质上是一次最小权限协商：你的 Skill 要写我的飞书文档？先看 `effects.writes` 声明。

**（3）结论四态写进输出 Schema。** 跨团队调度最脆弱的一环是被调用方"自信地说错"。输出契约强制每条结论带 `verified / unverified / partial / failed` 标注，调用方编排器据此决定是否追加复核环节。这是我们 17 案例收敛出的铁律，必须在资产层固化。

**（4）依赖声明 + blast radius。** `requires.skills` 让注册中心能回答"如果我升级 X，哪些 Skill 会断"——这正是 open-ontologies 对本体变更做的事，资产变更同理。没有依赖图，semver 的 major 警告没人看得见。

**（5）遥测回填是对抗资产腐烂的唯一机制。** 17 案例和 openJiuwen 调研都指向同一风险：Skill 越积越多、无人负责、静静腐烂。`telemetry` 由注册中心自动回填（install/成功率/成本/最近使用），并把"90 天零使用且无 owner"自动降级为 `deprecated`——让淘汰成为制度而不是勇气。

### 6.4 演进路线（不要一步建全）

| 阶段 | 做什么 | 不做什么 |
|---|---|---|
| 第一步（现在） | 上 SkillHub；定 `SKILL.md` 规范：必填 owner / visibility / maturity 三字段（写进 frontmatter 即可） | 不引入完整七层结构——几十人团队先让资产流起来 |
| 第二次收编信号出现时 | 加 `skill.yaml` 契约层 + 金样本证据；registry 校验"无证据不得 stable" | 不做 Skill 间依赖图——等出现第一个真实的跨 Skill 依赖 |
| 出现第一个跨团队调度需求时 | 加 `agent-card.yaml`、包装 endpoint、接编排器 | 不自建 A2A 协议栈——跟进标准（AgentCard / A2A）而非发明 |

每一步由真实的补偿行为触发（有人开始问"这个 Skill 靠不靠谱"、有团队想调你的能力），而不是由路线图触发——这是 04-06 旋转门节律在资产层的应用。

---

## 7. 对我们当前项目的启发

**（1）SkillHub 是 04-06"资产注册"公共品的现成开源参照。** 我们给资产注册定的四职责（登记、治理、证据、遥测），SkillHub 实现了前两件且工程化质量不错（RBAC、评审晋升、审计、可插拔存储、Helm）。04-06 模块设计里的资产注册表可以直接对标它的能力清单，缺口（证据、遥测、依赖、A2A 导出）就是我们要在收编时补的增量——不用从零建 registry。

**（2）对理想 17 案例生态的适用性。** 理想的 AI 社区 + Skill 上载与 SkillHub 同构，且同样缺证据与遥测。第 6 节的七层结构可以直接作为社区 Skill 规范的升级提案：最小改动是 frontmatter 加 owner/maturity 两字段——一夜之间每个 Skill 有了责任人和成熟度，这是成本最低、收益最大的一步。

**（3）skills-manager 的两个模式值得偷。** 一是 skill 级合并（比文本行级合并更懂资产的冲突解决）；二是"agent 通过结构化 CLI 驱动管理器而不是绕过它改文件"——这个正门原则与 04-06 的"走鉴权正门"完全同构，资产管理的 API 也应该是 agent-friendly 的。

**（4）家庭营养师项目。** 个人项目的 Skill（营养规则、风格 Skill）暂不需要 registry，但 owner/maturity 两个字段现在就值得写进 frontmatter——成本一行 YAML，收益是将来任何资产迁移都有元数据可依。

---

## 8. 后续需要实测的问题

1. SkillHub 私有化部署的完整体验：Docker Compose 起一套，验证发布→评审→晋升 global→CLI 安装全流程，以及 bootstrap admin 的安全默认值整改是否到位；
2. SkillHub 是否支持 skill 包内的自定义元数据（`skill.yaml` 能否随包存储并被 API 检索）——这决定第 6 节契约层能否不加修改地落地，还是需要提 PR；
3. SkillHub CLI `--dir` 安装到 Skills Manager 中央库目录的组合用法是否成立（个人端 + 团队端打通）；
4. ClawHub 兼容层的覆盖度：理想 OpenClaw 环境下 `clawhub install` 对 SkillHub 的实际兼容性；
5. `agent-card.yaml` 与 A2A 标准的 AgentCard 字段对齐——标准仍在演进，跟进 W3C/社区草案，避免自定义过早固化；
6. 讯飞 Astron 生态的商业边界：SkillHub 的开源承诺与 astron-agent 商业版的关系（引擎开源、平台收费的模式是否稳定）。
