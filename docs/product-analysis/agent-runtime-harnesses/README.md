# Agent Runtime / Harness 产品分析

本目录用于分析 Agent / Workflow / Enterprise Harness 类产品或框架。

它关注的不是某一个模型有多强，也不是某一个 Agent 能不能完成单点任务，而是：

```text
模型如何被封装成可控、可审计、可复用、可进入业务流程的执行者。
```

---

## 1. 为什么需要这个分类

随着企业开始把 Claude、OpenAI、DeepSeek、Qwen、火山、通义、私有模型接入内部业务，问题会从“模型能不能回答”升级为：

```text
模型能不能接工具？
工具调用有没有权限？
业务动作能不能确认和回滚？
任务状态在哪里维护？
执行过程有没有 trace？
失败后能不能恢复？
成本、质量和安全如何治理？
```

这些问题不是模型层、知识库层或单一 Coding Agent 能完全解决的，而是 Harness / Runtime 层的核心职责。

---

## 2. 与相邻类别的边界

| 类别 | 核心对象 | 典型问题 | 与 Harness 的区别 |
|---|---|---|---|
| `coding-agents/` | 代码仓、工程任务、编辑与测试 | Agent 如何写代码、跑测试、提 PR | Coding Agent 是具体执行者，Harness 是让执行者安全运行的环境 |
| `agent-learning-systems/` | 运行轨迹、评估、经验蒸馏 | Agent 做过的好经验如何沉淀成 memory / Skill | Learning System 更偏事后学习，Harness 更偏事前约束和事中执行控制 |
| `agent-workspaces/` | Agent 产物、协作资料、任务空间 | 产物如何沉淀、协作、发布 | Workspace 管结果和协作界面，Harness 管任务运行时 |
| `knowledge-bases/` | 文档、知识切片、RAG、Wiki | Agent 如何检索稳定知识 | Knowledge Base 是上下文来源，Harness 决定如何使用上下文并调用工具 |
| `data-governance-platforms/` | 数据资产、权限、血缘、质量、合规 | Agent 能访问哪些可信数据 | Data Governance 是数据控制面，Harness 是任务执行控制面 |
| `ai-native-data-platforms/` | AI 数据基座、本体语义层、Agent 数据底座 | 数据如何被 AI / Agent 消费 | AI Data Platform 供给语义与数据，Harness 组织任务执行 |

---

## 3. 当前分析对象

| 产品文档 | 产品 / 能力 | 类型判断 | 核心问题 |
|---|---|---|---|
| `deepseek-harness.md` | DeepSeek Harness | DeepSeek 模型进入工具、工作流、权限、状态和评测体系的运行时形态 | DeepSeek 类模型如何从 API 调用走向企业级任务闭环 |
| `deepseek-harness-aerospace-cae-simulation-agent.md` | 航天 CAE Simulation Agent | DeepSeek Harness 的应用侧样板 | DeepSeek Harness 如何支撑航天仿真任务的模型检查、工具调用、求解、裕度计算、人审和审计闭环 |

---

## 4. 评估维度

后续分析这类产品时，建议重点看：

1. **模型接入**：是否支持 DeepSeek、Claude、OpenAI、Qwen、私有模型，多模型路由和 fallback 是否清晰。
2. **上下文装配**：是否能把知识库、业务对象、历史状态、权限信息和任务目标组装成稳定上下文。
3. **任务协议**：是否有 Prompt / Task Protocol / Skill 定义机制，而不是只靠临时 prompt。
4. **工具调用**：是否支持 Function Calling、MCP、API、数据库、企业系统连接器。
5. **权限边界**：工具、数据、动作是否有 RBAC、scope、审批、敏感操作拦截。
6. **状态管理**：长任务、子任务、重试、暂停、恢复、幂等、补偿是否可管理。
7. **Workflow / Multi-agent**：是否支持固定 workflow、动态计划、多角色协同、人机协同。
8. **Human in/on the loop**：高风险动作是否能让人确认，低风险动作是否能自动推进。
9. **Trace 与审计**：是否记录 prompt、上下文、工具调用、输入输出、审批、失败原因、成本。
10. **评测与质量治理**：是否支持离线评测、线上反馈、回归测试、bad case 管理。
11. **企业集成**：是否能接入 SSO、组织权限、API 网关、数据治理、日志平台、告警系统。
12. **部署形态**：SaaS、私有化、混合云、本地开发环境的边界是否清楚。

---

## 5. 对 Agent 时代的意义

Harness 会成为模型与业务系统之间的“任务执行控制面”。推荐关系是：

```text
用户 / 业务系统 / 自动触发器
        │
        ▼
Agent Runtime / Harness
        ├── 模型路由：DeepSeek / Claude / OpenAI / Qwen / 私有模型
        ├── 上下文：知识库 / 文档 / 本体 / 历史状态 / 业务对象
        ├── 工具层：MCP / API / SQL Endpoint / Workflow / 企业系统连接器
        ├── 控制层：权限 / 审批 / schema validation / 幂等 / 回滚
        ├── 观测层：trace / audit log / eval / cost / feedback
        ▼
业务数据库 / 数仓 / ERP / MES / CRM / OA / 知识库 / 文档系统
```

如果没有这一层，企业很容易变成每个部门都自己接一套模型 key、prompt、脚本和工具，短期 demo 很快，长期会出现成本不可控、权限不可控、审计缺失、经验无法复用、故障难恢复等问题。

---

## 6. 对我们当前项目的启示

### 6.1 家庭营养师项目

家庭营养师 Agent 现在的架构已经体现了轻量 Harness 思路：

```text
稳定知识：Git Markdown + WeKnora 知识库
动态状态：独立 Docker Postgres
状态读写：Family Nutrition MCP Service
对话入口：WeKnora Agent / 微信入口
```

后续要继续强化：

- MCP 工具必须保持 allowlist，不暴露任意 SQL；
- 长期偏好变更必须经过用户确认；
- 推荐、库存扣减、反馈学习要有审计记录；
- 菜谱知识和动态状态要分层，不把 Wiki 当业务数据库；
- 重要规则要沉淀为版本化 prompt / skill / policy。

### 6.2 连山产品

连山如果做工业 Agent 平台，Harness 层会比单纯“接一个大模型”更重要。

工业场景里的 Harness 应该管理：

- 工厂、产线、设备、工艺、质量、人员、权限等业务对象上下文；
- MES、EAM、QMS、PLM、ERP、数仓、知识库等系统连接；
- 工单创建、状态更新、复盘报告、知识回写等受控动作；
- 诊断过程 trace、专家确认、价值归因、EVI 证据链；
- 多模型和行业模型路由、成本控制、结果质量评测。

换句话说，工业 Agent 的壁垒不只是模型或 RAG，而是：

```text
业务对象语义层 + 受控工具层 + 任务状态层 + 人审审计层 + 反馈学习层
```
