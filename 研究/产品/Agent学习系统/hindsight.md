# 产品调研：Hindsight

> 调研日期：2026-10-10
> 调研对象：`vectorize-io/hindsight`（MIT，面向持续学习的 Agent memory system）
> 资料来源：官方仓库 README 与 `Recall: How Hindsight Retrieves Memories`；未部署 PostgreSQL/pgvector 或复现指标。
> 分类：agent-learning-systems（证据型长期记忆与反思）

---

## 1. 一句话定位

**Hindsight 把记忆从“向量召回的聊天片段”推进为可学习的 memory bank：retain 抽取带时间和关系的事实，recall 用语义/关键词/图/时间多路融合，reflect 形成更深的理解、观察和 mental models。**

## 2. 核心能力拆解

### 2.1 三个核心操作

- `retain`：接收内容，用 LLM 提取事实、实体、关系和时间，规范化后写入 memory bank。
- `recall`：对记忆做混合检索、过滤、融合和 rerank，返回满足 token budget 的上下文。
- `reflect`：在已有记忆上进行更深的推理，形成连接、观察或可持续更新的 mental model。

Memory bank 可按用户、项目或 Agent 隔离。

### 2.2 多种记忆类型

支持 world facts、experiences、observations、mental models。Observations 是去重且有证据支撑的信念，保留 supporting evidence 与 exact quotes，后续是 refine 而不是静默覆盖；mental models 可作为持续刷新、读取时不一定需要 LLM 的 standing answer。

### 2.3 四路召回与结果融合

recall 并行执行 semantic search、BM25 keyword search、graph traversal 和 temporal search，再用 Reciprocal Rank Fusion 合并、cross-encoder 重排，最后结合 recency、temporal proximity、proof count 等信号。时间查询会先解析日期窗口并在窗口内按相关性和时间桶分布选择，而不是简单按最新排序。

### 2.4 Token budget 作为返回单位

Agent 不是按“返回多少条”思考，而是按 context window 的 token 容量思考。`max_tokens` 控制内容大小，`budget` 控制搜索深度，两者独立；必要时 `include_chunks` 拉回产生记忆的原文以恢复语境和引用。

### 2.5 生产化接口与防御

提供 Docker、pip、Helm、embedded server、hosted cloud，以及 Python/Node/Go/CLI/REST/MCP。生产可用 PostgreSQL + pgvector/Oracle AI Database、Prometheus、webhook 和扩展认证；每个 bank 可启用秘密/PII 检测，支持 redact 或 block。

## 3. 与相邻产品的差异

| 维度 | Hindsight | MemPalace | 普通 RAG | Lattice/DSH |
|---|---|---|---|---|
| 写入 | LLM 抽取并规范化 | 原文 verbatim | 文档切片 | 事件/证据 append-only |
| 召回 | 向量+BM25+图+时间+rerank | 后端可插拔+图 | 多为向量/关键词 | 图遍历+证据查询 |
| 学习 | reflect/observations/mental models | diary/协作/原文积累 | 通常无持续学习 | 复盘→FMEA/Pack |
| 证据 | quote/proof/evidence | drawer 原文 | source chunk | evidence provenance |
| 边界 | memory bank | wing/room/drawer | collection | tenant/profile/work-order |

## 4. 优势

1. **检索策略与查询类型匹配**：名字、语义、关系、历史时间不被同一种 embedding 强行处理。
2. **证据支撑的 belief 更新**：观察保留依据且 refine，不直接丢弃旧事实。
3. **token-aware**：适合 Agent 上下文装配和延迟/成本控制。
4. **图和时间是一等信号**：非常适合项目、人员、设备、事件和状态变化。
5. **从本地到生产可演进**：embedded、本地 Docker、Postgres、云和多语言客户端路径清楚。

## 5. 短板 / 未验证点

1. retain 的 LLM 抽取会引入实体合并、时间识别和关系判断错误，必须保留原文并支持纠错。
2. reflect/mental model 可能把推断误当事实，业务系统需要区分 observation、hypothesis 和 confirmed fact。
3. 多路检索、cross-encoder 和图遍历的延迟、索引维护和成本尚未在本项目数据规模验证。
4. README 中的生产能力和 60+ 集成需要按具体版本、认证和部署方式核验。

## 6. 适用场景

长期个人助手、项目/客户记忆、研究型 Agent、需要时间与关系推理的知识系统、带证据引用的企业经验库。

## 7. 对我们当前项目的启发

1. **把诊断观察与事实分级**：world fact、observation、experience、mental model 可映射为设备事实、Agent 观察、工单经历、领域模型；只有通过人审的结论才能升级为 Pack/FMEA 知识。
2. **采用四路诊断召回**：语义召回故障描述，关键词召回测点/料号，图遍历召回上下游设备，时间检索召回同一班次/批次/维护窗口。
3. **证据数量作为轻量可信信号**：proof count 可以帮助排序，但不能替代安全门和专家确认。
4. **按 token budget 装配调查上下文**：固定 max_tokens 与 investigation budget，必要时再按 evidence reference 拉取原始曲线或日志片段。
5. **refine 而非 overwrite**：新的工单结论应追加并修正旧知识，保留冲突、来源、有效期和人工裁决记录。

## 8. 后续需要实测的问题

1. 工业时序数据的时间窗口解析、时区、班次和批次语义如何接入 temporal search。
2. 实体规范化错误如何被人审、回滚和批量修复。
3. graph traversal 深度、cross-encoder 延迟和 token budget 对诊断闭环时延的影响。
4. memory bank 与工厂/profile/work-order 的租户和保密分区策略。
5. observation/mental model 如何与 Pack YAML、Living FMEA 和 append-only mutation 互相引用而不形成双重真相源。
