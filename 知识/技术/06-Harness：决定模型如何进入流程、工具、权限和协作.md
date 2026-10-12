# 05 · Agent / Workflow / Enterprise Harness

## 1. 这个模块解决什么问题

真正的数字员工不是聊天机器人，而是在授权边界内理解上下文、调用工具、推进流程、记录过程并接受监督的 AI 协作者。

这个模块回答：

```text
如何从 human in the loop 走向 human on the loop？
如何设计 Agent 能安全进入业务流程的 enterprise harness？
```

---

## 2. 它在知识复利系统中的位置

```text
知识资产 + RAG + 工具接口 + 权限规则
  ↓
Agent / Workflow / Harness
  ↓
业务任务执行
  ↓
日志、反馈、评测、治理
```

Agent 是知识、流程和工具之间的执行层。

---

## 3. 核心概念

- Agent；
- Workflow；
- Tool Calling；
- Function Calling；
- State Management；
- Memory；
- Planning；
- Permission Boundary；
- Human Approval；
- Audit Log；
- Failure Recovery；
- Enterprise Harness；
- Human in the loop；
- Human on the loop。

---

## 4. 典型技术路线

| 路线 | 适合场景 | 风险 |
|---|---|---|
| Chatbot | 问答、咨询、轻量辅助 | 难进入流程，依赖人搬运上下文 |
| 固定 Workflow | 流程明确、节点稳定 | 弹性不足 |
| Agent + Tools | 任务有变化，需要工具调用 | 容易越权或不可控 |
| Human Approval Workflow | 高风险动作、审批、外发 | 体验和效率需要平衡 |
| Multi-agent | 多角色协作、复杂分析 | 容易过度复杂和不可观测 |
| Enterprise Harness | 企业级数字员工 | 需要权限、状态、审计、恢复等完整工程体系 |

---

## 5. 推荐调研的开源框架 / 工具

| 类型 | 候选项目 | 背景/特点 | 后续验证点 |
|---|---|---|---|
| Agent Workflow | LangGraph | LangChain 生态，强调状态图和可控流程 | 复杂度、可观测性、生产实践 |
| Multi-agent | AutoGen | Microsoft 背景，多智能体协作 | 企业流程可控性 |
| Agent 框架 | CrewAI | 社区热度高，角色协作概念清晰 | 生产稳定性、任务边界 |
| 企业 AI SDK | Semantic Kernel | Microsoft 背景，插件、规划、企业集成 | .NET / Python 生态适配 |
| 应用工作流 | Dify Workflow | 低代码 AI workflow | 数据可控性、复杂流程边界 |
| 可视化编排 | Flowise | LangChain 可视化编排 | 维护活跃度、生产可控性 |
| 通用自动化 | n8n / Activepieces | 连接大量 SaaS 和 API | 权限、安全、流程状态 |
| 工作流引擎 | Temporal | 生产级长流程编排 | 学习和部署成本 |
| 数据/任务编排 | Dagster / Prefect | 数据任务和 workflow 编排 | 与 LLM Agent 的结合方式 |
| 记忆层 | Mem0 / Zep | Agent memory 相关 | 和正式知识库边界 |
| 可观测性 | Langfuse / LangSmith / Phoenix | Trace、评测、反馈 | 数据留存和私有化 |

---

## 6. 适合个人 / 小团队 / 企业的落地方式

| 场景 | 推荐起点 |
|---|---|
| 个人验证 | Dify Workflow / n8n / LangGraph 小任务 |
| 家庭 Agent | 明确工具边界 + 人工确认 + 反馈记录 |
| 小团队 | Workflow 优先，Agent 辅助；关键动作人工确认 |
| 企业 | Enterprise Harness：权限、状态、日志、审计、失败恢复、评测闭环 |

---

## 7. 与其他模块的关系

- 依赖 Prompt 模块定义任务协议；
- 依赖 RAG 模块获取知识上下文；
- 依赖知识工程模块定义对象和规则；
- 依赖评测模块验证任务执行；
- 依赖治理模块控制权限、安全和审计。

---

## 8. 后续要验证的问题

- 家庭营养师 Agent 应该用 Workflow 还是 Agent？
- 食谱生成、执行确认、反馈记录是否应该拆成多个 Agent？
- WeKnora 是否适合作为 Agent 知识底座？
- LangGraph / Dify Workflow / n8n 哪个更适合第一版验证？
