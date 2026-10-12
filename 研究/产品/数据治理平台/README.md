# Data Governance Platforms 产品分析

本目录用于分析数据治理平台、湖仓治理、AI 资产治理、数据目录、血缘、质量、权限、合规、数据共享与企业级数据控制平面产品。

它和前面几个目录的关系是：

```text
agent-workspaces/：Agent 产物、人机协作资料、任务空间。
knowledge-bases/：知识库、RAG、Wiki、文档问答。
agent-learning-systems/：Agent 运行轨迹、记忆评估、经验蒸馏。
data-governance-platforms/：数据 / AI 资产的权限、血缘、质量、合规和统一治理。
```

---

## 1. 为什么需要这个分类

随着 Agent 开始访问数据库、数仓、BI、特征、模型、文件和业务系统，问题会从“Agent 能不能回答”升级为：

```text
Agent 能看哪些数据？
为什么能看？
谁批准的？
用了哪个表、哪个模型、哪个函数？
结果是否可信？
敏感字段是否被脱敏？
数据质量是否达标？
血缘和审计是否可追溯？
```

这类问题不是普通知识库能解决的，而是数据治理平台的核心职责。

---

## 2. 当前分析对象

| 产品文档 | 产品 / 能力 | 类型判断 | 核心问题 |
|---|---|---|---|
| `databricks-governance-hub.md` | Databricks Governance Hub / Unity Catalog 治理体系 | 湖仓与 AI 资产治理入口 | 数据、模型、特征、函数、文件、权限、血缘、质量和审计如何统一治理 |
| `atlan-active-metadata.md` | Atlan Active Metadata Platform | 现代数据目录与主动元数据控制面 | 元数据如何驱动数据发现、协作、治理自动化和 AI 上下文 |
| `alation-data-intelligence.md` | Alation Data Intelligence Platform | 数据目录、数据搜索与数据智能平台 | 企业如何找到可信数据、理解业务语义并支撑 AI / Agent 选数 |

---

## 3. 评估维度

后续分析数据治理平台时，建议重点看：

1. **治理对象范围**：表、视图、文件、特征、模型、函数、向量索引、Agent、Dashboard、Notebook 是否统一纳管？
2. **权限模型**：是否支持 catalog / schema / table / column / row / function / model 等粒度？
3. **数据发现**：是否有数据目录、搜索、业务术语、标签、owner、说明、认证数据集？
4. **血缘追踪**：是否支持表级、列级、任务级、Notebook / Job / Pipeline 血缘？
5. **质量监控**：是否支持 freshness、schema drift、异常检测、数据质量规则和 SLA？
6. **合规与审计**：是否支持审计日志、访问记录、策略变更记录、敏感数据分类、合规报告？
7. **跨系统治理**：是否能治理外部数据源、跨云、跨工作区、跨组织共享？
8. **AI 治理**：是否覆盖模型、特征、embedding、向量索引、LLM 调用、AI 应用、Agent 输出？
9. **开发者体验**：是否能与 Notebook、SQL、Pipeline、MLflow、CI/CD、API、Terraform 集成？
10. **Agent 适配**：Agent 访问数据时是否能复用同一套权限、审计、血缘和质量约束？

---

## 4. 对 Agent 时代的意义

数据治理平台会成为企业 Agent 的“数据安全边界”。

推荐的关系是：

```text
Agent / 应用 / BI / Notebook
        │
        ▼
MCP / API / SQL Endpoint / Tool Layer
        │
        ▼
Data Governance Platform
        │
        ├── 权限：谁能访问什么
        ├── 血缘：结果来自哪里
        ├── 质量：数据是否可信
        ├── 审计：谁在何时做了什么
        ├── 脱敏：敏感字段如何保护
        └── 目录：有哪些可信数据资产
        │
        ▼
Lakehouse / Warehouse / Database / Files / Models
```

如果没有这一层，Agent 连接数据库和数仓会很危险：

- 容易越权查数；
- 难以解释答案来源；
- 无法知道用了过期数据还是高质量数据；
- 审计和合规缺失；
- 数据资产复用差；
- 不同 Agent / BI / Notebook 各自维护权限，治理碎片化。

---

## 5. 对我们当前项目的启示

### 5.1 家庭营养师项目

家庭营养师项目当前不需要 Databricks 级别的数据治理平台，但要吸收它的设计原则：

- 动态状态必须有 source of truth；
- MCP 工具必须是受控接口，不能暴露任意 SQL；
- 敏感健康 / 家庭 / 宝宝 / 老人信息要最小化访问；
- 推荐结果要能解释用了哪些库存、偏好、菜谱和约束；
- 重要偏好变更要有确认和审计。

### 5.2 连山产品

连山如果做工业 Agent 平台，数据治理平台能力会非常关键：

- 工厂数据资产目录；
- 设备 / 产线 / 工艺 / 质量数据权限；
- 指标口径治理；
- 数据血缘与诊断结论血缘；
- 专家规则、模型、Agent 工具的版本管理；
- Agent 查数、诊断、建议、执行动作的审计；
- 多租户、项目、工厂、角色级访问控制。

工业 Agent 不是只要“懂知识库”，还必须知道：

```text
哪些数据可信、谁可以看、结论从哪里来、建议是否经过授权。
```
