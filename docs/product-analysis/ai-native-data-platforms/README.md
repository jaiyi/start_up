# AI Native Data Platforms 产品分析

本目录用于分析面向 AI 应用、Agent、RAG / GraphRAG、模型工程和企业语义治理的新一代数据平台。

它关注的不是单一数据库、数仓、知识库或 Agent 应用，而是这些能力如何被统一组织成 AI 原生数据底座。

---

## 1. 分类定义

AI 原生数据平台可以理解为：

```text
以 AI / Agent 为核心消费对象，统一纳管数据、文档、向量、特征、模型、语义、本体、权限、审计和反馈闭环的企业智能基础设施。
```

它和传统数据平台的差异在于：

| 维度 | 传统数据平台 | AI 原生数据平台 |
|---|---|---|
| 核心用户 | 数据工程师、分析师、业务用户 | 人 + AI Agent + AI 应用 |
| 消费方式 | SQL、BI、报表、看板 | 自然语言、Agent 工具调用、自动任务编排 |
| 资产范围 | 表、指标、报表、元数据 | 表、文档、向量、特征、模型、Prompt、Agent、Skill、评测集 |
| 治理重点 | 权限、质量、血缘、合规 | 语义、本体、AI 资产、Agent 行为、结论血缘、反馈闭环 |
| 价值形态 | 支撑人工分析 | 支撑 AI 可靠行动 |

---

## 2. 当前分析对象

| 产品文档 | 产品 / 厂商 | 类型判断 | 核心问题 |
|---|---|---|---|
| `shulan-ai-data-foundation.md` | 数澜科技 AI 数据基座 / 本体语义层 / 数据智能体 | 中国数据中台向 AI 数据基座演进路线 | 数据中台如何从数据交换升级为模型交换与 Agent 运行底座 |
| `transwarp-ai-data-platform.md` | 星环科技 / Transwarp | 国产湖仓、大数据、数据库与 AI 平台路线 | 底层数据基础设施如何支撑 AI 原生数据平台 |
| `mininglamp-knowledge-graph-ai-platform.md` | 明略科技 | 知识图谱、行业智能和数据智能路线 | 本体、图谱和行业知识如何支撑企业 AI 应用 |

后续可继续补充：

- Databricks Data Intelligence Platform；
- Snowflake AI Data Cloud；
- Microsoft Fabric；
- Palantir AIP / Foundry Ontology；
- 阿里云 Dataphin / DataWorks / 百炼组合；
- 华为云 DataArts / ModelArts / 盘古组合；
- 腾讯云 WeData / 混元 / WeKnora / WorkBuddy 组合。

---

## 3. 评估维度

分析 AI 原生数据平台时，建议重点看：

1. **数据底座**：是否支持湖仓、数仓、数据湖、数据库、实时数据和多源接入？
2. **全模态资产**：是否统一管理结构化数据、文档、图片、音视频、向量、特征、模型等资产？
3. **语义层 / 本体**：是否有业务术语、指标口径、对象模型、本体关系和知识图谱？
4. **AI / Agent 适配**：是否支持 RAG、GraphRAG、Agent 工具调用、Prompt / Skill、Agent Runtime？
5. **治理能力**：是否覆盖权限、质量、血缘、审计、分类分级、敏感数据、模型和 Agent 行为？
6. **工程集成**：是否支持 API、SDK、MCP、事件总线、CI/CD、数据开发、模型训练和推理服务？
7. **业务闭环**：是否能把 AI 输出、业务反馈、用户修正和价值归因反哺到数据、模型和规则中？
8. **交付模式**：是云 SaaS、私有化、混合云，还是项目制交付？是否适合高合规行业？
9. **行业资产**：是否有制造、金融、政务、能源、医疗等行业模型、数据模型、知识图谱和最佳实践？
10. **差异化壁垒**：壁垒来自底层技术、本体方法论、行业 Know-how、生态集成，还是客户资产运营？

---

## 4. 与相邻分类的关系

```text
data-governance-platforms/：更偏治理控制面，例如目录、权限、血缘、质量、合规。
ai-native-data-platforms/：更偏把数据、AI、Agent 和治理整合成运行底座。
agent-workspaces/：更偏人和 Agent 的协作空间、资料库和产物沉淀。
knowledge-bases/：更偏文档知识库、RAG、Wiki、问答。
industrial-ai-platforms/：更偏工业场景和行业 Agent 应用。
```

同一个产品可以跨多个分类。例如 Databricks Governance Hub 放在 `data-governance-platforms/`，而 Databricks Data Intelligence Platform 更适合放在本目录。

---

## 5. 初步市场判断

当前市场仍处在“收敛前夜”：

```text
云厂商有底座，但行业语义和行动闭环不足；
数据治理厂商有元数据和权限，但 Agent 运行时能力不足；
RAG / Agent 平台有应用入口，但数据治理和本体能力不足；
中国数据中台厂商有历史数据治理和私有化经验，但需要证明能完成 AI 原生重构。
```

未来真正有竞争力的平台，需要同时具备：

- 可信数据供给；
- 业务语义 / 本体；
- 多模态知识资产；
- 模型与 Agent 编排；
- 权限、血缘、审计、质量；
- 业务反馈和价值归因。
