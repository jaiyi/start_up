# 产品调研：Kestra 工作流编排平台

> 调研日期：2026-10-28。依据 [Kestra 官方仓库](https://github.com/kestra-io/kestra)、[官方文档](https://kestra.io/docs/)、[架构说明](https://kestra.io/docs/architecture)、[许可证](https://github.com/kestra-io/kestra/blob/develop/LICENSE)。未部署或实测；官方 README 的功能以访问时的 `develop` 分支为准，不能推断任意已安装旧版本都具有同样能力。
> 分类：事件驱动的工作流 / 数据与基础设施自动化编排；能调用 AI 任务，但核心不是对话 Agent 或知识资产的审核仓库。

## 1. 定位与基本对象

Kestra 使用声明式 YAML 定义 Flow，在 UI 中编辑/观察任务执行，组合调度与事件触发来编排数据、AI 与基础设施工作流。其基础对象是 **Flow、Task、Namespace、Trigger、Inputs/Variables、Outputs**；README 同时列出执行前 Checks 与执行配额 Quotas。[来源：官方 README 核心概念](https://github.com/kestra-io/kestra/blob/develop/README.md#-key-concepts)。

```text
定时 / 事件 / API 触发 → Flow（任务、输入与执行状态）
                         → 插件任务 / 脚本 / 容器 / 外部服务
                         → 输出、日志、失败与后续处理
```

## 2. 可用能力与边界

- **跨系统编排**：插件提供 HTTP、数据库、消息系统、云服务、容器和脚本执行；可用任务形态与具体插件/Runner 配置有关。Flow 的可视化编辑、YAML 编辑与 AI Copilot 可以面向同一工作流配置，Git 版本控制也有集成路径，但“有 Git 集成”不等于资产已按指定审核链合并。[官方 README](https://github.com/kestra-io/kestra/blob/develop/README.md)。
- **触发与长任务**：支持定时和事件型触发、参数/产物传递、运行状态与观测；具体重试、暂停、失败恢复与幂等能力应按目标版本和所选 Task/插件验证，不能把平台有重试等同于下游 API 具备事务原子性。[官方文档](https://kestra.io/docs/) · [架构说明](https://kestra.io/docs/architecture)。
- **AI 应用**：README 提及模型任务、AI Agent 与 RAG 流程插件，可为批量文档加工或评测编排外围任务；并不因此获得 DSH 对话宿主授权、WeKnora 文档 ACL 或 Git 审核权限。[官方 README 插件生态](https://github.com/kestra-io/kestra/blob/develop/README.md#-plugin-ecosystem)。
- **部署与授权**：仓库标明 [Apache-2.0](https://github.com/kestra-io/kestra/blob/develop/LICENSE)；具体发行形态、插件、组织安全能力及运维支持须与对应版本/商业层级逐项核查，而非由仓库许可证推断所有功能免费。

## 3. 对团队知识工程的适用性（分析判断）

Kestra 可以候选承担**后台异步编排**：例如审核合并后依次触发知识索引、WeKnora 指定版本读回、重试/告警和最终状态回传，或跑固定语料的 Skill 回归评测。但**工作过程状态和正式资产权威仍分别由 PG、Git、WeKnora 与 DSH 宿主承担**；Kestra 的 Flow 完成也不等于正式知识可授权检索、Skill 已安装或业务结果成功。

若引入，应由 Workbench/后端显式传入经核权的 `operation_id`、资产版本、身份与空间，设计出站队列、幂等键、任务状态对账、最小权限和失败补偿；不要让 Kestra 用一个管理员身份静默抓取个人 Inbox 链接。首期若现有后端任务队列足以满足规模与可靠性，可先验证最小路径，避免为单条流程引入新的运维控制面。

## 4. 验证计划

1. 固定目标版本，做“Git merge → WeKnora 索引 → 指定版本 ACL 检索读回 → 状态反馈”的非生产纵向测试。
2. 断网、超时、重复事件、部分成功与撤权时，观察重试/补偿和最终一致性；用真实下游回执而非 Flow 成功标志做发布门禁。
3. 明确流程编辑权限、密钥托管、插件代码与容器执行隔离、审计/日志脱敏、备份升级成本。
4. 与当前 DSH 原生任务和 PG 异步机制比较，不为引入编排器而复制任务状态的权威来源。

**证据边界：**以上为公开资料和架构推断；未运行 Kestra 或验证与 DSH、Git、WeKnora 的现成集成。
