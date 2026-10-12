# DeepSeek Harness 产品调研

## 0. 资料状态与结论边界

当前本地资料中还没有找到 DeepSeek Harness 的官方产品文档、开源仓库或演示材料；外部 GitHub / Web 检索在当前环境下不可用。因此本文先作为 **框架性产品调研初稿**：基于本仓库已有的 Harness、AI Native 任务闭环、Agent Learning Systems、Coding Agents 与数据治理研究，判断“DeepSeek Harness”这类产品方向应该如何归类、应具备什么能力、如何与现有产品层区分，以及后续拿到官方资料后应该验证哪些问题。

本文中凡涉及具体产品能力的内容，均应理解为“待官方资料核实”，不能当作 DeepSeek 已经正式提供的功能清单。

---

## 1. 一句话定位

DeepSeek Harness 可以先理解为：

```text
围绕 DeepSeek 模型能力构建的 Agent / Workflow / Tool Runtime，用来把模型封装进可控、可审计、可进入业务流程的执行环境。
```

它的核心价值不应该是“又一个 DeepSeek API 封装”，而应是把 Prompt、上下文、工具、MCP、业务系统、权限、人审、状态、日志、评测和成本治理组织在一起，使 DeepSeek 类模型能够在企业任务流中稳定、安全、可追溯地工作。

---

## 2. 它属于什么产品类型

建议归入：

```text
Agent Runtime / Harness
```

它和现有分类的关系是：

| 类别 | 核心对象 | 典型问题 | DeepSeek Harness 的位置 |
|---|---|---|---|
| Coding Agent | 代码仓、编辑、测试、提交 | Agent 如何完成工程任务 | 如果 DeepSeek Harness 只服务编码任务，才可视为 Coding Agent 周边；但 Harness 概念本身更宽 |
| Agent Learning System | 轨迹、评估、记忆、Skill 蒸馏 | Agent 做过的好经验如何复用 | Harness 负责把任务跑起来、管起来；Learning System 负责从轨迹中学习 |
| Knowledge Base / RAG | 文档、知识切片、Wiki、引用 | Agent 如何检索稳定知识 | 知识库是 Harness 的上下文来源之一 |
| Data Governance Platform | 数据权限、血缘、质量、合规 | Agent 能访问哪些可信数据 | 数据治理是数据控制面，Harness 是任务执行控制面 |
| AI Native Data Platform | 数据基座、本体、语义层 | 数据如何被 AI / Agent 消费 | 数据平台供给语义和数据，Harness 组织任务执行 |
| Agent Workspace | 任务产物和协作界面 | Agent 结果如何沉淀、协作、发布 | Workspace 管结果，Harness 管执行过程 |

最关键的边界是：

```text
DeepSeek 模型提供认知能力；Harness 提供任务执行环境。
```

---

## 3. Harness 要解决的问题

### 3.1 模型能力不等于业务执行能力

DeepSeek 这类模型可以提供推理、代码、语言理解、结构化生成等能力，但企业落地时，难点往往不在“能不能调用模型”，而在：

- 模型是否知道当前业务对象是谁；
- 能否拿到可信的文档、数据、规则和历史状态；
- 能否调用正确工具，而不是胡乱生成建议；
- 能否在权限边界内读写系统；
- 高风险动作是否有人确认；
- 执行过程是否可审计、可复盘、可评测；
- 失败时是否能重试、暂停、恢复或补偿；
- 成本、质量和安全是否能统一治理。

所以，DeepSeek Harness 的产品价值不应停留在“DeepSeek API + Prompt 模板”，而应进入企业级任务运行时。

### 3.2 DeepSeek 类模型需要一层可控运行时

在企业环境里，如果每个部门各自拿 DeepSeek、Claude、OpenAI、Qwen、火山、通义或私有模型的 key 到处接，会很快出现：

- 成本不可控；
- 数据边界不可控；
- 权限不可控；
- 工具调用不可控；
- 日志和审计缺失；
- Prompt、Skill、经验无法复用；
- 结果质量没有回归测试；
- 出问题不知道是哪一个 Agent、哪一次工具调用造成的。

Harness 的价值是把这些分散的临时接入方式收敛到一个可治理的运行环境。

### 3.3 Harness 的核心价值是“把模型放进流程”

一个真正有价值的 Harness 至少要完成三件事：

```text
第一，把模型接进上下文：知识库、文档、本体、业务对象、历史状态。
第二，把模型接进工具：MCP、API、数据库、Workflow、企业系统。
第三，把模型接进治理：权限、人审、审计、评测、成本、失败恢复。
```

只有完成这三件事，模型才会从“回答问题的接口”变成“能进入业务流程的执行者”。

---

## 4. 核心能力拆解

> 以下是对 DeepSeek Harness 这类产品应具备能力的框架性拆解，具体是否已实现需要后续用官方资料核实。

### 4.1 模型接入与多模型路由

DeepSeek Harness 不应只支持单一模型调用，而应支持统一模型抽象层：

- DeepSeek 官方模型；
- 私有化部署或兼容 OpenAI API 的模型服务；
- Claude / OpenAI / Qwen / GLM / 火山等备选模型；
- 按任务类型、成本、延迟、上下文长度和安全级别做模型路由；
- 失败 fallback、重试、限流、预算控制。

如果只能把请求转发给一个模型 endpoint，它更像 API proxy，而不是企业 Harness。

### 4.2 Prompt / Task Protocol 管理

Harness 应该管理任务协议，而不是让用户每次临时写 prompt。

关键能力包括：

- 系统 Prompt 版本管理；
- Skill / Tool 使用说明；
- 输入输出 schema；
- 任务状态字段；
- 成功 / 失败判定标准；
- 禁止动作和安全规则；
- bad case 回放和回归测试。

这和本仓库在 Prompt 与任务协议文档中强调的一点一致：Prompt 不只是文案，而是模型理解任务、边界、工具和结果格式的协议层。

### 4.3 Tool Calling 与 MCP / API 接入

Harness 的关键不是“能不能让模型调用工具”，而是工具调用是否受控。

应重点验证：

- 是否支持 Function Calling / Tool Calling；
- 是否支持 MCP；
- 是否支持企业 API、数据库、搜索、文档、工单系统；
- 工具入参是否 schema validation；
- 工具是否 allowlist；
- 是否禁止 raw SQL、shell exec、任意 HTTP 代理等危险能力；
- 写操作是否需要人审、幂等 key、审计日志和失败补偿。

这对企业场景非常关键：读能力让 AI 理解业务，写能力让 AI 进入业务，但写能力必须被严格治理。

### 4.4 Workflow / Agent 编排

企业任务往往不是单轮问答，而是多步骤任务链。

DeepSeek Harness 如果要成为生产级运行时，应支持：

- 固定 workflow；
- 条件分支；
- 长任务状态；
- 多工具顺序调用；
- 多 Agent 角色协同；
- 人工确认节点；
- 任务暂停、恢复和重试；
- 执行结果写回任务系统或业务系统。

这里要避免两个极端：一端是完全自由的 autonomous agent，容易不可控；另一端是过于僵硬的低代码流程，无法处理真实业务里的变化。更理想的形态是“关键节点可控、局部步骤可由模型弹性处理”。

### 4.5 状态管理与记忆

Harness 应区分三类状态：

| 状态类型 | 例子 | 推荐处理 |
|---|---|---|
| 稳定知识 | SOP、规则、产品说明、菜谱、工艺经验 | Git Markdown / 知识库 / RAG / Wiki |
| 动态业务状态 | 库存、订单、工单、任务进度、反馈、审批 | Postgres / MySQL / 业务系统 / 数仓 |
| Agent 运行状态 | 当前任务计划、工具调用、错误、重试、trace | Harness 自身状态库和日志系统 |

不要把所有东西都塞进向量库或 Wiki。动态状态需要严肃数据库或业务系统承载；知识库适合提供稳定上下文；Harness 负责在任务执行时把它们组合起来。

### 4.6 权限、人审、审批与安全边界

企业 Harness 必须默认把 Agent 当作“可能犯错但很有用的执行者”，而不是默认信任的系统管理员。

关键设计包括：

- 最小权限；
- 工具 allowlist；
- 数据 scope；
- 用户 / 角色 / 场景级权限；
- 高风险动作 human confirmation；
- 敏感字段脱敏；
- 外发内容审查；
- 写操作幂等；
- 操作日志不可篡改；
- 错误消息不泄露密钥、连接串和敏感数据。

如果缺少这些能力，DeepSeek Harness 更适合个人 demo，而不是企业任务闭环。

### 4.7 Trace、日志、评测与成本治理

Harness 需要完整记录：

- 用户任务；
- 组装的上下文；
- 模型选择；
- Prompt 版本；
- 工具调用；
- 工具返回；
- 人工确认；
- 输出结果；
- 错误与重试；
- token 和费用；
- 用户反馈；
- 业务结果。

这些记录不是为了“看日志”，而是为了后续评测、回归、成本优化、权限审计和经验复利。

这也是它和 Agent Beacon 这类 Agent Learning System 可以衔接的地方：Harness 负责产生规范化 trace，Learning System 负责从 trace 中评估和蒸馏高价值经验。

### 4.8 企业系统集成

企业级 Harness 的落点不是一个孤立聊天框，而是连接：

- OA / 飞书 / 企业微信；
- ERP / MES / EAM / PLM / CRM；
- 工单系统；
- 数据库 / 数仓 / BI；
- 知识库 / 文档系统；
- 权限系统 / SSO；
- 日志、告警和审计平台。

没有企业系统集成，Harness 很难真正形成业务闭环。

---

## 5. 与相邻产品的区别

### 5.1 与 Coding Agent 的区别

Coding Agent 的核心任务是理解代码仓、修改代码、运行测试、提交变更。它通常面向软件工程流程。

DeepSeek Harness 如果按运行时理解，覆盖范围更宽：

```text
Coding Agent 是某类任务执行者；Harness 是承载任务执行者的控制环境。
```

一个 Harness 可以运行 Coding Agent，也可以运行客服 Agent、设备维修 Agent、家庭营养师 Agent、数据分析 Agent、运营 Agent。

### 5.2 与 Agent Learning Systems 的区别

Agent Beacon 这类产品关注：

```text
完整会话轨迹 → 质量评估 → 候选记忆 → 人审 → Skill / MCP 复用 → 跨 Agent 迁移
```

DeepSeek Harness 这类运行时关注：

```text
任务输入 → 上下文装配 → 模型选择 → 工具调用 → 权限控制 → 状态推进 → 审计记录
```

两者关系不是替代，而是前后衔接：

```text
Harness 负责把 Agent 跑起来、管起来、接进业务流程。
Learning System 负责观察 Agent 跑过的轨迹，并把高质量流程蒸馏为 reviewed memory 或 Skill。
```

### 5.3 与 WeKnora 的区别

WeKnora 更偏知识库、Wiki、RAG 和 Agent 问答底座。它解决的是已有知识如何上传、切片、索引、检索、引用和问答。

DeepSeek Harness 更偏任务执行运行时。它可以调用 WeKnora 获取稳定知识，也可以通过 MCP 调用独立数据库或业务系统，但它本身的核心价值是组织任务执行过程。

推荐关系是：

```text
WeKnora：稳定知识和知识问答层。
MCP Service：受控工具和动态状态访问层。
Postgres / 数仓 / 业务系统：权威数据和动态状态层。
Harness：把模型、知识、工具、状态和人审组织成任务闭环。
```

### 5.4 与 AI Native Data Platform 的区别

AI Native Data Platform 关注数据如何为 AI / Agent 服务，包括表、文档、本体、知识图谱、向量、特征、模型、评测集和权限等。

Harness 关注任务如何被执行：

```text
AI Native Data Platform 供给可信上下文和数据能力。
Harness 把这些上下文和工具编排进具体业务任务。
```

在成熟企业架构中，两者会互相依赖：没有数据平台，Harness 缺少可信上下文；没有 Harness，数据平台难以直接转化为业务行动。

---

## 6. 可能优势

如果 DeepSeek Harness 能围绕 DeepSeek 模型做深度优化，潜在优势包括：

1. **中文和代码场景友好**：DeepSeek 在中文理解、推理和代码场景中有较高关注度，适合国内企业试点。
2. **成本优势**：如果模型调用成本较低，适合高频内部任务、批处理分析和多轮 Agent 工作流。
3. **私有化和国产生态适配潜力**：如果支持私有化或兼容国内云生态，可能更适合对数据边界敏感的企业。
4. **工程生态可借力**：如果兼容 OpenAI API、MCP、LangChain / LangGraph / Dify / OpenTelemetry 等生态，可以降低接入成本。
5. **任务闭环空间大**：国内企业大量流程仍停留在文档、表格、OA、IM 和人工搬运之间，Harness 有机会成为 AI 进入业务流的统一层。

以上优势都需要官方资料和实测验证。

---

## 7. 主要短板与待验证点

当前最重要的风险是：产品边界不清。

需要继续核实：

1. 是否真的存在官方命名为 `DeepSeek Harness` 的独立产品 / 项目；
2. 它是 DeepSeek 官方发布，还是第三方围绕 DeepSeek 模型做的运行框架；
3. 是否开源；
4. 是否支持 MCP；
5. 是否支持 workflow / multi-agent / 长任务状态；
6. 是否有 UI、管理后台、审计台和评测台；
7. 是否支持 RBAC、SSO、企业权限、数据脱敏；
8. 是否支持私有化部署；
9. 是否有对 DeepSeek 模型的特殊优化，例如推理预算、函数调用稳定性、长上下文、代码任务；
10. 是否能接企业系统、数据库、数仓、知识库和文档系统；
11. 是否有公开 benchmark、客户案例、价格体系和部署文档；
12. 是否只是 demo / SDK / Prompt 模板，而非生产级 Harness。

如果最终发现它只是简单 API 封装，就不应高估其产品价值。

---

## 8. 对 AI Native 任务闭环平台的启发

本仓库对 AI Native 任务闭环平台的核心判断是：

```text
经营结果 → 经营对象 → 任务拆解 → 人机协同 → 执行留痕 → 结果归因 → 反馈学习 → 组织激励
```

在这条链路中，DeepSeek Harness 这类产品应该承担“执行控制面”的角色，而不是停留在模型网关。

它需要把以下能力组合起来：

| 任务闭环环节 | Harness 应承担的能力 |
|---|---|
| 经营对象 | 识别设备、订单、客户、库存、菜谱、工单等业务对象 |
| 任务拆解 | 把目标拆成可执行步骤、工具调用和人工确认节点 |
| 人机协同 | 区分自动执行、建议、人审、审批、复核 |
| 执行留痕 | 记录 prompt、上下文、工具调用、输入输出、审批与失败 |
| 结果归因 | 关联任务结果、业务指标、价值证据和责任主体 |
| 反馈学习 | 把用户反馈、bad case、高质量流程沉淀为规则或 Skill |
| 组织激励 | 为知识贡献、流程优化和 AI 使用效果提供证据 |

如果 Harness 做得足够好，它可以避免企业为每条业务流重复造一套“AI 管理系统”，而是把共性能力沉淀为横向平台。

---

## 9. 对家庭营养师 Agent 的启发

家庭营养师项目虽然规模小，但同样需要 Harness 思路。

当前架构可以对应为：

| Harness 能力 | 家庭营养师项目中的落点 |
|---|---|
| 稳定知识上下文 | Git Markdown + WeKnora 知识库 |
| 动态状态 | 独立 Docker Postgres |
| 受控工具 | Family Nutrition MCP Service |
| 任务协议 | prompts / skills / agent-rules |
| 人审确认 | 长期偏好变更、健康约束变更、重要库存修正 |
| 审计 | 推荐、反馈、库存扣减、偏好更新日志 |
| 权限边界 | MCP allowlist，不暴露 raw SQL |
| 失败恢复 | 工具错误返回友好信息，不泄露 DB URL / token |

这说明：即使是家庭 Agent，也不能只靠知识库和聊天框。真正可长期运行的 Agent，需要明确的状态层、工具边界、确认机制和审计记录。

---

## 10. 对连山产品的启发

连山如果要做工业 AI / 工业 Agent 平台，可以把 Harness 作为一个关键产品层。

更具体的产品形态可以是：

```text
工业 Agent Runtime / 工业任务闭环 Harness
```

它不是替代 ERP、MES、EAM、PLM、QMS、数仓和 BI，而是位于这些系统之上：

```text
传统系统：记录权威数据、承载原有流程、执行正式动作。
数据治理 / 语义层：统一指标、对象、本体、权限、血缘和质量。
工业 Harness：装配上下文、调用工具、推进任务、记录过程、触发人审。
场景工作台：设备维修、质量诊断、工艺优化、异常复盘等薄应用。
```

工业场景尤其需要 Harness，因为它天然存在：

- 多系统数据分散；
- 现场动作风险高；
- 专家经验难沉淀；
- 故障和质量问题需要过程追溯；
- ROI 需要价值归因；
- AI 建议需要人审和证据链。

因此，连山可以借鉴 DeepSeek Harness 这类方向，但不要把自己做成通用模型壳。更有壁垒的方向是：

```text
工业业务对象语义层 + 受控工具层 + 任务状态层 + 人审审计层 + 反馈学习层 + 价值归因层
```

---

## 11. 后续实测清单

拿到 DeepSeek Harness 官方链接、仓库或演示环境后，应按以下顺序验证：

1. **产品身份**：官方 / 第三方 / 开源 / 商业产品 / demo。
2. **安装部署**：本地、云端、私有化、Docker、K8s、依赖项。
3. **模型接入**：DeepSeek API、OpenAI-compatible API、多模型 fallback、限流和成本统计。
4. **工具接入**：Function Calling、MCP、HTTP API、数据库、文件系统、企业连接器。
5. **权限控制**：工具 allowlist、RBAC、SSO、审批、敏感动作确认。
6. **状态管理**：长任务、workflow、暂停恢复、失败重试、幂等和补偿。
7. **日志审计**：trace 粒度、prompt / tool / output 记录、脱敏、导出、留存策略。
8. **评测能力**：测试集、回放、评分、bad case 管理、回归测试。
9. **安全边界**：secret 管理、外发控制、任意代码执行风险、数据泄露风险。
10. **生态兼容**：MCP、LangGraph、Dify、OpenTelemetry、企业 IM / OA / 数据平台。
11. **典型场景**：编码任务、知识问答、数据分析、工单处理、工业诊断、家庭 Agent。
12. **替代关系**：它到底替代 API 网关、Agent 框架、Workflow 平台、还是企业任务闭环平台的一部分。

---

## 12. 初步结论

在没有官方资料前，DeepSeek Harness 最稳妥的分析方式不是把它当作已经成熟的产品，而是把它放进 Agent Runtime / Harness 这个产品类型里，作为“DeepSeek 模型如何进入业务流程”的候选方案来观察。

关键判断是：

```text
模型只是能力源，Harness 才是业务执行环境。
```

如果 DeepSeek Harness 能做到工具接入、权限控制、状态管理、审计、评测和企业系统集成，它就可能成为 AI Native 任务闭环平台中的执行控制层；如果它只是 API 封装、Prompt 模板或 demo，则更适合作为开发工具，而不是企业级平台底座。
