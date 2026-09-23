# Databricks Governance Hub 产品功能调研

## 0. 调研边界说明

本次调研对象是 **Databricks Governance Hub** 及其背后的 Databricks 数据 / AI 治理体系。

由于当前会话的外部官网查询被权限策略拦截，本文基于：

- 已知的 Databricks Lakehouse / Data Intelligence Platform 架构；
- Unity Catalog、Delta Sharing、Lakehouse Monitoring、MLflow / Mosaic AI 等公开产品体系常识；
- “Governance Hub”这一产品命名所指向的治理入口形态；
- 我们当前产品分析体系中的 Agent、知识库、数据闭环需求。

因此本文会把以下内容分开：

```text
确定性较高：Databricks 数据治理能力的底层组成，如 Unity Catalog、权限、血缘、审计、共享、模型治理等。
需要官方页面复核：Governance Hub 当前 UI 内具体卡片、指标、导航名称、套餐限制、发布时间和最新功能边界。
```

后续如果拿到 Databricks 官方 Governance Hub 页面或产品截图，建议再做一次精确校订。

---

## 1. 一句话定位

Databricks Governance Hub 更像 Databricks 数据智能平台上的 **统一治理工作台 / 治理运营入口**。

它不是一个独立替代 Unity Catalog 的底层权限系统，而更可能是把 Unity Catalog、数据目录、权限、血缘、质量、审计、共享、AI/ML 资产治理等能力集中展示和操作的治理中心。

可以这样理解：

```text
Unity Catalog 是 Databricks 的数据与 AI 资产治理控制平面；
Governance Hub 是面向数据管理员、治理团队、平台团队的治理运营入口；
Lakehouse / Warehouse / ML / AI / Agent 是被治理的生产与消费场景。
```

---

## 2. 产品背景

Databricks 的核心定位已经从早期 Spark / 数据湖平台，演进为：

```text
Lakehouse Platform
→ Data Intelligence Platform
→ 数据、AI、BI、ML、Agent 应用统一平台
```

当企业把更多数据、模型和 AI 应用放到 Databricks 上，治理问题会变得非常关键：

- 数据资产越来越多：表、视图、文件、流、特征、模型、函数、Notebook、Dashboard；
- 使用角色越来越复杂：数据工程、分析师、数据科学家、业务用户、Agent、应用服务；
- 数据边界越来越敏感：PII、财务、医疗、客户、生产、商业机密；
- AI 使用数据的方式越来越不透明：LLM、RAG、Agent、自动生成 SQL、自动调用工具；
- 合规要求越来越强：审计、访问记录、数据血缘、质量证明、权限证明。

Governance Hub 这类入口的价值就在于：

```text
把分散在数据目录、权限、血缘、质量、审计、共享、模型治理里的能力，
收束成治理团队可以日常运营的一张工作台。
```

---

## 3. 核心能力地图

可以把 Databricks Governance Hub 放在下面这张图里：

```text
业务用户 / 分析师 / 数据工程师 / 数据科学家 / AI Agent
        │
        ▼
Databricks Workspace / SQL / Notebook / Jobs / Pipelines / Model Serving / AI Apps
        │
        ▼
Governance Hub
        │
        ├── 数据资产目录：catalog / schema / table / view / volume / function / model
        ├── 权限治理：RBAC / grants / row filter / column mask / policy
        ├── 数据发现：search / metadata / tags / comments / ownership / certification
        ├── 血缘追踪：table lineage / column lineage / job lineage / notebook lineage
        ├── 质量监控：freshness / anomalies / constraints / expectations / monitoring
        ├── 审计合规：audit logs / access records / policy changes / compliance evidence
        ├── 数据共享：Delta Sharing / clean rooms / marketplace / external sharing
        ├── AI 治理：models / features / functions / vector indexes / AI app access
        └── 运营洞察：治理覆盖率、未分类资产、敏感数据、异常访问、风险项
        │
        ▼
Unity Catalog + Lakehouse Storage + Warehouses + ML / AI Assets
```

其中底层最核心的能力是 **Unity Catalog**。

---

## 4. 核心能力拆解

### 4.1 统一资产目录

Databricks 的治理基础是把数据与 AI 资产纳入统一 namespace。

典型层级是：

```text
metastore
└── catalog
    └── schema
        ├── table / view
        ├── volume
        ├── function
        ├── model
        └── other governed assets
```

Governance Hub 的价值是让治理人员快速看到：

- 有哪些 catalog / schema / table；
- 谁是 owner；
- 哪些资产有说明、标签、分类；
- 哪些资产缺少 owner 或 metadata；
- 哪些资产被频繁访问；
- 哪些资产可能存在敏感字段；
- 哪些数据集适合作为 certified / trusted dataset。

这和传统“数据目录”类似，但更紧密绑定 Databricks 的运行时、权限和血缘。

### 4.2 权限与访问控制

Databricks 治理体系的关键是 Unity Catalog 权限模型。

通常会覆盖：

- catalog / schema / table / view 级权限；
- column / row 级访问控制；
- dynamic views；
- row filters；
- column masks；
- function / model / volume 等对象权限；
- service principal / group / user 权限；
- workspace 与 metastore 绑定；
- external location / storage credential 权限。

治理入口应重点帮助回答：

```text
谁可以访问哪些数据？
这个权限从哪里继承？
哪些数据暴露过大？
敏感字段有没有被 mask？
Agent / 应用服务账号是否只拿到最小权限？
```

对 Agent 时代特别重要的是：

```text
Agent 不应该绕过治理平台直接拿数据库 owner 权限。
```

Agent 应通过 SQL Warehouse、API、MCP 或受控工具访问数据，并继承 Unity Catalog 的权限、审计和策略。

### 4.3 数据发现与业务语义

Governance Hub 很可能承担数据发现入口作用。

典型功能包括：

- 搜索表、视图、模型、函数；
- 查看 description、comment、owner、tags；
- 标识认证数据集或推荐资产；
- 浏览字段含义；
- 查看数据示例和使用频率；
- 识别重复、无人维护、缺少说明的数据资产。

这解决的问题是：

```text
企业不是没有数据，而是不知道哪些数据可信、该用哪个表、指标口径是什么。
```

对于 AI / Agent，数据发现尤其重要：

- Agent 自动生成 SQL 前，需要知道哪些表可信；
- RAG / BI / Agent 需要使用被治理过的数据集；
- 业务术语和字段说明能降低 hallucination；
- owner 和 lineage 能帮助解释结果。

### 4.4 血缘追踪

Databricks 的数据血缘能力通常围绕 Unity Catalog 记录：

- 表到表的 lineage；
- column-level lineage；
- notebook / job / pipeline 对数据的读写；
- dashboard / query 对数据的依赖；
- 模型训练数据与特征来源。

Governance Hub 应该把这些血缘从“开发者调试工具”变成“治理运营视图”。

核心问题：

```text
一个报表数值来自哪些上游表？
一个模型用了哪些训练数据？
某张敏感表被哪些下游任务消费？
如果一个字段口径变了，会影响哪些 dashboard / job / model？
```

Agent 时代还会新增一个问题：

```text
Agent 给出的结论用了哪些数据、模型、工具和中间结果？
```

这就是数据血缘向“AI 结论血缘 / Agent action lineage”扩展的方向。

### 4.5 数据质量与监控

数据治理不能只管权限，还要管数据是否可信。

Databricks 体系里，数据质量可能和以下能力相关：

- Delta Live Tables expectations；
- Lakehouse Monitoring；
- freshness / completeness / drift / anomaly；
- schema changes；
- pipeline failure；
- quality rules；
- 数据分布变化；
- 模型输入特征漂移。

Governance Hub 如果做得完整，应该能让治理团队看到：

```text
哪些关键数据资产质量异常？
哪些表长期无人更新？
哪些字段突然分布变化？
哪些 pipeline failure 影响下游模型或报表？
```

这对 Agent 很关键：如果 Agent 查询的是过期或异常数据，回答再流畅也不可信。

### 4.6 审计与合规

数据治理平台必须回答：

- 谁访问了什么？
- 什么时候访问？
- 通过什么方式访问？
- 是否下载 / 导出 / 共享？
- 权限是谁授予或修改的？
- 是否访问了敏感字段？
- 是否符合合规要求？

Databricks 一般通过 audit logs、system tables、account console、云平台日志等方式提供审计能力。

Governance Hub 的产品价值在于把这些底层日志变成治理人员可用的视图：

```text
风险资产列表
异常访问提示
敏感数据访问记录
权限变更记录
共享对象列表
治理覆盖率
```

### 4.7 数据共享与协作

Databricks 有 Delta Sharing、Marketplace、Clean Rooms 等相关能力。

这些能力和 Governance Hub 的关系是：

```text
治理不是只管内部访问，也要管数据如何被跨团队、跨组织、跨云共享。
```

典型问题：

- 哪些数据正在对外共享？
- 哪些 recipient 有访问权？
- 数据共享是否脱敏？
- 共享数据是否有 lineage 和 audit？
- clean room 中的数据协作是否保留隐私边界？

### 4.8 AI / ML 资产治理

Databricks 的治理范围正在从数据扩展到 AI 资产。

典型对象包括：

- ML model；
- model registry；
- feature table；
- function；
- vector index；
- model serving endpoint；
- AI application；
- notebook / job / workflow；
- possibly Agent / tool / prompt artifact。

这个方向非常重要，因为企业 AI 治理不能只看“数据表权限”，还要看：

```text
模型用了什么数据训练？
谁可以调用模型？
模型输出是否被监控？
向量索引用了哪些源文档？
Agent 调用了哪些函数或工具？
生成结果是否有来源和审计？
```

如果 Governance Hub 能把数据、模型、特征、AI app 放在同一治理视图里，它会比传统数据目录更适合 AI 时代。

---

## 5. Governance Hub 与 Unity Catalog 的关系

一个容易混淆的问题是：

```text
Governance Hub 和 Unity Catalog 是什么关系？
```

我的判断是：

```text
Unity Catalog 是治理控制平面；
Governance Hub 是治理体验层 / 运营入口。
```

可以类比：

| 层级 | Databricks 组件 | 作用 |
|---|---|---|
| 存储与计算 | Delta Lake、Cloud Object Storage、SQL Warehouse、Spark、Jobs | 存数据、跑计算、执行查询和任务 |
| 治理控制面 | Unity Catalog | 定义对象、权限、血缘、访问、共享、审计边界 |
| 治理体验层 | Governance Hub | 给管理员 / steward 展示治理状态、风险、动作入口 |
| 消费与应用层 | Notebook、Dashboard、BI、ML、AI Agent、Apps | 使用数据和模型产生业务价值 |

所以，Governance Hub 的核心价值不是新建另一套治理系统，而是让 Unity Catalog 的能力更可见、更可运营。

---

## 6. 与 WorkBuddy / WeKnora / Beacon 的关系

### 6.1 与 WorkBuddy 资料库

WorkBuddy 资料库更像：

```text
AI 原生资料库 / Agent 产物沉淀层
```

Governance Hub 更像：

```text
企业数据与 AI 资产治理控制台
```

区别：

| 维度 | WorkBuddy 资料库 | Databricks Governance Hub |
|---|---|---|
| 管理对象 | 文档、表格、HTML、Agent 产物 | 数据表、视图、文件、模型、函数、权限、血缘、质量 |
| 核心用户 | 业务用户、AI 办公用户、团队协作者 | 数据平台团队、数据治理团队、数据工程、合规、安全 |
| 数据库 / 数仓能力 | 更适合通过 API / MCP / 连接器间接访问 | 本身就在湖仓 / 数仓治理核心位置 |
| 强项 | 产物沉淀、轻协作、发布 | 权限、血缘、审计、质量、共享、AI 资产治理 |

### 6.2 与 WeKnora

WeKnora 更像：

```text
知识库 / Wiki / RAG / Agent 问答底座
```

Governance Hub 更像：

```text
结构化数据与 AI 资产治理底座
```

区别：

| 维度 | WeKnora | Databricks Governance Hub |
|---|---|---|
| 核心资产 | 文档、知识库、Wiki、检索结果 | 表、视图、文件、模型、函数、血缘、权限 |
| 核心能力 | 文档索引、问答、引用、Agent 工具 | 数据治理、访问控制、审计、质量、共享 |
| 动态状态 | 不适合作为业务状态 source of truth | 可治理湖仓中的生产数据，但不等于业务应用数据库 |
| Agent 关系 | Agent 查知识、调 MCP | Agent 查数据时复用权限、审计、质量和血缘 |

### 6.3 与 Agent Beacon

Beacon 关注：

```text
Agent 的运行轨迹、行为审计、经验记忆、Skill 复用。
```

Governance Hub 关注：

```text
数据和 AI 资产的治理、访问控制、血缘、质量、合规。
```

二者可以互补：

```text
Governance Hub：Agent 访问了哪些数据、这些数据是否可信、权限是否合规。
Beacon：Agent 如何运行、调用了哪些工具、执行过程是否安全、经验是否可复用。
```

在企业 Agent 平台里，二者分别回答：

```text
Governance Hub：Agent 能用哪些数据？数据从哪里来？谁授权？是否合规？
Beacon：Agent 做了什么？过程是否安全？哪些经验值得复用？
```

---

## 7. 优势

### 7.1 治理对象覆盖广

Databricks 的优势在于数据、AI、BI、ML 都在同一平台内运行。

因此治理不只是“表权限”，而可以扩展到：

- 数据表；
- 文件与 volume；
- SQL warehouse；
- Notebook / Job / Pipeline；
- Model / Feature；
- Dashboard；
- 外部共享；
- AI app / Agent 工具。

### 7.2 和计算执行层天然贴近

很多独立数据目录产品只能“登记元数据”，但 Databricks 同时掌握计算执行、查询、任务、Notebook、Pipeline 和模型训练过程。

这使它更容易获得真实血缘和审计：

```text
不是人工填出来的 lineage，
而是从实际 query / job / pipeline / model workflow 中产生的 lineage。
```

### 7.3 对 AI Agent 数据访问有天然价值

当 Agent 能自动生成 SQL、调用函数、查询向量索引、生成 dashboard 时，必须复用现有数据权限与审计。

Databricks 的优势是：

```text
Agent 不需要自己实现一套数据权限系统，
而是可以站在 Unity Catalog 这类治理控制面上。
```

### 7.4 企业级生态强

Databricks 面向企业数据平台，通常更容易对接：

- IAM / SSO / SCIM；
- cloud object storage；
- BI 工具；
- data sharing；
- MLOps；
- audit logs；
- SIEM / compliance pipeline；
- Terraform / API 自动化。

这使 Governance Hub 更适合大中型企业的数据治理场景。

---

## 8. 短板与待验证点

### 8.1 Governance Hub 是否是“入口”还是“完整产品”需官方复核

当前需要确认：

- Governance Hub 是 Databricks workspace 内一个新页面 / hub，还是独立 SKU？
- 是否只汇总 Unity Catalog 状态，还是包含主动推荐治理动作？
- 是否支持治理任务分派、审批流、issue tracking？
- 是否支持跨 workspace / account 统一视图？
- 是否有 AI 自动生成数据说明、标签、质量规则或策略建议？

### 8.2 对非 Databricks 数据源的治理深度

Databricks 可以通过 federation、external location、Delta Sharing、external table 等方式连接外部数据。

但需要验证：

```text
Governance Hub 对外部数据库、传统数仓、SaaS 数据源的治理深度，
是否和 Databricks-native 资产一样完整？
```

典型问题：

- 外部 Postgres / MySQL / Snowflake / BigQuery 表是否有完整血缘？
- 外部系统权限是否能被统一 enforcement，还是只能 metadata 级展示？
- 审计是否覆盖真实底层访问？

### 8.3 成本与复杂度较高

Databricks 治理体系适合数据平台级建设，但对小团队可能过重。

需要投入：

- 数据建模；
- catalog / schema 规划；
- 权限组设计；
- metadata 管理；
- 数据质量规则；
- lineage 校验；
- audit 与合规流程；
- 云资源与平台运维。

这不是一个“轻量知识库”能替代的，也不是一个简单 SaaS 表格能替代的。

### 8.4 Agent 结论治理仍是新问题

Databricks 能治理数据和模型，但 Agent 最终输出的自然语言结论、动作建议、工具链 reasoning 还需要额外设计。

例如：

```text
Agent 生成了一个经营分析结论：
- 用了哪些表？
- 哪些过滤条件？
- 是否用了最新数据？
- 是否应用了权限过滤？
- prompt 是否包含用户未授权的目标？
- 输出是否泄露敏感聚合结果？
```

这些可能需要 Governance Hub、Agent telemetry、MCP audit、应用日志共同完成。

---

## 9. 适用场景

### 9.1 企业湖仓平台治理

适合已经把大量数据放在 Databricks Lakehouse 上的企业：

- 多业务线；
- 多 workspace；
- 多团队共享数据；
- 统一权限和审计；
- 需要标准数据目录和血缘。

### 9.2 AI / ML 平台治理

适合数据科学和机器学习团队：

- 训练数据血缘；
- feature 权限；
- model registry；
- model serving 权限；
- 模型上线审计；
- 监控数据 drift 和模型效果。

### 9.3 BI 与指标口径治理

适合企业要统一指标和可信报表时使用：

- 哪些表是 certified；
- 哪些字段代表核心指标；
- 哪些 dashboard 依赖哪些表；
- 指标变更影响哪些下游分析。

### 9.4 Agent 访问企业数据

当企业 Agent 要连接数仓时，Governance Hub / Unity Catalog 这类体系很关键：

```text
Agent 不应该直接拿数据库 root 权限。
Agent 应通过受控身份、受控 SQL Endpoint、受控函数、受控 MCP 工具访问数据。
所有访问都应被权限、审计、血缘和质量规则约束。
```

---

## 10. 对家庭营养师项目的启示

家庭营养师项目当前规模不需要 Databricks。

但可以借鉴它的分层思想：

```text
数据资产：家庭成员、库存、菜谱、菜单、反馈、购买记录
权限边界：Agent 只能通过 MCP 工具访问，不能任意 SQL
数据质量：库存是否过期、菜单是否重复、反馈是否入库
血缘解释：推荐结果为什么产生，引用了哪些约束和库存
审计记录：谁确认了长期偏好，谁更新了库存，Agent 做了什么写操作
```

我们当前采用：

```text
Git Markdown = 稳定知识和版本化规则
WeKnora = 检索 / Wiki / Agent 对话层
独立 Docker Postgres = 动态状态 source of truth
MCP Service = 受控状态访问边界
```

这其实是一个“小型可治理数据系统”的雏形。

后续可以在家庭营养师里补充：

- `state_events` / `audit_logs`：记录库存、反馈、菜单确认的变更；
- `recommendation_explanations`：记录推荐理由和使用的数据；
- `data_quality_checks`：检查库存负数、过期、菜谱缺字段、重复菜单；
- MCP 工具权限分层：只读查询、用户确认后写入、管理员维护；
- 长期偏好变更审批：用户确认后才写入长期规则。

---

## 11. 对连山产品的启示

Databricks Governance Hub 对连山的启发很大。

连山如果要成为工业 AI 平台，不能只提供：

```text
数据接入 + 模型推理 + 报告生成
```

还需要提供工业场景的数据治理层：

```text
工厂 / 产线 / 设备 / 工艺 / 质量 / 物料 / 人员 / 事件 / 模型 / Agent 工具
```

都应该成为可治理资产。

### 11.1 工业数据目录

连山可以沉淀：

- 工厂；
- 产线；
- 设备；
- 传感器；
- 参数；
- 质量指标；
- 工艺段；
- 缺陷类型；
- 检测模型；
- 诊断规则；
- 专家 SOP。

每个资产都应该有：

- owner；
- 业务说明；
- 数据来源；
- 更新频率；
- 质量状态；
- 权限范围；
- 下游依赖；
- 可被哪些 Agent 工具使用。

### 11.2 工业血缘与结论血缘

工业 AI 的关键不是只给结论，而是解释：

```text
这个诊断结论来自哪些设备数据、哪个时间窗、哪个质量指标、哪个模型、哪个专家规则？
```

可以借鉴 Databricks 的血缘思路，设计：

- 数据血缘；
- 指标血缘；
- 模型血缘；
- Agent 工具调用血缘；
- 诊断结论血缘；
- 人审反馈血缘。

### 11.3 Agent 权限治理

工业场景里，Agent 权限风险比普通办公场景更高。

必须区分：

```text
能看数据
能生成建议
能提交工单
能改参数
能触发控制动作
```

这些权限不能混在一个“超级 Agent”里。

可以采用：

- 只读诊断 Agent；
- 建议生成 Agent；
- 人审确认后执行工具；
- 高风险动作强审批；
- 所有操作审计；
- 敏感产线 / 设备 / 工艺参数分级授权。

### 11.4 数据质量即 AI 质量

工业 Agent 结果高度依赖数据质量。

因此连山需要把数据质量纳入产品核心：

- 传感器缺失；
- 时间戳漂移；
- 工况切换；
- 标签错误；
- 数据延迟；
- 异常点；
- 采样频率变化；
- 指标口径变更。

这比普通企业报表的数据质量更复杂，也更可能成为连山壁垒。

---

## 12. 产品判断

Databricks Governance Hub 代表的是一个趋势：

```text
当 AI / Agent 开始直接消费企业数据，数据治理平台会从后台合规系统，变成 AI 应用运行时的关键基础设施。
```

它和我们前面调研的几类产品可以形成一张完整地图：

```text
数据 / 模型 / 权限 / 血缘 / 质量 / 审计
        │
        ▼
Data Governance Platform：Databricks Governance Hub / Unity Catalog
        │
        ▼
Knowledge / Workspace：WeKnora / WorkBuddy / ADrive
        │
        ▼
Agent Runtime：Claude Code / Cursor / 企业 Agent / 工业 Agent
        │
        ▼
Agent Learning：Beacon / Jev / reviewed memory / Skills
```

对连山而言，最值得借鉴的不是 Databricks 的具体云产品，而是它背后的产品原则：

```text
数据资产必须统一治理；
AI 资产必须进入同一套治理体系；
Agent 访问数据必须继承权限、血缘、审计和质量约束；
最终业务结论必须能解释来源、权限和可信度。
```

---

## 13. 后续需要官方复核的问题

建议后续拿 Databricks 官方页面或产品截图后，重点复核：

1. Governance Hub 是否为正式产品名、独立入口、还是 Unity Catalog 的一个功能页面？
2. 它当前覆盖哪些治理卡片：权限、血缘、质量、敏感数据、审计、共享、AI 资产？
3. 是否有自动治理建议，例如自动识别未加标签资产、未授权风险、敏感字段？
4. 是否支持跨 workspace / account / cloud 的统一视图？
5. 是否和 Lakehouse Monitoring、System Tables、AI/BI、Mosaic AI Gateway、Model Registry 深度集成？
6. 是否包含审批流、任务分派、治理工单、策略模拟？
7. 对外部数据源和 Lakehouse Federation 的治理边界是什么？
8. Pricing / edition / cloud provider 支持情况如何？
9. 是否已经覆盖 Agent / AI app 的 runtime governance，还是主要停留在数据和模型资产治理？
