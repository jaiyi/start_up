# 产品调研：Tencent TeamAI / AITeam

> 调研日期：2026-10-10
> 调研对象：`Tencent/teamai-cli`（TeamAI，MIT）
> 资料来源：官方仓库 README 与 `product-overview`；未在真实团队 Git provider 上部署。
> 分类：agent-runtime-harnesses（团队级 Harness 分发与学习控制面）

---

## 1. 一句话定位

**TeamAI 把团队对 Agent 的工作方式做成 Git 管理、评审、同步和持续学习的共享 Harness：执行层分发 skills/rules/hooks/MCP/models，Context 层提供团队知识，Improvement 层从会话摩擦中反哺资产。**

## 2. 核心能力拆解

### 2.1 Git-backed 共享执行层

团队资源放在共享 Git 仓库，通过 `teamai push → 分支/MR → review/merge → SessionStart hook → teamai pull` 分发到本地 AI 工具。资源包括 skills、rules、docs、agents、CLAUDE.md、environment、hooks、MCP、packages 和 models。

### 2.2 多维度资源分发

Projects、roles、tags、sources 可控制成员拿到哪些资源；namespace 可以让项目、角色或团队拥有不同的技能、规则、文档和环境。秘密只声明名称，不把值写进共享仓库。这种“资源订阅”比把全部组织规则塞进一个巨大 CLAUDE.md 更可治理。

### 2.3 Team Context

Recall 默认关闭、显式开启后通过 `teamai-recall` 子 Agent 在任务前检索团队知识。`teamai import` / `codebase` 可将代码解析成组件、接口、配置和跨仓依赖图，并以 AST 优先、启发式兜底的方式增强召回。

### 2.4 Team Improvement

Stop hook 按 friction 评分识别“值得沉淀”的会话信号，例如用户中断、拒绝工具调用和工具重试；高摩擦会话可以触发 share learning。`digest`、`session save`、`dashboard` 和 maintenance 提供使用趋势、成本、纠正、知识覆盖和过期清理。

### 2.5 多 Agent 客户端兼容

TeamAI 面向 Claude Code、Codex、Cursor、CodeBuddy、WorkBuddy、OpenCode、Pi、OpenClaw、Hermes、DeepSeek Harness、Qoder、Kiro、Trae、ZCode 等多个客户端，核心资产在客户端之间保持相对中立。

## 3. 与相邻产品的差异

| 维度 | TeamAI | docker-agent | PraisonAI | Paperclip | DSH |
|---|---|---|---|---|---|
| 核心对象 | 团队 Harness 资产 | 单 Agent 配置包 | Agent 运行循环与编排 | Agent 公司/任务控制面 | 工业诊断控制面 |
| 分发 | Git + MR + pull | OCI registry / CLI | YAML/SDK/服务 | company template/实例 | Pack/版本发布 |
| 学习 | friction → learning | eval/session | memory/context | artifacts/feedback | 复盘→FMEA/Pack |
| 权限边界 | project/role/tag/namespace | tool policy/safety mode | execution location | org/connection/approval | tenant/profile/gate |
| 状态 | 资源与学习仓 | session | run/checkpoint | durable task/heartbeat | work order/investigation |

## 4. 优势

1. **把团队经验纳入版本控制**：技能、规则、MCP 和模型配置可以 review、回滚和审计。
2. **分发与学习闭环明确**：不是只提供一个 prompt 仓库，而是把执行、上下文、改进分层。
3. **资源隔离维度丰富**：项目和角色正交，适合大型组织而不必复制整套仓库。
4. **代码图增强召回**：将“相关文档”推进到“相关源码位置”，减少 Agent 重新探索。
5. **秘密边界清楚**：共享配置声明 secret，不把 secret value 放进 Git。

## 5. 短板 / 未验证点

1. Team Context/Improvement 标注为 beta，召回质量、运行成本和组织治理仍需实测。
2. Git 是强审计与分发机制，但对低延迟动态策略、运行时状态和大规模二进制资产并不理想。
3. 多客户端适配层可能存在语义差异；同一 skill、hook、model profile 在各客户端的实际行为需逐一验证。
4. friction 触发学习建议不等于学习内容正确，必须经过人工审核、去重、过期和回滚流程。

## 6. 适用场景

企业内部 coding agent 标准化、研发组织 AI 资产分发、跨项目经验共享、模型与工具策略治理、团队知识库与代码图建设。

## 7. 对我们当前项目的启发

1. **Pack/算子库需要团队级 Git registry**：把平台资产、profile 资产、诊断规则、MCP 连接器和模型策略分层发布，所有变更通过 MR 与门禁。
2. **项目/角色/标签映射到工厂/profile/岗位**：同一个工业平台可让质量、设备、工艺和管理角色订阅不同工具与知识。
3. **以摩擦驱动复盘**：工具拒绝、证据不足、重复调用、人工纠正和诊断回退都可以成为“值得沉淀”的信号，但不能自动写入生产 Pack。
4. **代码图思想扩展为设备/数据图**：不仅检索文档，还要从设备、测点、工艺、工单和数据源之间的结构关系提升诊断召回。
5. **将环境与秘密彻底分离**：共享仓库只声明运行环境和 secret ref，真实凭据留在计算节点 secret manager。

## 8. 后续需要实测的问题

1. Git provider、私有 Git 服务和离线网络环境下的同步冲突与回滚。
2. namespace/role/project/tag 组合规则是否会产生隐式越权或资源遗漏。
3. TeamAI recall 对工业术语、代码图与结构化 Pack 的召回增益。
4. 如何把会话 friction 映射成可验证的 Pack patch，而不是生成泛化总结。
5. 多客户端 hook/MCP/model profile 的兼容矩阵和升级策略。
