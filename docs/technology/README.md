# 知识复利工程师技术学习框架

这个目录用于沉淀“大模型普及后，知识复利工程师需要掌握的技术能力”。

它不是一份完整的 AI 技术百科，也不是算法工程师训练路线，而是围绕一个核心问题展开：

> 如果目标是成为知识复利工程师，我在技术上需要理解和掌握哪些能力，才能把业务知识、数据证据、流程反馈和 Agent 协作组织成可持续迭代的智能生产系统？

`docs/insights/` 更偏回答：

```text
为什么知识复利工程师这个方向值得关注？
什么行业、业务场景和组织位置更容易产生知识复利？
```

`docs/technology/` 则回答：

```text
要真正做成这件事，技术上需要学什么？
哪些能力必须掌握？
哪些能力需要理解边界？
哪些能力可以交给平台、算法或基础设施团队？
哪些开源框架值得持续跟踪和验证？
```

---

## 1. 总目标：不是学完所有 AI 技术，而是建立技术判断力

知识复利工程师不需要把所有大模型技术都做到算法工程师级别。

真正重要的是形成判断力：

```text
一个业务问题到底该用 Prompt？
该用 RAG？
该做知识图谱？
该做 Agent Workflow？
该做评测集？
该做流程改造？
该做数据治理？
还是根本不该先上 AI？
```

这个目录的技术学习目标可以概括为：

```text
理解模型能力边界；
设计稳定任务协议；
组织可复用知识资产；
搭建可验证 RAG 链路；
理解知识图谱和结构化知识；
设计 Agent / Workflow / Harness；
建立评测、反馈和持续迭代机制；
理解部署、安全、权限和治理边界。
```

---

## 2. 推荐学习顺序

不按“从大模型底层原理开始”的路线，而按知识复利落地的优先级来排：

```text
1. 知识工程与知识资产设计
2. RAG 链路设计
3. 评测集与反馈闭环
4. Prompt / CoT / 任务协议
5. Agent / Workflow / Enterprise Harness
6. WeKnora / LightRAG / Reme 对比
7. 知识图谱：DeepKE / Nebula Graph / Neo4j
8. 大模型技术体系
9. 私有化部署与轻量化治理
```

原因是：

```text
知识复利工程师的核心不是先学模型，
而是先理解知识如何被组织、调用、反馈和治理。
```

模型技术重要，但它更像底层能力。知识工程、RAG、评测、Agent harness，才更贴近“把组织经验变成智能生产力”的主线。

---

## 3. 目录规划

```text
docs/technology/
├── README.md
├── 01-knowledge-engineering-and-asset-design.md
├── 02-rag-pipeline-design.md
├── 03-evaluation-dataset-and-feedback-loop.md
├── 04-prompt-cot-and-task-protocol.md
├── 05-agent-workflow-and-enterprise-harness.md
├── 06-weknora-lightrag-reme-comparison.md
├── 07-knowledge-graph-engineering-deepke-nebula-graph.md
├── 08-llm-technology-system.md
└── 09-model-compression-private-deployment-and-governance.md
```

后续逐篇填充，不一次性追求完整。每篇都要同时回答：

```text
原理是什么？
解决知识复利系统里的哪个问题？
有哪些主流开源框架值得跟踪？
个人 / 小团队 / 企业分别怎么落地？
哪些地方容易过度设计？
```

---

## 4. 开源框架调研标准

每个模块后续都会补充较新的开源框架和工具。筛选时优先关注：

1. GitHub stars 较高，说明社区关注度高；
2. 背后有大厂、知名机构、活跃创业公司或成熟社区；
3. 最近仍在持续更新；
4. 文档完善，有真实案例或生产实践；
5. 支持本地化 / 私有化部署，或至少支持数据导出；
6. 能和 RAG、Agent、知识图谱、评测、权限治理等链路衔接；
7. 适合个人验证，同时有机会扩展到小团队或企业场景；
8. 不把核心组织记忆锁死在不可迁移的平台里。

但要保留一个判断：

> 高星和大厂背景只能作为筛选条件，不能作为采用理由。真正要看的是：它是否让知识资产可控、可导出、可评测、可持续治理。

有些项目 star 高，但更偏 demo；有些项目背后大厂，但生态锁定较重；有些轻量工具反而更适合个人和小团队。

---

## 5. 九个模块的学习目标与框架候选

### 5.1 知识工程与知识资产设计

对应文件：

```text
01-knowledge-engineering-and-asset-design.md
```

核心问题：

- 什么知识值得进入系统？
- 知识应该如何分类？
- 哪些是事实、规则、案例、流程、指标、异常和反馈？
- 哪些应该进文档，哪些应该进表，哪些应该进图谱，哪些应该成为 Agent 记忆？
- 如何避免知识库变成新的知识坟场？

重点关注：

- 知识资产分类；
- Markdown 知识卡片；
- Wiki / SOP / 案例库 / 反馈库；
- 业务对象建模；
- 元数据、版本、权限、负责人；
- 知识生命周期和知识债务；
- 数据证据如何挂到业务对象上。

开源框架 / 工具候选：

- Wiki / 文档：Outline、Wiki.js、BookStack、Docusaurus、MkDocs Material；
- 个人知识库：Obsidian、Logseq；
- 数据 / 元数据资产：OpenMetadata、DataHub；
- 文档解析与加载：LlamaIndex Readers、LangChain Document Loaders、Unstructured；
- 知识库产品参考：Dify Knowledge、RAGFlow、WeKnora。

---

### 5.2 RAG 链路设计

对应文件：

```text
02-rag-pipeline-design.md
```

核心问题：

- 用户问题如何被理解、改写和拆解？
- 如何做向量检索、关键词检索和混合检索？
- 如何处理 chunk 切分、过滤、剪枝和上下文组装？
- 如何使用 reranker 提升上下文质量？
- 如何做引用溯源和答案可解释？

重点关注：

- Query 扩写；
- Embedding；
- Hybrid Search；
- BGE / Reranker；
- Chunk 过滤剪枝；
- Context Packing；
- Citation / Grounding；
- Retrieval Evaluation。

开源框架 / 工具候选：

- RAG 框架：LlamaIndex、LangChain、Haystack、RAGFlow、Dify、FastGPT、MaxKB；
- 向量库：Milvus、Qdrant、Weaviate、Chroma；
- 搜索引擎：Elasticsearch、OpenSearch、Vespa；
- 中文向量 / 重排：BGE / FlagEmbedding、bge-reranker、Qwen Embedding 系列；
- 文档处理：Unstructured、Marker、MinerU、Docling。

---

### 5.3 评测集与反馈闭环

对应文件：

```text
03-evaluation-dataset-and-feedback-loop.md
```

核心问题：

- 如何判断 RAG 和 Agent 真的变好了？
- 评测集应该从真实问题、历史对话还是专家设计中来？
- 如何区分检索评测、生成评测、Agent 流程评测？
- 如何把人工反馈转化成知识、Prompt、流程和工具的迭代？

重点关注：

- Golden Dataset；
- Retrieval Evaluation；
- Generation Evaluation；
- Agent Trace Evaluation；
- LLM-as-judge；
- 人工反馈采集；
- 错误归因；
- 评测集持续更新。

开源框架 / 工具候选：

- RAG 评测：Ragas、DeepEval、TruLens、UpTrain；
- 可观测性 / 反馈：LangSmith、Langfuse、Phoenix / Arize、Helicone、Opik；
- Prompt / LLM 回归测试：Promptfoo、OpenAI Evals；
- 数据标注与人工反馈：Label Studio。

---

### 5.4 Prompt / CoT / 任务协议设计

对应文件：

```text
04-prompt-cot-and-task-protocol.md
```

核心问题：

- 如何把业务任务翻译成 Agent 可以稳定执行的任务协议？
- Prompt 如何表达角色、任务、约束、输入、输出和拒答边界？
- CoT 是否应该显式输出，还是只用于内部推理结构？
- 如何避免 Prompt 成为不可维护的“咒语”？

重点关注：

- System Prompt；
- Structured Output；
- Few-shot；
- CoT / Reasoning Pattern；
- Tool-use Prompt；
- Guardrails；
- Human Confirmation Point；
- Prompt Versioning。

开源框架 / 工具候选：

- Prompt 编程：DSPy、Guidance、LMQL；
- 结构化输出：Instructor、Outlines、PydanticAI；
- Prompt 测试：Promptfoo、DeepEval；
- Guardrails：Guardrails AI、NeMo Guardrails。

---

### 5.5 Agent / Workflow / Enterprise Harness

对应文件：

```text
05-agent-workflow-and-enterprise-harness.md
```

核心问题：

- Agent 和 Chatbot 的区别是什么？
- Workflow 和 Agent 的边界是什么？
- 如何从 human in the loop 走向 human on the loop？
- Agent 如何调用企业知识、工具和业务系统？
- 如何设计权限、日志、状态、失败恢复和人工确认？

重点关注：

- Tool Calling；
- Workflow Orchestration；
- State Management；
- Memory；
- Permission Boundary；
- Audit Log；
- Human Approval；
- Failure Recovery；
- Enterprise Harness。

开源框架 / 工具候选：

- Agent / Workflow：LangGraph、AutoGen、CrewAI、Semantic Kernel、Dify Workflow、Flowise；
- 通用自动化：n8n、Activepieces；
- 工作流编排：Temporal、Dagster、Prefect；
- 记忆与上下文：Mem0、Zep；
- 可观测性：Langfuse、LangSmith、Phoenix。

---

### 5.6 WeKnora / LightRAG / Reme 对比

对应文件：

```text
06-weknora-lightrag-reme-comparison.md
```

核心问题：

- 三者分别解决什么问题？
- 是否支持图谱、实体关系、Wiki、Agent、工作流？
- 数据是否可导出，是否适合长期知识复利？
- 部署复杂度、维护成本、可扩展性如何？
- 对个人知识库、家庭知识库、小团队组织记忆分别适合吗？

重点关注：

- 知识库能力；
- RAG 能力；
- 图谱能力；
- Agent / Workflow 能力；
- 权限和多知识库；
- 数据导出和迁移；
- 私有化部署成本；
- 生态活跃度。

开源框架 / 工具候选：

- WeKnora；
- LightRAG；
- Reme；
- GraphRAG；
- RAGFlow；
- Dify Knowledge；
- FastGPT；
- MaxKB。

---

### 5.7 知识图谱工程：DeepKE / Nebula Graph / Neo4j

对应文件：

```text
07-knowledge-graph-engineering-deepke-nebula-graph.md
```

核心问题：

- 知识图谱到底解决什么问题？
- 什么场景适合图谱，什么场景不适合？
- DeepKE 适合解决哪些实体、关系、事件抽取问题？
- Neo4j 与 Nebula Graph 在部署、查询语言、生态和运维复杂度上有什么差异？
- 图谱抽取结果如何接入 RAG 和 Agent？

重点关注：

- Entity Extraction；
- Relation Extraction；
- Event Extraction；
- Graph Storage；
- Graph Query；
- GraphRAG；
- 图谱可视化；
- 图谱与权限治理。

开源框架 / 工具候选：

- 知识抽取：DeepKE、OpenNRE、HanLP、spaCy、LLM-based extraction；
- 图数据库：Neo4j、Nebula Graph、ArangoDB、HugeGraph、TuGraph；
- 图计算 / 分析：NetworkX、GraphScope；
- 图谱增强 RAG：Microsoft GraphRAG、LightRAG、LlamaIndex Knowledge Graph / Property Graph 相关能力。

---

### 5.8 大模型技术体系

对应文件：

```text
08-llm-technology-system.md
```

核心问题：

- 大模型擅长什么、不擅长什么？
- 通用模型、行业模型、私有化模型有什么差别？
- SFT、RLHF、DPO、Prompt、RAG、知识工程分别适合解决什么问题？
- 模型能力边界如何影响知识复利系统设计？

重点关注：

- Transformer 基础；
- Context Window；
- Tool Calling；
- Function Calling；
- Multi-modal；
- SFT / RLHF / DPO；
- Prompt / RAG / Fine-tuning 边界；
- 主流模型生态。

开源框架 / 工具候选：

- 模型与训练生态：Transformers、ModelScope、OpenMind、LLaMA-Factory、Axolotl；
- 主流开源模型：Qwen、DeepSeek、GLM、Yi、Llama、Mistral；
- 应用接入：LiteLLM、OpenRouter 类模型网关、OneAPI；
- 本地运行：Ollama、LM Studio、llama.cpp。

---

### 5.9 私有化部署与轻量化治理

对应文件：

```text
09-model-compression-private-deployment-and-governance.md
```

核心问题：

- 普通团队什么时候应该用外部 API，什么时候才考虑本地模型？
- 私有化部署的真实成本包括哪些？
- 量化、剪枝、蒸馏分别解决什么问题？
- 如何管理 API Key、权限、审计、备份和数据迁移？
- 如何避免核心组织记忆被平台锁死？

重点关注：

- Quantization；
- Pruning；
- Distillation；
- vLLM / SGLang / llama.cpp；
- Model Gateway；
- Docker / Compose / Kubernetes；
- Auth / Permission / Audit；
- Data Export / Backup；
- Cost Governance。

开源框架 / 工具候选：

- 推理与部署：vLLM、SGLang、llama.cpp、Ollama、TensorRT-LLM；
- 模型网关：LiteLLM、OneAPI、Portkey；
- 可观测性：Langfuse、Helicone、OpenTelemetry；
- 基础设施：Docker、Docker Compose、Kubernetes、MinIO、Postgres；
- 权限与身份：Keycloak、Casdoor、Authentik。

---

## 6. 技术能力分层

为了避免把所有技术都混在一起，可以按三层理解。

### 第一层：知识复利工程师必须掌握

这些能力直接决定能否把知识系统做成：

- 知识工程与知识资产设计；
- Prompt / CoT / 任务协议设计；
- RAG 链路基本设计；
- Query 扩写；
- Chunk 策略理解；
- Reranker 作用理解；
- 评测集构造；
- Agent 任务边界设计；
- 业务流程嵌入；
- 反馈闭环设计；
- 数据证据组织；
- 知识治理。

### 第二层：技术 BP / AI Ops 需要深入理解

这些能力需要理解原理和工程影响，不一定每个人都要从零实现：

- 混合检索；
- 向量库选型；
- 知识图谱；
- 实体关系抽取；
- 图数据库选型；
- Agent Workflow；
- 模型网关；
- 权限、审计、日志；
- 私有化部署方案；
- 成本、延迟、稳定性评估。

### 第三层：平台 / 算法团队主责

这些能力更偏模型和基础设施团队：

- SFT；
- RLHF / DPO；
- 模型量化；
- 模型剪枝；
- 模型蒸馏；
- 大规模推理优化；
- GPU 集群管理；
- 大规模图计算底层优化。

知识复利工程师不一定要亲自做第三层，但需要理解它们的适用边界，避免把所有业务问题都误判为“需要训练模型”。

---

## 7. 研究原则

1. 不做 AI 技术百科，而是围绕“知识复利系统需要什么技术能力”展开。
2. 每个技术点都要回答：它解决知识、RAG、Agent、评测或治理链路里的哪个具体问题。
3. 每个模块都要同时写“原理”和“开源框架/工具”，为后续制定落地路径做准备。
4. 区分“必须掌握”“需要深入理解”“平台/算法团队主责”。
5. 优先关注可落地、可验证、可维护的方案。
6. 对工具对比要关注数据可控性、可导出性和长期维护成本。
7. 所有结论尽量服务于后续 WeKnora 个人知识库、家庭营养师 Agent、小团队组织记忆和企业知识复利系统建设。
8. 不迷信重型架构。能用结构化 Markdown、元数据、RAG 和反馈闭环解决的问题，不默认上知识图谱或微调。
9. 不把 AI 应用停留在“问答可用”，而是持续追问它是否进入流程、产生反馈、修正知识并改善业务结果。
