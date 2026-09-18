# 04 · Prompt / CoT / 任务协议设计

## 1. 这个模块解决什么问题

Prompt 不只是提示词技巧，而是把业务任务翻译成 AI 可以稳定执行的任务协议。

这个模块回答：

```text
如何定义角色、输入、输出、约束、拒答边界、工具调用和人工确认点？
```

---

## 2. 它在知识复利系统中的位置

```text
业务任务
  ↓
任务协议设计
  ↓
Prompt / Schema / Tool Contract
  ↓
Agent 执行
  ↓
评测与反馈
```

任务协议是业务流程和模型能力之间的接口。

---

## 3. 核心概念

- System Prompt；
- Role / Goal / Constraint；
- Structured Output；
- JSON Schema；
- Few-shot；
- CoT；
- Tool-use Prompt；
- Refusal Boundary；
- Human Confirmation Point；
- Prompt Versioning；
- Guardrails。

---

## 4. 典型技术路线

| 路线 | 适合场景 | 风险 |
|---|---|---|
| 手写 Prompt 模板 | 早期验证、简单任务 | 随着复杂度提高不可维护 |
| 结构化输出 | 报告、表单、分类、抽取 | Schema 设计不合理会导致脆弱 |
| Few-shot | 有稳定示例的判断任务 | 示例覆盖不足会误导 |
| CoT / 推理结构 | 复杂分析、决策辅助 | 不宜暴露敏感推理或编造过程 |
| Prompt 编程 | 复杂任务和自动优化 | 学习成本和框架依赖 |
| Guardrails | 合规、风险、格式约束 | 不能替代权限和流程治理 |

---

## 5. 推荐调研的开源框架 / 工具

| 类型 | 候选项目 | 背景/特点 | 后续验证点 |
|---|---|---|---|
| Prompt 编程 | DSPy | Stanford 生态，强调自动优化 prompt / pipeline | 学习成本、中文业务适配 |
| Prompt DSL | Guidance | Microsoft 相关背景，控制生成结构 | 维护活跃度、适用场景 |
| Prompt DSL | LMQL | 类查询语言控制 LLM 输出 | 生态活跃度 |
| 结构化输出 | Instructor | Pydantic 生态，适合结构化抽取 | 与主流模型兼容性 |
| 结构化输出 | Outlines | 约束生成、结构化输出 | 本地模型支持 |
| Agent 应用 | PydanticAI | Pydantic 团队，类型化 Agent 应用 | 成熟度、生态 |
| Prompt 测试 | Promptfoo | Prompt 回归测试 | 是否适合知识库任务 |
| Guardrails | Guardrails AI / NeMo Guardrails | 输出约束、安全边界 | 复杂场景效果和维护成本 |

---

## 6. 适合个人 / 小团队 / 企业的落地方式

| 场景 | 推荐起点 |
|---|---|
| 个人验证 | Markdown Prompt 模板 + 手工评测 |
| 家庭 Agent | 结构化输出 + 明确拒答和确认边界 |
| 小团队 | Prompt 版本管理 + Promptfoo 回归测试 |
| 企业 | Prompt Registry + Schema + Guardrails + Trace + 审批流程 |

---

## 7. 与其他模块的关系

- 依赖知识工程定义业务对象和规则；
- 调用 RAG 获取上下文；
- 约束 Agent 的行为边界；
- 需要评测模块做回归测试；
- 需要治理模块管理版本、权限和审计。

---

## 8. 后续要验证的问题

- 家庭营养师 Agent 的任务协议应该如何写？
- 哪些任务需要结构化输出？
- CoT 在业务文档里应该显式保留还是隐藏？
- Promptfoo 是否适合做个人知识库 prompt 回归测试？
