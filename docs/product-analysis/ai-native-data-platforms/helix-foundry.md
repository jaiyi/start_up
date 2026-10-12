# 产品调研：Helix Foundry（HelixDB/helix-foundry）

> 调研日期：2026-10-10
> 调研对象：`HelixDB/helix-foundry`（Apache-2.0，本地优先 AI 数据工作空间）
> 资料来源：官方仓库 README 与 `helix-foundry-guide`；未执行完整 Compose、连接器和浏览器测试。
> 分类：ai-native-data-platforms（本地本体与数据工作空间）

---

## 1. 一句话定位

**Helix Foundry 把多源数据快照、DuckDB 查询、HelixDB 本体对象/关系和 AI 辅助分析组合成一个无需账号、默认本地运行的数据工作空间：用户连接数据，审阅 AI 建议的 ontology，执行有引用的分析，并显式发布对象模型。**

## 2. 核心能力拆解

### 2.1 Guided setup：AI → Data → Ontology

初始化先选择本地 Qwen3 4B、Claude 或 OpenAI，再连接数据库、Stripe、WorkOS、PostHog、REST、S3 或 CSV/JSON/JSONL/Parquet，最后根据数据生成确定性的本体建议。用户可重命名、排除实体后确认构建；AI 主要补充描述、摘要和关系名称，构建发布本身按代码流程完成。

### 2.2 数据快照与连接器

PostgreSQL/MySQL 支持逻辑复制或 binlog change capture，无法使用时退回定时快照；Stripe、WorkOS、PostHog、REST、S3 和文件以完整 snapshot 导入。快照使用不可变 Parquet，具备 schema/profile、key candidate、sensitivity hint、schema drift review、版本和导出能力。

### 2.3 Ontology 作为真实对象层

Ontology Explorer 展示记录和关系；对象类型与关系存于 HelixDB，手工 overlay 与导入快照分离，重物化后仍保留。对象编辑需要 before/after preview 和显式应用，工作区修改不直接写回来源系统。

### 2.4 Analyst 与可引用查询

用户可用自然语言提问。只读问题通过隔离 DuckDB 执行，返回结果和 snapshot citations；需要生成 pipeline 或 ontology definition 时，系统生成可审阅 proposal，进行 schema 校验、SQL 执行和质量检查后等待发布。

### 2.5 发布、回滚与后台作业

Proposal 发布检查输入版本和 proposal hash，按对象类型/关系分批 materialise；数据量不一致会阻止切换，旧 generation 保持激活。系统有持久化 jobs、lease、crash recovery、scheduled refresh、bounded repair、budget control 和 rollback。

### 2.6 本地安全边界

App 只在 loopback 发布；Host/origin 检查防 DNS rebinding；token 为 workspace-scoped、默认 read-only 且可撤销；连接器/模型凭据用 AES-256-GCM 加密。DuckDB executor 是无外网的 disposable child process，没有 connector/API credentials，限制内存、进程数、超时与 spill。

## 3. 与相邻产品的差异

| 维度 | Helix Foundry | Palantir Ontology | Helix Agent Fleet | 传统 BI/RAG | DSH |
|---|---|---|---|---|---|
| 核心对象 | 本地数据快照+ontology object | 企业级对象/关系/动作 | coding agent 任务 | 表、文档、向量 | 设备/工单/证据/诊断图 |
| 写入 | review proposal / overlay / publish | governed Action | GitHub PR | 常为查询或应用写入 | mutation + gate + Pack 发布 |
| 执行 | DuckDB isolated query | 分布式企业平台 | GPU sandbox | 依赖平台 | compute node |
| 部署 | 单机 Docker Compose | 企业云/私有化产品 | 自托管舰队 | SaaS/集群 | 管理面+计算节点 |
| 语义来源 | 数据推断+人工确认 | 组织建模与治理 | Git/spec | schema/embedding | profile/Pack/FMEA |

## 4. 优势

1. **本地优先且可用性高**：无账号、默认本地模型，适合敏感数据探索和个人/小团队启动。
2. **数据与本体同一工作空间**：不是单独建图，而是从多源快照进入对象与关系，再回到分析和指标。
3. **提案审阅而非直接信任模型**：AI 生成 definition、SQL 和 ontology 建议，经过执行、证据预览和显式发布。
4. **查询隔离设计清晰**：生成 SQL 没有 connector credentials，也没有网络，降低 prompt-to-SQL 的爆炸半径。
5. **版本化快照与引用**：结果可指向具体 snapshot，增强分析可复现性。

## 5. 短板 / 未验证点

1. 定位是一人一机的 local-first workspace，不应直接当成多租户生产平台或外网服务暴露。
2. 本地模型质量依赖硬件；Hosted provider 虽支持，但敏感列识别是 heuristic，使用前仍需按数据政策审阅。
3. 当前重点是读取、建模和分析，不支持写回来源系统、逐行 AI enrichment 或 distributed compute。
4. 大表实时变更在 snapshot materialisation 期间可能滞后；CDC 不可用时自动刷新有延迟。
5. 本次没有运行集成测试、真实连接器、发布回滚和灾备流程。

## 6. 适用场景

个人/小团队本地数据探索、跨 SaaS 数据统一建模、业务 ontology 原型、敏感数据的私有分析、带快照引用的自然语言查询。

## 7. 对我们当前项目的启发

1. **把 diagnosis ontology 做成可发布对象层**：设备、测点、工单、故障模式、证据和动作不应只是表字段，应有对象、关系、版本和来源引用。
2. **提案与发布分离**：Agent 可以提出对象关系、指标或 Pack 变更，但必须展示输入版本、前后差异、校验结果和影响范围，再切换 generation。
3. **查询执行器最小权限化**：诊断 SQL、时序计算和日志筛选应放在无网络、无凭据的隔离 executor 中，输入只能来自已批准快照。
4. **snapshot citation 是证据链基础**：每个诊断结论绑定数据版本、采集时间、查询/算子版本，避免“数据已变但结论仍被认为可复现”。
5. **本地优先与企业计算节点结合**：敏感工厂数据默认在现场/私有计算节点处理，需要外发模型时仅发送经策略裁剪的 schema、样本或摘要。

## 8. 后续需要实测的问题

1. 多工作区、备份恢复、密钥轮换和数据卷升级的真实运维边界。
2. CDC、快照、schema drift 与 ontology overlay 并发发生时的最终一致性。
3. 复杂关系和百万级对象在 HelixDB Explorer、发布和查询中的性能。
4. 生成 SQL 的安全测试：跨表越权、资源耗尽、函数逃逸、磁盘 spill 和超时。
5. 将本地 ontology proposal 接入 DSH Pack/算子发布流水线时的 schema、审批和回滚映射。
