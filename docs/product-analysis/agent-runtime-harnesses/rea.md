# 产品调研：REA（Reverse Engineer Anything）

> 调研日期：2026-10-10
> 调研对象：`morluto/rea`（MIT，开源 MCP 逆向工程工具集）
> 资料来源：官方仓库 README、官方 `MCP runtime contracts` 文档；未执行本地二进制、浏览器或动态进程实测。
> 分类：agent-runtime-harnesses（证据型工具运行时）

---

## 1. 一句话定位

**REA 不是“替 Agent 逆向”的黑盒服务，而是把二进制、应用、网页、运行时行为等逆向能力统一包装为一个可发现、可校验、可取消、能返回证据的 MCP 工具面。** Agent 负责提出假设和追问，REA 负责在受声明的目标与 provider 上执行分析，并保留证据、限制和可复现的后续引用。

## 2. 核心能力拆解

### 2.1 多对象逆向入口

README 覆盖 native binary、ELF、WASM、EVM bytecode、Linux crash、JavaScript/Electron、网站与 HAR、.NET、Android APK/device、JEB、固件、Apple package/resource，以及进程行为。Native 分析可对接 Hopper、Ghidra、IDA；JavaScript/.NET 静态分析可不依赖 native engine。

### 2.2 MCP 工具目录与能力发现

`tools/list` 返回完整规范目录，即使某项当前不可用；`binary_session` 返回当前 package、server、SDK、协议、目标、provider 绑定和逐工具可用性。调用者应先依据 `tool_availability` 选择当前目标可用的操作，而不是假设“工具存在就一定能调用”。

### 2.3 Evidence 一等记录

分析结果同时以文本和结构化内容返回，包含 `normalized_result`、`evidence_id`、`raw_result`、`analysis_profile` 和限制说明。后续比较、追踪、视图投影可以直接引用同一连接中的 retained Evidence，避免把大对象复制进每轮上下文；必要时可导出原子发布的 Evidence bundle。

### 2.4 生命周期、进度与取消

目标切换会分配 analysis run；provider 绑定在成功选择后保持不变，不在运行时自动换 provider。工具调用支持 MCP progress token、AbortSignal、超时与清理状态，失败时保留部分观察结果，清理不完整会明确列出仍归属 REA 的资源。进度只报告阶段和观察量，不伪造百分比。

### 2.5 面向模型的 schema 兼容

默认完整 JSON Schema 仍由服务端进行规范校验；针对函数调用平台的 schema 大小限制，REA 可用 `REA_MCP_INPUT_SCHEMA_PROFILE=compact` 压缩模型侧广告 schema，但不削弱服务端 canonical validation。这是一种“模型友好的协议投影，权威约束留在服务端”的设计。

## 3. 与相邻产品的差异

| 维度 | REA | 普通 Agent 工具 | Ghidra/IDA 单体工具 | spc_dsh |
|---|---|---|---|---|
| 入口 | MCP 统一工具面 | 自定义函数或脚本 | GUI/API 专用入口 | MCP/API + 工作台 |
| Agent 角色 | 假设、追问、组合证据 | 常直接消费最终文本 | 人或脚本主导 | 诊断推理与人审 |
| 结果 | Evidence、限制、引用、bundle | 多为非结构化文本 | 专用工程数据库 | 诊断证据与图 mutation |
| 安全边界 | 声明目标、provider、资源所有权 | 取决于实现 | 本地工具权限 | 计算节点与受控工具 |
| 可恢复性 | progress、cancel、cleanup、partial observation | 常不完整 | 依赖工具工程状态 | work order / session 状态 |

## 4. 优势

1. **证据而非结论**：每个结论都能回到结构化记录、原始报告、provider profile 和限制说明。
2. **契约先行**：工具目录、输入输出 schema、availability、错误码和迁移约束构成可测试的协议，而不是仅靠 prompt 约定。
3. **大结果可分层传输**：summary、view、page、retained reference、export bundle 让分析深度与 MCP frame 大小解耦。
4. **资源所有权清晰**：只清理由自己启动且能验证归属的进程和临时资源，避免误杀外部进程。
5. **适合多 provider**：provider 选择、绑定、能力、失败和恢复路径显式化，避免隐式 fallback 造成证据不可比。

## 5. 短板 / 未验证点

1. 本次主要阅读 README 和协议文档，没有在本机对 Ghidra、Hopper、浏览器或动态进程做完整实测。
2. 不同 provider 的分析覆盖、冷启动成本和结果稳定性仍需按目标类型分别评估。
3. MCP schema 兼容不等于模型能正确使用复杂工具；仍需用真实 coding/analysis agent 做调用成功率评测。
4. 动态捕获会执行目标声明的本地行为，必须审阅命令、权限、网络和清理策略，不能把它当成无副作用的只读查询。

## 6. 适用场景

本地软件供应链审计、崩溃分析、兼容性重构、恶意样本防御分析、网页/应用行为复现、固件与设备研究，以及需要让 Agent 逐步形成可审计分析证据的逆向工作流。

## 7. 对我们当前项目的启发

1. **把诊断结论改造成 Evidence contract**：每个根因候选、支持关系、反证和人工确认都应有稳定 ID、来源、观察窗口、算子版本和限制，而不是只保存 Agent 最后一句话。
2. **工具可用性应显式返回**：针对工厂、设备、数据源和 profile 的差异，先返回工具/连接器 availability、原因和 remediation，再让 Agent 选择动作。
3. **上下文要支持 retained reference**：诊断图、长日志和时序分析不应全部塞进对话；使用证据引用、摘要、局部视图和导出包，维持传输边界。
4. **取消与清理是业务语义**：诊断任务取消后要区分“未开始、部分证据已发布、资源清理失败、结果可继续复用”，并由状态机承接恢复。
5. **schema 可有模型投影但不能放松权威校验**：可为不同模型提供 compact tool schema，实际写入和跨字段约束仍在工具网关 fail-closed 校验。

## 8. 后续需要实测的问题

1. Ghidra/Hopper 冷启动、并发分析、取消和残留进程清理的实际时间与资源曲线。
2. Evidence bundle 在跨会话、跨节点或跨 work order 传递时的身份与权限模型。
3. 复杂 schema 在 DeepSeek、Claude、Qwen、Kimi 等模型上的 tool-call 成功率。
4. 将 REA 的 retained Evidence 与 Lattice/DSH 的 graph node、evidence、mutation 关联时，采用单向引用还是共享证据注册表。
5. 动态捕获的网络、文件、进程权限如何映射到计算节点的最小权限策略。
