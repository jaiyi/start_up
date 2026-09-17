# 02 · RAG 链路设计

## 1. 这个模块解决什么问题

RAG 的目标不是“上传文档后能问答”，而是让 AI 在回答和执行任务时，稳定调用正确、相关、可溯源的组织知识。

这个模块回答：

```text
如何从用户问题出发，经过 query 处理、检索、重排、上下文组装和答案生成，得到可验证的回答？
```

---

## 2. 它在知识复利系统中的位置

```text
用户问题 / Agent 任务
  ↓
Query 理解与扩写
  ↓
检索召回
  ↓
Rerank / 过滤 / 剪枝
  ↓
上下文组装
  ↓
生成回答 / 执行动作
  ↓
引用溯源 / 评测反馈
```

RAG 是知识资产被调用的核心链路。

---

## 3. 核心概念

- Query Rewrite；
- Query Expansion；
- Multi-query Retrieval；
- Embedding；
- Vector Search；
- Keyword Search；
- Hybrid Search；
- Reranker；
- Chunking；
- Context Pruning；
- Citation；
- Grounding；
- Retrieval Evaluation。

---

## 4. 典型技术路线

| 路线 | 适合场景 | 风险 |
|---|---|---|
| 纯向量检索 | 语义相近、表达多样的问题 | 精确术语、编号、短词召回可能差 |
| 关键词检索 | 制度、编号、术语、精确匹配 | 语义泛化能力弱 |
| 混合检索 | 企业知识库、中文业务文档 | 工程复杂度更高 |
| Reranker | 召回多但噪音高的场景 | 增加延迟和成本 |
| Query 扩写 | 用户问题短、口语化、模糊 | 可能引入用户没有表达的意图 |
| Context Pruning | 文档长、chunk 多、噪音高 | 剪错会丢失关键依据 |

---

## 5. 推荐调研的开源框架 / 工具

| 类型 | 候选项目 | 背景/特点 | 后续验证点 |
|---|---|---|---|
| RAG 框架 | LlamaIndex | RAG / 数据连接生态强，社区活跃 | 中文文档、知识图谱、评测、可维护性 |
| RAG / Agent 框架 | LangChain | 生态大，工具链丰富 | 抽象复杂度、生产稳定性 |
| RAG 框架 | Haystack | deepset 背景，偏工程化 NLP / RAG | 中文生态、部署复杂度 |
| 知识库产品 | RAGFlow | InfiniFlow 开源，强调文档解析和 RAG | 私有化、解析质量、权限和导出 |
| AI 应用平台 | Dify | 社区活跃，适合快速搭建知识库和工作流 | 数据导出、工作流复杂度、锁定风险 |
| 知识库产品 | FastGPT / MaxKB | 国内使用较多，适合团队知识库验证 | 更新活跃度、长期治理能力 |
| 向量库 | Milvus | Zilliz 背景，适合大规模向量检索 | 小团队部署成本 |
| 向量库 | Qdrant | Rust 实现，部署相对轻量 | 中文生态、过滤能力 |
| 向量库 | Weaviate / Chroma | 易用性较好 | 生产稳定性、权限治理 |
| 搜索引擎 | Elasticsearch / OpenSearch / Vespa | 关键词、混合检索、企业搜索 | 运维复杂度 |
| 中文向量/重排 | BGE / FlagEmbedding | BAAI 背景，中文生态常用 | 具体模型效果和成本 |
| 文档解析 | Unstructured / Marker / MinerU / Docling | PDF、Office、扫描件等解析 | 中文、表格、版面还原能力 |

---

## 6. 适合个人 / 小团队 / 企业的落地方式

| 场景 | 推荐起点 |
|---|---|
| 个人验证 | LlamaIndex / Dify / RAGFlow 单机验证 |
| 家庭知识库 | WeKnora / Dify Knowledge + Markdown 文档 |
| 小团队组织记忆 | RAGFlow / Dify / FastGPT + 权限 + 反馈记录 |
| 企业场景 | 混合检索 + Reranker + 权限过滤 + 评测闭环 + 审计 |

---

## 7. 与其他模块的关系

- 依赖知识工程提供高质量知识源；
- 需要评测模块判断召回和生成质量；
- 可与知识图谱结合做 GraphRAG；
- 是 Agent 调用企业知识的主要通道；
- 需要工程治理模块解决权限、审计、成本问题。

---

## 8. 后续要验证的问题

- WeKnora 当前 RAG 链路支持哪些检索和 rerank 能力？
- 家庭菜谱知识库是否需要 query 扩写？
- BGE reranker 对中文家庭知识库和企业制度库提升多大？
- RAGFlow 的文档解析是否明显优于普通向量库方案？
