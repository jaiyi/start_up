# 产品调研：dsh-superagent-prototype（DeepSeek Harness 团队研究原型）

> 调研依据（访问于本次撰写时）：[官方仓库 README](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/README.md)、[领域模型](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md)、[授权](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md)、[执行](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)、[面板](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/005-panel.md)、[许可证](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/LICENSE)。未安装、运行、联通 GitHub/飞书或复现运行效果。`main` 链接为动态版本，实际采用时须固定 commit/tag 重核。
> **重要身份边界**：README 明确称它是“供参考的研究原型，非 DeepSeek 官方产品”，且公开版不等于内部版本或相关文章所述的全部功能；不能因为位于官方组织下就推断其生产可用或产品承诺。

## 1. 是什么

面向**单个 GitHub 仓库**的主动编程 Agent，作为 [DeepSeek Harness](https://www.deepseek.com/en/harness/) bundle 运行，监听 GitHub 和可选飞书消息；满足团队允许的规则或有人明确授权时创建工作项，分配独立 Executor Session/目录工作，再在来源会话反馈（例如给出 PR）。Web 面板优先展示需要人处理的事项，而非最大化通知量。来源：[README：定位与声明](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/README.md)。

```text
Source(GitHub/可选飞书) → Trigger → Thread → Eval(准入 + 评估)
  → Mandate(范围/强度/策略版本) → Ticket → Assignment → Executor
  → 原 Channel 回复 / 人工确认与面板观测
```

## 2. 值得细看的机制

| 机制 | 仓库文档描述 | 采用时必须核证的边界 |
|---|---|---|
| 工单与授权分离 | Trigger 幂等；Eval 决定是否接单，Mandate 固定授权依据、范围、策略版本；Ticket 的生命周期不跟随 DSH Session。来源：[领域模型](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md) | Source 的事件只构成任务候选，不能自动扩大到企业知识/生产 Tool 权限 |
| 显式与推断请求 | allowed list、准入表、`off/observe/auto` 模式；推断规则默认 `observe`，订阅 Thread 的新消息仅补上下文，不提供新授权。来源：[授权](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md) | `auto` 应在隔离环境观测后才考虑；群聊/机器人身份与授权规则须独立评审 |
| 持久执行与人工注意力 | 每 Ticket 一个 Executor Session 与目录；Report/Attention、并发槽、延迟投递、重试、重启恢复以及等待人工的面板分类。来源：[执行](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)、[面板](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/005-panel.md) | 工作目录/Session 并非沙箱；外部副作用恢复前须人工或程序核对，避免重复动作 |
| 来源反馈 | 面板把待处理 Tickets、运行健康、Trigger → Eval → Ticket 历史放在一处。来源：[面板](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/005-panel.md) | 面板/Report 不替代 Git 审核、业务审批或外部系统 receipt |

**重点风险**：[执行文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)写明 Executor 以运行者 OS 用户身份执行命令、无需逐次批准；“blocked commands”按命令名阻拦，不构成安全边界，绝不能将其等同企业级沙箱或最小权限。默认的合并建议属于 Agent 指令，真正强制审查需要 GitHub branch protection；具体策略需在目标仓库验证。

## 3. 与团队知识工程和 SPC 的关系（分析，不是现成集成）

- 可借鉴 `Trigger → Eval → Mandate → Ticket` 的可追溯准入，降低通知噪声，并把“为什么允许做这件事”与“执行器完成了什么”分开。
- 该原型是单仓编程代理，不是 WeKnora 的知识发布仓库。团队正式知识/Skill 是否发布仍看既定的 Git 审核与知识索引读回；Ticket/PR 的完成不代表 DSH 装载或业务成功。
- 若迁移到 SPC 诊断，Mandate 可启发事件授权，但**不能**把示例的 GitHub/飞书身份映射直接套到工厂工单；告警事实、gate 决定与计算节点仍按 [SPC 设计](../../../项目/SPC-DeepSeek-Harness/README.md)由各写 owner 负责。

## 4. 建议的非生产验证

1. 固定提交与 DSH 版本，仅对隔离 GitHub 仓库/虚构事件测试重复 Trigger、并发、重启与人类 follow-up；确认不重复发 PR/评论。
2. 用无权限账号、bot 评论、订阅线程中的诱导指令与撤销 allowed list 测试门禁；不能把 Thread 内容当授权。
3. 限制运行系统身份、容器/工作树、密钥、网络和合并权限，先把默认“无批准运行命令”的行为纳入威胁模型。
4. 分开记录 Agent Report、Git PR/CI/merge 状态、业务验收结果；`pnpm check` 是仓库提供的测试入口，不代表本次已运行。

**许可**：仓库 [LICENSE](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/LICENSE) 为 MIT；运行还依赖 DSH、GitHub/飞书等各自的许可和账号配置。
