# 产品调研：MemPalace（Local-first Agent Memory）

> 调研日期：2026-10-10
> 调研对象：`mempalace/mempalace`（Python，本地优先 Agent 记忆系统）
> 资料来源：官方仓库 README；未运行 benchmark 或部署 hub。
> 分类：agent-learning-systems（长期记忆与协作经验）

---

## 1. 一句话定位

**MemPalace 用“原文抽屉 + 可检索结构 + Agent 日记”的方式保存长期记忆，默认不总结、不改写、不离开本机，并通过 MCP 将记忆、任务、协作和产物交给多个 Agent 使用。**

## 2. 核心能力拆解

### 2.1 Verbatim-first 记忆模型

内容以原始文本保存，不强制摘要、抽取或 paraphrase。其基本层次是：

```text
Wing（人/项目） → Room（主题） → Drawer（原始内容）
```

这种组织方式把“原文证据”和“检索索引”分离，避免一次不透明的摘要把关键上下文永久丢失。

### 2.2 本地向量与可插拔后端

默认使用 ChromaDB，也支持 SQLite exact、Rust exact、Milvus、Qdrant、pgvector 等后端。CLI 提供 `init`、`mine`、`search`、`wake-up`、`sweep`，可从个人本地 palace 发展为共享 hub 或 hub client。

### 2.3 MCP 作为记忆操作面

MCP server 暴露约 45 个工具，覆盖 palace 读写、知识图谱、跨 wing 导航、drawer 管理、Agent diaries、Agent coordination、logstream events 和 artifact handoffs。记忆不是只有 `search()`，还包括记录、交接、协同和事件订阅。

### 2.4 时间实体关系图

系统支持带 validity window 的 temporal entity-relationship graph，可表达“某实体在某一时间段与另一实体存在关系”，适合项目、团队成员、设备、任务和知识版本的历史查询。

### 2.5 Agent 隔离与自动保存

不同 Agent 可拥有独立 wing 和 diary；Claude Code、Codex CLI、Cursor 可通过 hook 自动保存会话信息。这为“个人记忆”和“团队共享记忆”提供了边界，而不是把所有 Agent 的上下文混成一个向量库。

## 3. 与相邻产品的差异

| 维度 | MemPalace | Hindsight | 普通向量记忆 | spc_dsh |
|---|---|---|---|---|
| 记忆原则 | 原文优先、不强制改写 | LLM 抽取事实并持续学习 | chunk/embedding 为主 | 证据、诊断图、Pack/FMEA |
| 结构 | wing/room/drawer + 图 | memory bank + 事实/经验/观察/模型 | collection/namespace | tenant/profile/work-order |
| Agent 协作 | diary、handoff、logstream | recall/reflect 与集成 | 通常没有 | 工单与人审流 |
| 部署 | 本地优先，可 hub 化 | 本地、服务化、云 | 依赖后端 | 管理面+计算节点 |
| 风险 | 原文可能含敏感信息 | 抽取可能引入模型偏差 | 召回上下文污染 | 诊断证据越权/污染 |

## 4. 优势

1. **隐私默认值好**：nothing leaves the machine unless opted in，适合研发、工厂和个人工作台的私有经验沉淀。
2. **原文可追溯**：记忆不会因为摘要而失去证据，可将检索结果回指原始 drawer。
3. **记忆操作面完整**：读写、图导航、日记、事件和产物交接构成 Agent 协作基础设施。
4. **后端可替换**：从 exact 检索到向量/分布式后端可以按规模演进。
5. **时间图适合业务记忆**：validity window 比单纯文档相似度更适合表达关系变化。

## 5. 短板 / 未验证点

1. README 中的 LongMemEval 指标（96.6% R@5）尚未在本地复现，不能直接视为本项目质量保证。
2. 原文优先会保留秘密、PII、过期规则和冲突观点，必须配合分类、脱敏、保留期和访问控制。
3. 多 Agent 共享 hub 的租户隔离、并发写入、删除证明和备份恢复需要实际部署验证。
4. 向量后端切换可能改变召回排序与索引一致性，需建立迁移和回归测试。

## 6. 适用场景

个人开发助手、团队项目记忆、跨 Agent 产物交接、离线知识工作台、需要保留原始讨论证据的研究与运维场景。

## 7. 对我们当前项目的启发

1. **诊断记忆按边界隔离**：可采用 `tenant / factory / profile / work-order / agent` 多级 memory namespace；共享 Pack 只发布经过门禁的知识，不直接暴露个人 diary。
2. **原始证据与派生记忆分层**：保留原始日志、曲线、专家批注和 Agent 观察；摘要、embedding、根因候选都是可重建的派生层。
3. **引入诊断交接协议**：一个 Agent 交给另一个 Agent 的不是 prompt，而是 evidence references、当前图快照、未决问题、限制和下一步动作。
4. **有效期是业务字段**：设备状态、工艺参数和维护关系都要有 observed_at、valid_from、valid_to，避免把过时事实当当前事实。
5. **本地优先但显式授权外发**：诊断数据默认留在计算节点；上传云模型或共享 hub 前要做敏感字段检测和用户确认。

## 8. 后续需要实测的问题

1. 原文 drawer、embedding、知识图谱和 diary 的一致性与删除语义。
2. 共享 hub 下不同 Agent wing 的权限、协作写入和冲突解决。
3. 45 个 MCP 工具的最小权限拆分，以及如何阻止 Agent 越权读取其他项目。
4. 大规模工单日志的索引成本、检索延迟和后端迁移方式。
5. 将 retained evidence 与诊断图节点绑定后，如何保证 evidence 过期、撤回和 Pack 发布的一致性。
