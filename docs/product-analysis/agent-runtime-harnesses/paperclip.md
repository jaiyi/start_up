# 产品调研：Paperclip

> 调研日期：2026-10-10
> 调研对象：`paperclipai/paperclip`（开源 Agent orchestration control plane）
> 资料来源：官方仓库 README 与 Developing 文档；未运行本地实例或适配器。
> 分类：agent-runtime-harnesses（Agent 组织、任务与治理控制面）

---

## 1. 一句话定位

**Paperclip 把多个异构 Agent 组织成一家公司：用 org chart、目标、任务、预算、heartbeat、技能、连接器和审批治理“谁做什么、何时醒来、花多少钱、能否执行以及如何追责”。**

## 2. 核心能力拆解

### 2.1 Bring-your-own Agent

可接 OpenClaw、Claude Code、Codex、Cursor、Gemini CLI、OpenCode、Pi、Hermes、Grok Build、Kimi Code 等，也支持 HTTP/webhook/CLI/custom adapter。Paperclip 不把自己的 Agent harness 当成唯一执行实现，而是提供适配器和控制面。

### 2.2 公司与目标模型

系统管理 company、组织结构、Agent 角色、目标、项目、任务、技能、connections、history 和 artifacts。Goal alignment 让任务与公司/项目目标关联，组织边界使不同团队或公司模板可隔离、复制和移植。

### 2.3 Heartbeat 执行链

数据库驱动的 wakeup queue 负责唤醒；执行前 coalesce、预算检查、workspace resolution、secret injection、skill loading，然后调用 adapter；执行后记录 logs、usage、activity，支持 bounded recovery。它把“让 Agent 定时工作”从 cron 脚本升级为可审计的 durable scheduler。

### 2.4 任务并发与治理

Atomic task checkout 避免多个 Agent 抢同一工作；有 approval gates、rollback、反馈、scheduled routines、artifact 和 connection action permissions（Allowed / Ask first / Off）。预算 hard stop 把成本约束放进执行路径，而不是事后看账单。

### 2.5 可移植的公司模板

Skills、connections、secrets、storage、plugins、routines 和 organization boundaries 都是控制面对象，可将一套 Agent 组织方式复制到新团队或项目。

## 3. 与相邻产品的差异

| 维度 | Paperclip | TeamAI | PraisonAI | Helix Foundry | DSH |
|---|---|---|---|---|---|
| 核心隐喻 | Agent 公司 | 团队 Harness 仓 | Agent 栈/编排 | 数据工作空间 | 工业运营组织 |
| 调度 | heartbeat + durable queue | hook/pull | flow/loop | durable jobs | work order/event |
| 并发 | atomic checkout | 资源同步 | agent 协作 | job lease | single-owner work order |
| 治理 | approval/rollback/budget | Git review/role | completion/limits | proposal/publish | gate/fail-closed |
| 执行适配 | 多 adapter | 多客户端配置 | 多模型/运行位置 | app/worker/executor | compute node/operator |

## 4. 优势

1. **控制面抽象完整**：身份、组织、任务、调度、工作区、秘密、预算、插件和活动日志彼此关联。
2. **adapter 解耦**：可管理已有 Agent，而不是要求团队迁移到单一 runtime。
3. **heartbeat 是 durable 运行原语**：唤醒、检查、注入、执行、记录和恢复形成固定链路。
4. **成本与权限前置**：预算 hard stop、连接动作权限和审批 gates 降低自动化失控风险。
5. **任务责任清晰**：goal-aware、atomic checkout、持久上下文和 activity history 让结果可以追责。

## 5. 短板 / 未验证点

1. README/开发文档未充分证明在高并发、跨节点、网络分区下的队列和租约行为。
2. 不同 adapter 的能力、停止/恢复、secret 注入和错误语义可能不一致。
3. “公司”模型适合组织治理，但工业现场还需要设备实时状态、数据质量、告警优先级和安全联锁。
4. 本次没有运行本地 Postgres、浏览器 UI、adapter 和 E2E 流程。

## 6. 适用场景

多 Agent 软件研发、内容/运营团队、周期性 Agent 任务、需要预算和审批的企业自动化、跨团队 Agent 组织模板管理。

## 7. 对我们当前项目的启发

1. **Work order checkout 采用单所有者租约**：一个诊断工单在任一时刻只能由一个 runtime lease 执行，超时后以 fencing token 防止旧 worker 写回。
2. **把 heartbeat 执行链标准化**：唤醒→加载 Pack/profile→检查数据充分性→注入秘密引用→执行算子→记录 trace/usage→提交或等待人工门。
3. **动作权限三态化**：对外部写入、工单状态变更、通知和 Pack 发布分别支持 Allowed / Ask first / Off。
4. **预算是 fail-closed 条件**：token、工具调用次数、计算时间和数据扫描量任一超限都应停在可恢复状态，不能让 Agent自行“再试一次”。
5. **公司模板对应工业 profile 模板**：把岗位、工具、数据源、门禁、SLA、告警路由和知识资产一起版本化。

## 8. 后续需要实测的问题

1. heartbeat 在重复唤醒、进程崩溃、数据库重启和 adapter 超时下是否真正幂等。
2. atomic checkout 与工作区/分支隔离如何组合，是否能防止旧任务写入新工单。
3. budget、approval、rollback 和 secret injection 的审计字段是否足够支持合规复盘。
4. Paperclip adapter 协议能否承载工业算子、MCP 服务和长时间异步计算。
5. 如何把 Agent activity event 映射为 DSH investigation mutation/evidence 事件而不混淆两者语义。
