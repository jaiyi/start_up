# 产品调研：Palantir Ontology（本体接口细节与可借鉴点）

> 调研日期：2026-10-10
> 调研对象：Palantir Foundry Ontology（闭源商业产品，官方文档 palantir.com/docs 的 Ontology building 总览页）
> 资料来源：官方文档 Overview 页全文 + 完整文档目录（TOC，约 300+ 条目）。**局限声明**：① 当前会话网络抓取受限，interfaces / action types / functions / MDO 等细节页未读取，本文的"细节"来自总览页 + TOC 结构反推 + 训练知识（已标注置信度）；② 用户随请求附的界面截图**当前模型无法查看**（无图片输入），若截图里有总览页未覆盖的关键接口细节，请以文字描述或换用支持图片的模型补充。
> 分类：ai-native-data-platforms（本体/语义层平台）

---

## 1. 一句话定位

**Palantir Ontology 是架在数据资产之上的"组织数字孪生"层**：把 dataset/虚拟表/模型映射成语义元素（objects/properties/links）和动能元素（action types/functions/dynamic security），让上层应用（Workshop/Object Explorer/Quiver）直接操作"现实世界的对应物"而不是操作表。**语义层回答"是什么"，动能层回答"怎么改"，两层合起来才是可运营的业务操作系统。**

## 2. 核心概念拆解

### 2.1 语义 + 动能的双层定义（总览页原文结构）

- **语义元素**：object types / link types / properties——把数据源映射为业务对象（设备、工单、订单）及其关系，"far beyond data cataloging"，每个字段带丰富元数据 + 细粒度安全 + 变更治理；
- **动能元素**：**action types**（从操作员捕获数据、编排连接既有系统的决策流程）+ **functions**（编写任意复杂度的业务逻辑）+ **dynamic security**（安全作为本体的一部分而非外挂）。

这个二分法是 Palantir 全部叙事的地基：**只有语义层 = 又一个数据目录；加上动能层才是运营系统。**

### 2.2 Interfaces：对象类型多态（本次调研的重点接口）

- interface 描述一个 object type 的**形状与能力**（shape + capabilities），实现该 interface 的多个 object type 可被一致地建模与交互——即本体层的多态；
- TOC 显示的能力面：Create / Implement / Edit definition / Edit implementation / **Interface link types** / **Interface action type constraints**（接口级约束哪些 action 可作用于实现类）/ Extend an interface / Metadata reference；
- 官方还有成体系的 **Ontology design: Best practices / Structural guidance / Anti-patterns / Validation** 四篇——接口怎么设计是有反模式清单的。

**借鉴点**：spc_dsh 的 business_object 槽位（Q22 平台/剖面分层）正需要这个——"报警/工单/设备"在不同 profile 下字段不同但形状一致，interface + 实现类的关系比"每 profile 独立定义"更能支撑跨 profile 的通用应用层。

### 2.3 Action types：写路径的一等公民（TOC 反推，置信度中）

目录暴露的完整生命周期远超"一个表单"：

- **Rules / Parameters**（参数默认值、下拉过滤、参数配置覆盖、性能考量）；
- **Submission criteria**（提交门槛——谁可以提交）；
- **Batched execution / Side effects / Notifications / Webhooks / Trigger schedule**（动作不是孤立写，带副作用编排与出站通知）；
- **Undo or revert**（动作可撤销）；
- **Permissions: Read and write authorizations / Consistency and isolation**（写路径的并发一致性）；
- **Actions on interfaces / Actions on structs**（动作与接口/结构体组合）；
- **Branching action types**（动作类型也有分支开发流！）；
- **Action metrics / Action log**（动作级度量与审计日志）。

**这是一份"写路径检查清单"**——spc_dsh 的关单动作、状态流转动作逐项对照即可发现缺项（我们目前明确有的：提交门槛≈gate、审计≈event 流；明确缺的：undo/revert、参数化表单的过滤与安全、批量执行）。

### 2.4 Functions：受治理的业务逻辑（TOC 反推，置信度中）

- 多语言（TS v1/v2/Python）+ VS Code 内导航 + **Function versioning / Version range dependencies**（版本区间依赖！）；
- **Staged writes / Ontology edits**——函数内的本体修改是**分阶段写入**，不是裸写；
- **Streaming functions / User-facing errors / Instrumentation and telemetry**；
- **Language models in functions**——LLM 可以在受治理的函数里被调用；
- 单元测试成体系（stub objects / mock users / mock dates）。

**借鉴点**：诊断算子（Q18 算子库）对应的就是 function-backed 能力——**版本区间依赖 + staged writes + 函数内可用 LLM** 三件套是我们算子治理 roadmap 的现成模板。

### 2.5 变更治理与分支（TOC 反推，置信度高——目录级证据）

- **Branching the ontology**：本体整体可分支（Review ontology proposals / Ontology branches），action types、functions、object views 都各自有 "Branching X" 条目——**分支-提案-评审是全类型的统一模式**；
- Ontology Manager 的 **Review and restore changes / Export, edit, and import an Ontology / Ontology cleanup**；
- **Migrating between ontologies** + [Legacy] Shared ontologies——本体本身有迁移与代际问题。

这与 Lattice 反推文档的"Pack YAML 分支-评审-发布"、与我们自己的发布管线（05 §发布流水线）是**同一治理范式的三个独立实例**。

### 2.6 安全与对象层权限（TOC 反推，置信度中）

- **Object permissioning / Object security policies / Managing object security**——权限下到对象级；
- **Configuring restricted-view-backed object types / MDO（multi-datasource object types）**——一个对象类型跨多个数据源、每源可配受限视图；
- **Value type permissions / Function permissions / Action 权限**——语义/动能/值类型三层各有权限面；
- Q22（读侧权限 known-open）的直接参照：Palantir 把权限做成本体内生属性（dynamic security），而非应用层过滤器。

### 2.7 时间与图（TOC 反推，置信度中）

**可借鉴边界**：上述对象、关系、action type、function、interface、权限、分支和审计能力与官方 Ontology 文档目录/Overview 的结构一致；但本节没有读取每个细节页，不能把 TOC 中的条目直接当作已验证的 API 字段或传输协议。

## 2.8 用户提供的 AIP 十二层参考架构

用户补充的 AIP 参考材料把 Ontology 放回更大的 Agent 平台，而不是把 Ontology 当成孤立的图谱。以下内容作为**用户提供的白皮书/架构参考**记录；其中具体网关、协议和部署实现仍需以 Palantir 官方产品文档或实际租户验证为准。

| 层 | 能力 | 与 Ontology 的关系 |
|---|---|---|
| 1. Secure LLM Integration & Access | 统一接入托管/私有模型、零数据保留边界、OpenAI-compatible Chat Completions、PII scrub | Ontology 提供受治理上下文，LLM gateway 控制模型出入口 |
| 2. End-to-End Observability | reasoning/tool call/token/物理读写追踪、OpenTelemetry、Global Trace ID、Prometheus/Jaeger、熔断 | 把对象查询、Function、Action 和外部副作用串入同一 trace |
| 3. Context Engineering | 批数据、流数据、图语义、ERP/CRM/Kafka、RAG/vector、gRPC streaming | 将物理数据编译成对象、关系、状态和模型可消费上下文 |
| 4. Ontology System：Semantic & Kinetic | objects、properties、links、时序/动态行为、digital twins | Ontology Core：语义对象 + 动能状态 + 业务状态机 |
| 5. Vector、Compute & Tool Services | 向量检索、分布式计算、OSDK、类型化 Logic、Action | 将本体定义和业务逻辑变成有限、可授权的工具 |
| 6. Security & Governance | RBAC、marking、purpose-based access、动态 token、每次函数/OSDK 调用鉴权 | 权限不只在 UI 或数据库过滤，而是进入对象/函数/Action 语义 |
| 7. Agent Lifecycle & Orchestration | Agent 注册、协作、state、memory、planning、AIP Logic/Chatbot Studio、JSON-RPC/SSE 状态流 | Agent 通过本体对象和受控动作执行，而非直接碰物理库 |
| 8. Operational Automation | 事件/定时/Webhook/Cron 触发，自动工作流，调用 ERP/生产 Action | 将 Ontology 的 Action 接到业务事件和运营流程 |
| 9. Development Environments | 低代码 Function editor、AIP Evals、调试、量化评测、MCP、Cursor/VS Code | 开发和评测工具围绕本体、函数、动作和 Agent 资产工作 |
| 10. Human + AI Applications | Workshop、自定义前端、人审批准、高风险 checkpoint、WebSocket/REST | 人在 Ontology Action 的关键写路径上保留决策权 |
| 11. Application Packaging & Marketplace | 不可变 solution bundle、Agent/Ontology/action-rule 打包、Apollo/CD | 让语义模型、动作、Agent 和应用一起发布、复用、回滚 |
| 12. Enterprise Automation Symphony | 跨部门 multi-agent、事件 mesh、CloudEvents-style pub/sub、全局指标 | 把局部对象动作编排成供应链、财务、生产等跨域协同 |

### 2.9 Ontology Core 的三种价值

用户材料将 Ontology Core 概括为三部分：

1. **Semantic**：对象、属性、链接，把物理数据翻译成 Agent 可理解的业务实体；
2. **Kinetic**：高频、时序和动态行为，使对象不是静态主数据，而是带运行状态的数字孪生；
3. **Dynamic**：业务状态机、规则和动作，使系统能表达“当前能做什么、谁能做、做完会发生什么”。

这三层共同形成 Human + AI Decision Model：物理世界 → 语义对象 → Agent 推理/工具调用 → 类型化 Action → 人审或受控执行 → 新状态与审计事件。其关键不是“让 LLM 读懂更多表”，而是让 LLM 只能在经过语义和权限裁剪的对象世界里行动。

### 2.10 Data–Logic–Action 统一模型

值得借鉴的接口思想不是单独做一个“数据库 API”：

- **Data** 暴露对象、属性、关系、历史和来源；
- **Logic** 暴露可复用的业务计算、校验和决策函数；
- **Action** 暴露原子、事务化、可审计、经过权限检查的写入或外部系统副作用。

因此 Agent 不直接获得任意 SQL、HTTP 或数据库凭据，而是调用有限的语义工具。OSDK（用户材料中以 TypeScript/Python 为例）把这些对象、Logic 和 Action 变成强类型代码；MCP 可作为面向通用 Agent 的协议适配层，但不能替代后端的权限、事务和领域校验。

### 2.11 安全与可观测性的横切面

十二层不是线性瀑布，而是两条贯穿能力：

- **Zero-trust security**：模型、Agent、用户、OSDK、Function、Action、事件和外部连接器都要在每次边界上重新验证身份、目的、对象范围和写权限；
- **Traceable execution**：从用户请求、上下文版本、检索结果、模型调用、工具参数、审批、物理读写到最终 Action 结果，都要共享 trace/correlation ID。

对 DSH 来说，诊断结论的 EVI 不应只是文件链接，而应成为“数据快照 + 本体对象 + 算子/模型版本 + 工具调用 + 人审 + Action/mutation”的可追踪执行链。

### 2.12 现代替代与组合关系

用户材料指出，集中式 Ontology 并非唯一方案，适合采用组合架构：

| Palantir 风格能力 | 可组合的现代替代 | 不应丢失的约束 |
|---|---|---|
| Ontology Core | GraphRAG + vector retrieval + 业务对象注册表 | 对象身份、关系、来源、有效期和权限 |
| 私有 OSDK | MCP + 类型化 SDK + schema registry | Action 仍须后端授权、事务和审计 |
| 确定性 workflow | workflow engine + runtime reflection + adaptive tool use | 高风险写入保留审批、预算、幂等和回滚 |
| 内置语义上下文 | 结构化 context compiler + 检索策略 | 记录上下文版本、过滤条件和证据引用 |

结论不是用 MCP 取代 Ontology，也不是用 GraphRAG 复制 Ontology，而是把**强语义和强写路径**留给核心领域，把**开放协议和自适应检索**用于扩展 Agent 生态。

## 2.13 面向 SPC/DSH 的映射

| AIP/Ontology 概念 | SPC/DSH 对应物 | 当前差距 |
|---|---|---|
| Object / Link | 设备、测点、工单、故障模式、证据、关系 | 需统一 object identity、来源和有效期 |
| Kinetic data | 时序、告警、事件、运行状态 | 需与对象快照和调查窗口绑定 |
| Dynamic state machine | 工单状态、诊断图节点状态、五个人工门 | 需将状态转移约束、权限和补偿动作类型化 |
| Function / Logic | 诊断算子、数据充分性检查、影响分析 | 需版本区间依赖、staged writes、测试与预算 |
| Action | 派单、状态变更、关单、Pack 发布、通知 | 需 undo/revert、幂等、审批和外部副作用审计 |
| Ontology branch | Pack/profile 分支、调查草稿、提案 | 需统一 proposal、review、publish、rollback |
| Object security | 工厂/profile/岗位/工单/数据源权限 | 读侧和 Agent 工具权限需对象级 fail-closed |
| AIP Evals / Trace | 诊断回放、EVI、专家确认、成本/质量评测 | 需形成回归集和跨模型比较协议 |

---

## 3. 与相邻产品的差异

| 维度 | Palantir Ontology | 开源本体工具（OWL/知识图谱） | Lattice | spc_dsh |
|---|---|---|---|---|
| 层次 | 语义+动能+安全+应用全栈 | 多止于语义层 | 语义薄、调查过程厚 | 语义中（business_object）、过程厚 |
| 写路径 | action types 全生命周期 | 弱 | 闭环 diff+门 | 五门+事件流 |
| 变更治理 | **本体整体可分支** | 版本管理外挂 | Pack YAML 分支 | 发布管线 |
| 多态 | **interfaces** | OWL class 继承 | 无 | profile 变体（未系统化） |

## 4. 优势

1. 语义/动能二分 + 接口多态 + 对象级安全，是"业务操作系统"最完整的公开概念框架；
2. 全类型统一的分支-提案-评审变更治理，模式一致性极高；
3. 文档体系本身就是产品力（Best practices/Anti-patterns/Validation 成套发布）。

## 5. 短板 / 未验证点

1. **细节页未读取**（网络受限）——action/functions/interfaces 的页面级细节只能从 TOC 反推，已标置信度；
2. **用户截图未能查看**——若截图含关键接口（很可能是 Ontology Manager 或 interfaces 编辑界面），其内容不在本文内；
3. 闭源商业产品，无自托管可能；定价与企业门槛使直接试用不可行；
4. 概念密度极高（Phonograph/MDO/OSv1-OSv2 等内部代际），学习曲线陡峭。

## 6. 适用场景

大型组织的数据-业务对齐层、需要对象级安全与审计的运营应用底座。

## 7. 对我们当前项目的启发（重点）

1. **语义+动能二分法给 spc_dsh 定位校准**：我们常说"工作台"，Palantir 的问法是"你的本体有动能层吗"——我们的 action = 工单状态流转/关单动作，已具备雏形；**缺的是 submission criteria / undo / 批量 / 副作用编排**这组写路径配套，可作为工作单动作的检查清单补全；
2. **interfaces 直接回答 Q22 的 business_object 跨 profile 问题**：平台层定义 interface（形状+能力+action 约束），各 profile 实现之——比"每 profile 自带一套对象"更利于通用应用层（工作台 UI 只认 interface）；
3. **action type 级 undo/revert**：关单等高影响动作的撤销路径是当前设计的空白——事件流天然支持补偿事件，实现成本可控；
4. **函数的 version range dependencies**：算子库（Q18）的依赖声明直接借用"版本区间"而非钉死单版本，兼容多 Pack 共存；
5. **staged writes**：诊断会话的本体修改（图节点/状态）应走"暂存-校验-提交"三段，与 Lattice 的 diff-门-写回同一原则第三次出现；
6. **dynamic security 的理念**（权限内生于本体而非应用层过滤）是 Q22 读侧权限的长期方向——短期做不到对象级，但 schema 设计不要与它对撞。

## 8. 后续需要实测的问题

1. interfaces 的 metadata reference 具体字段（需读取细节页或用户提供截图描述）；
2. MDO 的受限视图在权限判定上的实际语义（row/column 级如何组合）；
3. action 的 consistency & isolation 页面内容（并发写冲突的处理模式）；
4. 用户截图中想让我重点看的"接口细节"具体是什么——请文字描述后我补进本文。
