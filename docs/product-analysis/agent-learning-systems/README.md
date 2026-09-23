# Agent Learning Systems 产品分析

本目录用于分析 Agent 学习系统、自我改进记忆层、运行轨迹评估、经验蒸馏、跨框架 Skill 复用与 Agent 可观测性产品。

它与 `agent-workspaces/`、`knowledge-bases/`、`coding-agents/` 相邻，但关注点不同：

```text
Agent Workspaces：管理 Agent 产物和人机协作资料。
Knowledge Bases：管理稳定知识、文档索引、RAG、Wiki。
Coding Agents：执行代码理解、编辑、测试、提交等工程任务。
Agent Learning Systems：观察 Agent 怎么工作，并把高质量过程沉淀成可复用经验。
```

---

## 1. 为什么单独设这一类

传统知识库关注“人写好的知识如何被 Agent 检索”。

Agent Learning Systems 关注的是另一件事：

```text
Agent 已经跑过很多任务。
其中哪些任务做得好？
哪些调试路径、修复经验、工具顺序、项目约定值得复用？
这些经验如何被下一个 Agent、另一个 IDE、另一个框架继续使用？
```

这类产品通常围绕以下闭环：

```text
Observe 观察运行轨迹
→ Evaluate 评估任务质量和可复用性
→ Distill 蒸馏经验 / 技能
→ Review 人审确认
→ Reuse 通过 MCP / Skill / 规则注入未来 Agent
→ Transfer 跨 Agent 框架迁移
```

---

## 2. 当前分析对象

| 产品文档 | 产品 / 能力 | 类型判断 | 核心问题 |
|---|---|---|---|
| `asymptote-agent-beacon.md` | Asymptote Labs Agent Beacon + Jev | 跨框架 Agent 轨迹层 / reviewed memory / 技能蒸馏层 | 编码 Agent 的会话历史如何变成可审阅、可迁移、可复用的工程经验 |

---

## 3. 与相邻类别的边界

| 类别 | 核心对象 | 典型输出 | 与 Agent Learning Systems 的区别 |
|---|---|---|---|
| Agent Workspace | 文档、表格、HTML、任务产物 | 报告、页面、协作资料库 | 管“任务结果”，不一定理解 Agent 执行过程 |
| Knowledge Base / RAG | 源文档、知识切片、Wiki、引用 | 问答、检索、知识页面 | 管“已有知识”，不一定从运行轨迹中学习 |
| Coding Agent | 代码仓、工具调用、测试、提交 | 代码变更、PR、解释 | 是“执行者”，不一定沉淀跨工具经验 |
| Agent Learning System | 会话轨迹、工具调用、修复路径、候选记忆 | reviewed memory、Skill、MCP 可检索经验 | 管“Agent 做事过程中的可复用经验” |

---

## 4. 评估维度

后续分析这类产品时，建议重点看：

1. **采集覆盖**：支持哪些 Agent / IDE / CLI / 云端代理 / CI？
2. **轨迹完整度**：是否捕获 prompt、response、tool、command、file、approval、MCP、token？
3. **标准化能力**：是否有统一 event schema，能否跨框架对齐？
4. **评估机制**：用规则、LLM、Jev、人工 review，还是混合方式？
5. **经验蒸馏**：能否从 trace 提炼 workflow、debug pattern、repo convention？
6. **人审边界**：候选记忆是否必须审核后才生效？
7. **复用方式**：通过 MCP、Agent Skills、prompt、规则库、配置文件，还是平台内记忆？
8. **安全隐私**：完整会话是否包含秘密、代码、客户数据、健康数据？是否可本地化、脱敏、最小化？
9. **组织治理**：是否支持审计、权限、RBAC、SSO、集中管理、企业级留存？
10. **迁移能力**：经验是否能跨 Claude Code、Cursor、Codex、OpenCode 等框架复用？

---

## 5. 对我们的启示

这类模式对当前项目有两层启发：

### 5.1 对家庭营养师 Agent

家庭营养师项目更需要“用户饮食偏好与家庭状态记忆”，不是代码轨迹记忆。因此不能直接照搬 Beacon。

但可以借鉴它的治理原则：

- 重要长期偏好必须经过用户确认后才能写入长期记忆；
- Agent 每次推荐、修正、失败原因都可以形成可审阅日志；
- 高质量推荐策略可以沉淀成版本化规则；
- 敏感家庭健康信息不能无边界进入外部评估器；
- MCP 工具只读 / 写边界必须明确，不能暴露任意 SQL。

### 5.2 对连山产品

连山如果要做工业 Agent 工作台，Agent Learning Systems 可能是很关键的一层：

```text
工业现场任务轨迹
→ 专家/规则/模型评估
→ 高价值诊断路径沉淀
→ 人审确认
→ 复用为行业 Skill / 工艺规则 / 排障流程
```

这比单纯沉淀报告更有长期价值，因为它让“解决问题的过程”也能复利。
