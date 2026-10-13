# 私有化 Skill 发布、审核、管理与运行监控方案横向对比

> 调研日期：2026-10-10  
> 适用假设：团队知识库使用 **WeKnora**，Agent 运行平台使用 **DeepSeek Harness（DSH）**，希望对团队 Skill 做集中发布、审核、版本管理、分发和运行监控。  
> 资料来源：本目录已有的 `skillhub-vs-skills-manager-and-a2a-skill-design.md`、`teamai-cli.md`、`paperclip.md`，以及候选项目官方 README / 官方文档。除非特别注明，本文未在真实团队环境完成部署实测。

---

## 1. 先给结论

目前没有一个成熟的开源私有化产品同时完整覆盖以下四件事：

```text
Skill 注册与发布
+ 发布前审核与质量门禁
+ 运行时分发与权限管理
+ Skill 级运行遥测、评测和持续运营
```

更现实的做法是采用组合架构：

```text
GitLab / Gitea
  └── Skill 源码、Merge Request、CI、代码审计

SkillHub
  └── 团队 Skill 注册、版本、namespace、RBAC、发布晋升、CLI 分发

DeepSeek Harness
  └── Skill 装载、Agent 会话、工具调用、插件运行和任务执行

WeKnora
  └── 团队知识、参考资料、业务文档和结构化上下文

OpenTelemetry + Phoenix 或 Langfuse
  └── DSH 运行轨迹、模型/工具调用、评测、成本、失败和反馈

自建 skill-telemetry 聚合层
  └── 将运行 trace 按 skill、版本、团队和 owner 聚合后回写治理面
```

推荐优先级：

1. **SkillHub 作为团队 Skill Registry 起点**；
2. **GitLab/Gitea + CI 负责源码级评审和硬门禁**；
3. **DSH 作为执行面，不把 Skill Registry 的职责塞进 DSH**；
4. **WeKnora 继续承担知识库职责，不把所有参考文档打包进 Skill**；
5. **Phoenix 或 Langfuse 负责运行观测和评测**；
6. **Skill 级成功率、成本、使用量和过期降级需要补一层聚合服务**。

如果当前团队规模较小，可以先采用：

```text
GitLab/Gitea + SkillHub + DSH + WeKnora + Phoenix
```

如果团队更重视 Prompt/数据集评测、人工标注和实验迭代，则将 Phoenix 替换为 Langfuse，或先做两者的短期 PoC 再定。

---

## 2. 先拆清楚：你要管理的不是一种资产

DSH 中的 Skill 与 Harness 插件不是同一个对象：

```text
Skill：说明模型如何完成一类任务的文本/资源资产
插件：改造 Harness 运行时的代码资产，可以增加工具、服务、UI 或 MCP
```

因此团队治理至少要分三类：

| 资产 | 典型内容 | 主要治理方式 | 运行风险 |
|---|---|---|---|
| Skill | `SKILL.md`、references、templates、scripts | 内容评审、金样本、版本、适用范围、owner | 模型误解、上下文膨胀、错误建议 |
| Skill 包 | Skill + 依赖 + 契约 + 测试数据 | Registry、依赖解析、兼容矩阵、发布晋升 | 依赖不兼容、数据越权、版本漂移 |
| Harness 插件 | TypeScript 包、工具、服务、MCP、UI | 代码评审、CI、沙箱、签名、权限、回滚 | 代码 bug、工具越权、生命周期泄漏 |

一个重要边界是：

> Skill 的审核通过，不代表它拥有执行权限；Skill 能被 DSH 装载，也不代表它可以调用敏感工具。

建议把权限分为两层：

```text
Skill 声明“需要什么能力”
→ DSH profile / plugin / tool policy 决定“实际允许什么能力”
```

对于涉及生产写入、设备控制、业务状态变更或敏感数据读取的内容，不能仅靠 `SKILL.md` 中的文字约束。必须由 DSH 插件、工具策略和人工 gate 在运行时强制执行。

---

## 3. 候选方案定位

### 3.1 SkillHub：目前最接近团队 Skill 注册中心

**定位**：企业级、自托管的 Agent Skill 注册与治理平台。

官方项目 README 将其定位为私有、受治理的团队 Skill 共享平台；支持 Skill 包发布、发现、版本、namespace、角色、评审晋升、审计、CLI/API 分发，并提供 Docker 镜像及 Kubernetes/Helm 方向的部署材料。已有调研详见 `skillhub-vs-skills-manager-and-a2a-skill-design.md`。

**适合承担**：

- 团队 Skill 的中央登记；
- team/global namespace；
- owner、角色和可见性；
- beta/stable 等版本晋升；
- 审核、审计和回滚入口；
- 给 DSH 或本地客户端提供安装源。

**明显缺口**：

- 未证明内置完整的金样本评测和回归门禁；
- 未证明内置 Skill 级成功率、成本、失败率和使用量聚合；
- 依赖图、blast radius、输入输出 Schema 和副作用契约需要验证或扩展；
- 与 DSH 的具体安装、更新、pin 版本和回滚流程需要实测；
- 自定义 `skill.yaml` 是否能被服务端索引和校验，需要先做 PoC。

**判断**：如果目标是“团队 Skill 有一个组织级家”，SkillHub 是当前最值得优先试用的候选；但它不是完整的运行监控和质量平台。

---

### 3.2 Tencent TeamAI / AITeam：Git-backed 团队 Harness 分发

**定位**：通过共享 Git 仓库管理 skills、rules、agents、hooks、MCP、models、environment 和团队学习，并在 Agent 会话开始时同步。

**优势**：

- Git/MR 天然适合研发团队评审、审计、回滚；
- 资产类型比纯 Skill Registry 更广；
- 支持 project、role、tag、namespace 等资源分发维度；
- 有 friction、learning、digest、dashboard 等持续改进思路；
- 已将 DeepSeek Harness 列入兼容客户端列表，值得做实际适配验证。

**短板**：

- 更像团队 Harness 配置与分发层，不是标准化的 Skill Registry 服务；
- 组织级发布、版本晋升、可发现性和 API 生态不如 SkillHub 聚焦；
- 运行遥测和 Skill 质量证据仍需要补；
- Git 同步适合低频治理资产，不适合作为运行时状态、动态策略和大规模二进制的唯一存储。

**判断**：如果团队本来就以 GitOps 管理 Agent 配置，TeamAI 可以作为 SkillHub 前的轻量方案，或作为作者侧开发工作区；不建议把它单独当作完整的 Skill 发布平台。

---

### 3.3 Skills Manager：本地多 Agent Skill 管理器

**定位**：桌面应用 + CLI，把个人机器上的 Skill 集中管理，并部署到多个编码 Agent 的目录。

**优势**：

- 多客户端安装、symlink/copy、preset 和本地快照体验好；
- 适合个人开发者快速试用和多工具同步；
- 可以作为 SkillHub 的消费端候选，但需要实测目录和版本组合方式。

**短板**：

- 没有服务器端 RBAC、团队 namespace、发布审核和组织审计；
- 资产归属仍然偏向个人机器；
- 没有组织级运行监控和质量门禁；
- 个人 GitHub 私有备份不能替代团队资产治理。

**判断**：可作为开发者本机 data plane，不适合作为团队 control plane。

---

### 3.4 Paperclip：Agent 组织、任务和预算控制面

**定位**：把异构 Agent 组织成可管理的“公司”，提供组织结构、目标、任务、heartbeat、预算、审批、连接器、技能和活动记录，并通过 adapter 接入不同 Agent runtime。

**优势**：

- durable wakeup queue、任务领取、并发控制和恢复语义较完整；
- 有 approval gates、预算 hard stop、连接动作权限和 activity history；
- adapter 解耦，理论上可以管理已有 Agent，而不是替换 DSH。

**短板**：

- 它的核心对象是 Agent 组织和任务，不是 Skill 包注册；
- 需要验证 adapter 是否能完整承载 DSH 的 session、tool、plugin 和异步任务语义；
- 不提供专门的 Skill 发布审核、Skill 质量证据和 Skill 级遥测模型；
- “公司”模型不能直接替代工业领域的设备状态、数据质量和现场安全门禁。

**判断**：只有在团队开始需要跨 Agent 调度、周期任务、预算和组织级工作分配时再引入。当前不能替代 SkillHub，也不是第一阶段必需品。

---

### 3.5 Langfuse：自托管 LLM 工程、评测和运行观测

**定位**：开源、自托管的 LLM engineering 平台，覆盖 tracing、prompt management、datasets、evaluation、人工反馈和调试；官方提供 Docker Compose、VM 和 Kubernetes/Helm 等部署路径。

**适合承担**：

- DSH 会话和模型调用轨迹；
- Prompt/配置版本和实验；
- 数据集、金样本、LLM-as-a-judge、代码评测和人工标注；
- Token、延迟、失败、重试和成本等运行指标；
- 从失败运行回到 Prompt/模型配置的调试闭环。

**缺口**：

- 不是 Skill Registry；
- 不负责 namespace、Skill 包晋升、安装和分发；
- Skill 级成功率需要在 trace 中显式记录 skill name、version、owner 和 run outcome，再由聚合任务计算；
- 需要评估其与 DSH 的 OpenTelemetry/插件出口是否兼容，以及内容采集的隐私边界。

**判断**：适合作为 DSH 的运行观测和评测后端，尤其适合团队要做金样本、人工反馈和 Prompt 迭代时。

---

### 3.6 Arize Phoenix：自托管 Agent 可观测与评测

**定位**：开源、自托管的 AI observability 平台，基于 OpenTelemetry/OpenInference，提供 tracing、evaluation、datasets、experiments、playground 和 MCP 查询接口；官方提供 Docker 镜像和 Helm 部署路径。

**优势**：

- 对 Agent trace、LLM 调用、工具调用和检索链路友好；
- 支持数据集、实验和评测；
- OpenTelemetry/OpenInference 生态有利于与 DSH 做边界适配；
- 可以通过 MCP 让开发者或 Agent 查询 trace、数据集和实验。

**短板**：

- 不是 Skill 注册、审核或分发平台；
- Skill 版本、owner、namespace 和发布状态需要由上游注入 trace attributes；
- 仍需要自己定义 Skill 级指标、质量阈值和降级规则；
- 需要确认 DSH 当前事件模型能否稳定映射为 OpenTelemetry trace。

**判断**：如果优先目标是“先看清 DSH 运行时发生了什么”，Phoenix 是很好的轻量候选；如果优先目标是 Prompt/数据集协作和人工标注，Langfuse 可能更合适。两者建议先选一个，不要一开始同时维护。

---

### 3.7 Agenta：Prompt/Agent 组件和评测平台

**定位**：开源、自托管的 Agent/LLM 工程平台，强调组件检查、Prompt/Agent 迭代、评测和运行成本可见性，支持自托管和多模型。

**适合承担**：

- Prompt 或 Agent 配置实验；
- 评测集和结果比较；
- 开发阶段的交互式调试。

**短板**：

- 不是以团队 Skill 包注册和发布为核心；
- 与 DSH 的集成、Skill 版本分发、RBAC 和企业审核需要单独验证；
- 与 Langfuse/Phoenix 存在较大观测和评测重叠。

**判断**：可作为评测类候选调研，不建议与 Langfuse/Phoenix 一起作为第一阶段基础设施。

---

### 3.8 Dify：完整 Agent 应用平台，但不是 DSH 的 Skill 管理插件

**定位**：可私有化部署的 Agent 应用和工作流平台，提供应用配置、工作流、模型、插件、日志和运行管理。

**优势**：

- 部署门槛低，适合快速搭建业务 Agent；
- 有应用级配置、工作流、插件和运行日志；
- 可以作为不使用 DSH 时的替代运行平台。

**短板**：

- 主要管理 Dify 自身的应用和工作流，不是面向 DSH 的通用 Skill Registry；
- 如果团队已经决定 DSH 为运行平台，引入 Dify 会形成第二套运行时；
- 资产模型、权限、运行状态和监控不能自然与 DSH 合并。

**判断**：只有在重新评估“是否继续使用 DSH”时才纳入架构选型；在当前假设下不建议作为 Skill 管理层。

---

### 3.9 Backstage + 自定义插件：通用企业目录方案

**定位**：自托管开发者门户和软件目录，支持目录、模板、插件和组织集成。

**可利用之处**：

- 把 Skill、Agent、MCP、模型和运行服务作为目录实体；
- 用模板生成 Skill 仓库；
- 接入企业身份、审计、文档和服务目录；
- 统一展示 owner、依赖、运行服务和责任边界。

**短板**：

- 没有现成的 Skill 语义和发布晋升模型；
- 需要自行实现包存储、版本、评测门禁、分发、遥测和 Skill UI；
- 工程量显著高于部署 SkillHub。

**判断**：适合作为组织级门户的长期扩展，不适合作为当前第一选择。可以在 SkillHub 成为底层注册中心后，用 Backstage 做统一目录入口，而不是一开始重建 SkillHub。

---

### 3.10 GitLab/Gitea + CI：不可省略的源码治理底座

**定位**：不是 Skill 产品，但提供私有 Git、Merge Request、权限、审计、流水线、制品和 Webhook。

**建议承担**：

- Skill 源码和版本历史；
- 评审、双人审批和 CODEOWNERS；
- `validate-skill`、Schema 校验、依赖扫描和金样本测试；
- 发布前安全扫描和制品签名；
- 通过 webhook 触发 SkillHub 发布或撤回；
- 保存测试报告和变更原因。

**判断**：无论是否使用 SkillHub，都建议保留 Git + CI。SkillHub 解决的是组织注册和分发，不应成为唯一的源码审计来源。

---

## 4. 横向能力矩阵

评分含义：

- `强`：产品核心能力，适合直接承担；
- `中`：有相关能力，但需要配置、适配或补充；
- `弱`：只能间接实现；
- `无`：不属于产品职责；
- `待验`：文档或 README 未足够证明，需要部署验证。

| 方案 | Skill 注册 | 版本/分发 | 发布审核 | RBAC/审计 | 质量评测 | 运行监控 | 任务调度 | DSH 适配 | 私有化 |
|---|---|---|---|---|---|---|---|---|---|
| **SkillHub** | 强 | 强 | 强 | 强 | 弱/待验 | 弱 | 无 | 中/待验 | 强 |
| **TeamAI** | 中 | 强（Git） | 强（MR） | 中（Git/资源域） | 中 | 中 | 无 | 中/待验 | 强 |
| **Skills Manager** | 个人级 | 强（本机） | 无 | 无 | 无 | 无 | 无 | 中/待验 | 强 |
| **Paperclip** | 弱 | 中 | 中 | 强 | 弱 | 中（任务活动） | 强 | 中/待验 | 强 |
| **Langfuse** | 无 | Prompt 级 | 中（Prompt/实验） | 中 | 强 | 强 | 无 | 中/待验 | 强 |
| **Phoenix** | 无 | 数据集/实验级 | 中（评测结果） | 中 | 强 | 强 | 无 | 中/待验 | 强 |
| **Agenta** | 弱 | Prompt/Agent 级 | 中 | 待验 | 强 | 中 | 弱 | 待验 | 强 |
| **Dify** | 应用/插件级 | 应用级 | 中 | 中 | 中 | 中 | 中 | 替代 DSH | 强 |
| **Backstage** | 目录级 | 模板/目录级 | 自定义 | 强（需集成） | 自定义 | 自定义 | 无 | 自定义 | 强 |
| **GitLab/Gitea + CI** | 源码级 | 强 | 强 | 强 | 强（需写 CI） | 弱 | Webhook | 中 | 强 |
| **OTel + Grafana** | 无 | 无 | 无 | 中 | 弱 | 强（通用） | 无 | 中/待验 | 强 |

核心观察：

```text
SkillHub 解决登记、治理和分发；
GitLab/Gitea + CI 解决源码评审和质量门禁；
Phoenix/Langfuse 解决运行观测和评测；
Paperclip 解决跨 Agent 任务调度；
没有一个候选可以独立覆盖全部闭环。
```

---

## 5. 与 WeKnora + DSH 的推荐组合

### 5.1 推荐逻辑架构

```text
                         ┌──────────────────────────────┐
                         │        Team Portal            │
                         │ SkillHub / optional Backstage │
                         └──────────────┬───────────────┘
                                        │ search / review / publish
                              ┌─────────▼─────────┐
                              │ Skill Registry     │
                              │ SkillHub            │
                              └─────────┬─────────┘
                                        │ pinned package/version
                      ┌─────────────────▼─────────────────┐
                      │ DeepSeek Harness                   │
                      │ profile / plugin / tool policy     │
                      └──────┬───────────────┬────────────┘
                             │               │
                    ┌────────▼───────┐ ┌───▼────────────┐
                    │ WeKnora         │ │ External tools  │
                    │ knowledge/RAG   │ │ MCP/API/DB      │
                    └────────────────┘ └────────────────┘
                             │               │
                             └──────┬────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ OTel / Phoenix or   │
                         │ Langfuse            │
                         └──────────┬──────────┘
                                    │ traces / evals / feedback
                         ┌──────────▼──────────┐
                         │ Skill telemetry      │
                         │ aggregation service  │
                         └──────────┬──────────┘
                                    │ owner/version/status
                                    ▼
                              SkillHub metadata
```

### 5.2 WeKnora 的职责边界

WeKnora 负责：

- 团队知识、制度、产品文档、案例和参考资料；
- 检索、切片、索引、权限和知识更新；
- 给 DSH 提供可引用的上下文；
- 保存较大规模、持续变化的资料。

WeKnora 不应负责：

- Skill 包版本晋升；
- Skill 是否允许安装；
- Skill 依赖和兼容性；
- 运行时权限；
- Skill 成功率和成本归因。

Skill 中只保留“如何使用知识”和必要的字段/流程约束；完整参考资料应通过 WeKnora 检索，避免每个 Skill 都复制一份知识库。

### 5.3 DSH 的职责边界

DSH 负责：

- Agent session 和上下文装载；
- Skill 调用；
- Harness 插件、工具和 MCP 的注册；
- 工具权限、确认、执行和结果回读；
- profile、任务状态、恢复和审计；
- 将运行事件导出到 OTel/Phoenix/Langfuse。

DSH 不应负责：

- 多团队 Skill 的中央发布审核；
- 作为长期 Skill 包仓库；
- 替代 WeKnora 的知识库；
- 直接决定 Skill 是否晋升为组织标准。

---

## 6. 建议的 Skill 发布与运行闭环

```text
1. 作者在 GitLab/Gitea 创建 Skill
   ↓
2. 元技能 + 模板生成 SKILL.md、skill.yaml、测试目录
   ↓
3. CI 校验
   - frontmatter
   - owner / visibility / maturity
   - input/output schema
   - effects / permissions
   - 依赖与循环依赖
   - secret 扫描
   - Markdown/脚本安全检查
   ↓
4. Pull/Merge Request 双人审核
   - 内容正确性
   - 适用/不适用范围
   - 权限最小集
   - 失败和 UNVERIFIED 输出
   - 是否需要升级为 DSH 插件
   ↓
5. 在 DSH 非生产 profile 中安装候选版本
   ↓
6. 运行 golden cases / regression / 对照测试
   ↓
7. SkillHub 发布 beta
   ↓
8. 经过 owner + domain reviewer 批准后晋升 stable
   ↓
9. DSH 按 profile pin 版本，不自动漂移到 latest
   ↓
10. 运行 trace 记录 skill.name、skill.version、package.digest、owner
   ↓
11. 聚合成功率、失败率、人工纠正、token、时延、成本和最近使用
   ↓
12. 触发复核、降级、撤回或废弃
```

### 6.1 发布前必须通过的门禁

最低要求建议包括：

| 门禁 | 目的 |
|---|---|
| 唯一 name + semver | 防止资产覆盖和版本漂移 |
| owner + successor | 避免人员离开后无人负责 |
| 适用/不适用范围 | 防止能力被错误迁移 |
| 输入/输出 Schema | 让调用方能校验，而不是只读自然语言 |
| effects/permissions | 让安全评审看到副作用和最小权限 |
| golden cases | 提供可重复的正确性证据 |
| regression | 版本升级时发现行为倒退 |
| secret 扫描 | 防止凭据进入 Skill 包 |
| 依赖检查 | 防止隐式依赖和循环依赖 |
| 失败/不确定输出 | 防止模型把未知说成已确认 |
| 回滚版本 | 生产问题时能快速恢复 |

### 6.2 运行时必须记录的字段

至少要让每次 DSH 运行产生以下关联字段：

```yaml
skill:
  name: supply-demand-imbalance-analysis
  version: 1.4.2
  digest: sha256:...
  namespace: supply-chain
  owner: zhangsan
  maturity: stable

run:
  session_id: ...
  profile: quality-prod
  agent_id: ...
  input_class: ...
  outcome: verified | unverified | partial | failed
  human_correction: true | false
  tool_calls: 3
  input_tokens: 1200
  output_tokens: 500
  duration_ms: 42000
  estimated_cost: 0.017
```

其中 `skill.name` 不能只从模型生成文本中猜测，应该由 DSH Skill loader 或 plugin 在装载和调用时注入，避免遥测归因被模型输出污染。

---

## 7. 推荐选型分阶段落地

### 阶段一：先让团队可发布、可审核、可回滚

```text
GitLab/Gitea + CI
SkillHub
DSH
WeKnora
```

只做：

- Skill 包格式；
- owner、namespace、maturity；
- MR 审核；
- CI 基础校验；
- SkillHub beta/stable；
- DSH profile 固定版本；
- 手工回滚。

暂不做：

- A2A endpoint；
- 自动生成组织级 Skill；
- 完整依赖图；
- 自动发布；
- 多租户复杂隔离。

### 阶段二：补质量证据和运行可见性

```text
+ Phoenix 或 Langfuse
+ OTel collector
+ golden cases / datasets
+ skill-telemetry aggregation
```

验证：

- 能否看到一次 DSH 会话中的 Skill 调用；
- 能否按 Skill 版本统计成功率；
- 能否关联人工纠正和反馈；
- 能否将 token、延迟和成本归因到 Skill；
- 能否在升级前执行回归评测；
- 能否在 90 天无使用时提醒 owner，而不是未经审批自动删除。

### 阶段三：出现真实跨团队调度需求后

```text
+ skill.yaml 能力契约
+ agent-card / A2A adapter
+ 依赖图和 blast radius
+ Paperclip 或其他 durable scheduler
+ optional Backstage unified portal
```

触发条件是：

- 第二个团队要调用第一个团队的 Skill；
- Skill 需要作为远程 endpoint 执行；
- 跨团队调用需要协商权限、SLA 和成本；
- 单纯在 DSH 本地装载已经无法满足组织协作。

---

## 8. 方案选择建议

### 推荐方案 A：当前团队的默认选择

```text
SkillHub
+ GitLab/Gitea + CI
+ DeepSeek Harness
+ WeKnora
+ Phoenix
```

适合：

- 团队已经确定 DSH 为 Agent runtime；
- 主要需求是 Skill 的发布、审核、分发和基本运行可见性；
- 希望私有化部署、减少自建代码；
- 还没有复杂跨 Agent 调度需求。

### 推荐方案 B：更重视 Prompt/数据集/人工评测

```text
SkillHub
+ GitLab/Gitea + CI
+ DeepSeek Harness
+ WeKnora
+ Langfuse
```

适合：

- Skill 质量高度依赖 Prompt 和上下文；
- 希望管理数据集、实验、人工标注和 LLM-as-a-judge；
- 需要从失败 trace 直接进入迭代流程。

### 推荐方案 C：GitOps 优先的轻量起步

```text
TeamAI
+ GitLab/Gitea
+ DSH
+ WeKnora
+ OTel/Phoenix
```

适合：

- 团队人数较少；
- 资产主要由研发人员维护；
- 暂时没有独立 Skill Registry 运维能力；
- 可以接受自己补齐 namespace、发布晋升和资产目录。

不建议把方案 C 误认为已经具备 SkillHub 的组织注册中心能力。

### 不建议当前采用的方案

- **Skills Manager 单独使用**：适合个人，不适合团队资产治理；
- **Dify 替换 DSH 但未完成评估**：会引入第二套 Agent runtime；
- **Paperclip 作为 Skill Registry**：对象层次不匹配；
- **Backstage 从零重建 Skill 平台**：投入大，当前没有必要；
- **同时部署 Phoenix、Langfuse、Agenta**：第一阶段会造成三套评测/观测系统并存，难以形成 single source of truth。

---

## 9. 必须在 PoC 中验证的问题

### SkillHub PoC

1. Docker Compose 或 Helm 能否在私有网络稳定启动；
2. 创建 namespace、成员和角色；
3. 发布 Skill、审核、晋升 beta/stable；
4. CLI 安装到 DSH Skill 目录；
5. DSH 是否能固定版本、读取 digest、回滚；
6. webhook/API 是否能触发 DSH profile 更新；
7. `skill.yaml`、Schema 和附属测试文件能否保留并被检索；
8. 初始管理员、令牌、审计和备份的安全默认值；
9. 删除、撤回和版本废弃后的客户端行为。

### DSH + 观测 PoC

1. Skill loader 是否能稳定注入 `skill.name` 和 `skill.version`；
2. DSH session、turn、step、tool 和模型调用能否导出 OTel；
3. 工具重试、失败和人工确认能否保留父子关系；
4. 不采集 Prompt/工具正文时，是否仍然足够做成本和成功率统计；
5. 从一次 trace 能否定位到具体 Skill 包和 Git commit；
6. Phoenix/Langfuse 的数据保留、脱敏和权限是否满足团队要求；
7. 运行遥测聚合后，能否回写 SkillHub 或单独的治理数据库。

### 质量门禁 PoC

1. 一个 Skill 能否用 10 个 golden cases 跑出可重复结果；
2. 结果是否强制区分 verified、unverified、partial、failed；
3. 无 eval 证据是否无法晋升 stable；
4. Skill 依赖升级时能否发现受影响资产；
5. 版本回滚后运行 trace 是否仍能按旧版本归因；
6. 人工纠正是否能进入反馈集，而不是自动改写生产 Skill。

---

## 10. 最终判断

对于“**WeKnora + DeepSeek Harness + 团队 Skill 治理**”这个组合，最合理的产品边界是：

```text
WeKnora = 知识内容控制面
SkillHub = Skill 资产注册与发布控制面
GitLab/Gitea = 源码评审与质量门禁控制面
DSH = Agent 执行控制面
Phoenix/Langfuse = 运行观测与评测控制面
```

不要试图让某一个产品同时扮演全部角色。

当前最现实的第一版不是自建“Skill 全生命周期平台”，而是把这些边界接起来：

```text
Git MR 审核
→ CI 校验与金样本
→ SkillHub 发布
→ DSH 固定版本安装
→ OTel 记录运行
→ Phoenix/Langfuse 评测与观测
→ 聚合结果反馈 owner
→ 复核、晋升、降级或回滚
```

在这个组合中，SkillHub 是最值得先做部署 PoC 的候选；Phoenix 与 Langfuse 二选一做观测评测 PoC；Paperclip、A2A 和 Backstage 等能力应由真实需求触发，而不是在第一阶段预先引入。

---

## 11. 参考资料

- SkillHub：<https://github.com/iflytek/skillhub>
- TeamAI：<https://github.com/Tencent/teamai-cli>
- Skills Manager：见 `skillhub-vs-skills-manager-and-a2a-skill-design.md` 中的 `xingkongliang/skills-manager`
- Paperclip：见本目录 `paperclip.md` 及其官方仓库
- Langfuse：<https://github.com/langfuse/langfuse>；<https://langfuse.com/self-hosting>
- Phoenix：<https://github.com/Arize-ai/phoenix>；<https://arize.com/phoenix/>
- Agenta：<https://github.com/Agenta-AI/agenta>
- Dify：<https://github.com/langgenius/dify>；<https://docs.dify.ai/en/self-host/deploy/quick-start/docker-compose>
- Backstage：<https://github.com/backstage/backstage>
- OpenTelemetry：<https://opentelemetry.io/docs/>
