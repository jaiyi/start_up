# 03 · 评测集与反馈闭环

## 1. 这个模块解决什么问题

没有评测，知识库和 Agent 无法治理；没有反馈，知识无法产生复利。

这个模块回答：

```text
如何判断 RAG / Agent 是否真的变好？
如何把真实使用反馈转化成知识、Prompt、流程和工具的迭代？
```

---

## 2. 它在知识复利系统中的位置

```text
知识库 / RAG / Agent 输出
  ↓
人工使用与业务结果
  ↓
反馈采集
  ↓
错误归因
  ↓
修正知识 / Prompt / 检索 / 流程 / 工具
  ↓
评测回归
```

评测和反馈是“复利”真正发生的地方。

---

## 3. 核心概念

- Golden Dataset；
- Test Case；
- Retrieval Evaluation；
- Generation Evaluation；
- Agent Trace Evaluation；
- LLM-as-judge；
- Human Feedback；
- Error Taxonomy；
- Regression Test；
- Online Feedback；
- Business Outcome Evaluation。

---

## 4. 典型技术路线

| 路线 | 适合场景 | 风险 |
|---|---|---|
| 人工评审 | 早期验证、高风险场景 | 成本高、主观性强 |
| Golden QA | 制度问答、知识库问答 | 标准答案维护成本高 |
| RAG 指标评测 | 检索命中、引用准确性 | 指标不等于业务价值 |
| LLM-as-judge | 批量生成质量评估 | 评审模型也会偏差 |
| Agent Trace 评测 | 多步骤任务、工具调用 | 日志和状态记录要求高 |
| 业务结果评测 | 销售转化、工单效率、风险降低 | 归因困难 |

---

## 5. 推荐调研的开源框架 / 工具

| 类型 | 候选项目 | 背景/特点 | 后续验证点 |
|---|---|---|---|
| RAG 评测 | Ragas | RAG 评测常用框架 | 中文效果、指标解释性 |
| LLM 评测 | DeepEval | 面向 LLM 应用测试 | 与 CI / 回归测试结合 |
| 观测 / 评测 | TruLens | 关注 LLM App 追踪和评估 | 部署成本、指标适用性 |
| 可观测性 | Phoenix / Arize | LLM tracing、评测、可观测性 | 本地部署和数据留存 |
| Prompt 测试 | Promptfoo | Prompt / 模型回归测试 | 是否适合 RAG 和 Agent 场景 |
| 可观测性 | LangSmith | LangChain 生态强 | 闭源/平台依赖、数据可控性 |
| 可观测性 | Langfuse | 开源 LLM observability | 私有化、trace、feedback 能力 |
| 可观测性 | Helicone / Opik | LLM 调用观测和评估 | 与现有系统集成 |
| 标注反馈 | Label Studio | 开源标注平台 | 是否适合业务人员反馈 |
| 官方评测 | OpenAI Evals | 评测思想参考 | 生态绑定和适用边界 |

---

## 6. 适合个人 / 小团队 / 企业的落地方式

| 场景 | 推荐起点 |
|---|---|
| 个人验证 | 手工维护 20-50 条高价值测试问题 |
| 家庭知识库 | 真实家庭问题 + 标准依据 + 是否可执行 |
| 小团队 | Promptfoo / Ragas + 人工反馈表 |
| 企业 | Trace + Feedback + Golden Dataset + CI 回归 + 业务指标联动 |

---

## 7. 与其他模块的关系

- 评测知识工程是否可用；
- 评测 RAG 召回和生成质量；
- 评测 Prompt / 任务协议稳定性；
- 评测 Agent 是否遵守流程和权限；
- 反馈结果反向驱动知识治理。

---

## 8. 后续要验证的问题

- 家庭营养师 Agent 的第一版评测集应该包含哪些问题？
- WeKnora 是否支持反馈采集和评测闭环？
- Ragas / DeepEval 哪个更适合作为轻量起点？
- 业务结果如何和 AI 输出建立可解释关联？
