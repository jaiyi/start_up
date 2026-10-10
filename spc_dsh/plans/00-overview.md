# SPC × DeepSeek Harness 架构设计稿

- 版本：v0.1（讨论稿，未实施）
- 日期基线：2026-09-29 会话对齐结果
- 状态：设计框架已与用户对齐方向；细节含未决问题（见 [07-open-questions.md](07-open-questions.md)）
- 范围声明：本文档是架构规划，不是集成完成声明。未加载插件、未运行测试、未部署、未取得线上 receipt。

## 1. 决策背景

现有 SPC 实现分散在四个仓库（`lads`、`demos`、`dsruntime`、`workstation-iclaw`），对齐繁琐、升级困难。
经头脑风暴式讨论，用户已拍板：

1. **全盘替代**：现有 runtime/dsClaw 工单链、demos iweb 诊断面板全部替代，DSH 成为 SPC 的统一 Agent 平台。
2. **计算外挂**：SPC 计算（判异、控制限训练、CPK）由 agent 挂到后端服务器独立进程执行。
3. **统一 profile + 工作台**：SPC 整体封装成一个 profile，含专属工作台 UI（调试模式 + 运营模式）。
4. **管理面前置**：后端服务的部署、建表、升级由前台插件统一发起和管理。

## 2. 目标形态

```text
DSH（统一宿主，server 模式常驻）
├── Profile: spc-station
│     └── 专属 SPC 工作台（调试模式 + 运营模式）
├── 插件 A：数据接入配置引导（文件源、window 分割、参数设定）
├── 插件 B：计算任务编排（派单给后端，回调/轮询收结果）
├── 插件 C：诊断执行（故障树查询、证据收集、候选根因）
├── 插件 D：告警网关（接收后端 POST 唤醒 → 推理 → 飞书群）
├── 插件 E：工作台后端 API（供 UI 调用，带鉴权）
└── 插件 F：后端部署与治理（部署、schema 迁移、健康检查、回滚）

后端服务器（运行面，独立 Python 进程，无 DSH 依赖）
├── SPC 计算内核（判异、控制限训练、CPK —— lads 算法层平移）
├── 任务执行器（接插件 B 派单，算完 POST 回插件 D）
└── 数据库（全新 PG 实例 + lads 迁移文件起步的 schema）
```

## 3. 核心边界（不因换宿主而消失的底线）

### 3.1 管理面与运行面分离

- 插件管"发命令"，后端管"自己活着"。
- 部署完成后，计算进程与数据库自持运行；DSH 重启/宕机不影响判异与告警。
- 插件 F 的操作（deploy/migrate/rollback）要求运维角色权限 + 审计事件；模型只能读 status。

### 3.2 建表：插件来跑，模型不写 DDL

| 内容 | 产生方式 | 入库方式 |
|---|---|---|
| schema DDL | 人写的版本化迁移文件，随 profile 发布 | 插件 F 迁移 runner 幂等执行，逐版本记录 |
| 工艺配置 | Agent 引导生成 + schema 校验 | 人工确认后由插件写入配置表 |
| 故障树 / Diagnosis Pack | 调试模式迭代 | 校验 → 审批 → 版本发布 |

**模型不得现场生成并执行 `CREATE TABLE`。**
迁移 runner 平移 lads `SpcSchemaManager` 的幂等模式（`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`），
叠加 `schema_migrations` 版本表与审计。

### 3.3 五个人工 gate 保留

问题定性 → 诊断路径 → 根因查证 → 措施决策 → 效果观察与闭环。
在 DSH 工作台做成状态机 + 审计事件；Agent 推理辅助每个 gate，**gate 推进和关单由人操作**。

### 3.4 Agent 不改生产知识（≠ 运营模式只读）

- 运营模式持续写**业务数据**：诊断会话、证据快照、根因结论、gate 推进、效果观察、反馈——这是闭环和故障树迭代的原材料，必须留存。
- 运营模式禁止写**生产知识**：故障树、控制限、SPC 规则、设备参数——这些只在调试模式产出候选，经校验、专家批准、版本发布后进运营模式。
- 模型可提议映射和分支，不能直写生产故障树、控制限、SPC 规则。

### 3.5 事件幂等与真相源

- 沿用确定性 `event_id` 设计（uuid5 + 时间桶），后端与 DSH 侧不得各造身份。
- 工单/诊断会话唯一真相源 = profile 的持久层（Postgres，非 DSH 会话内存）。
- 诊断会话必须固定当次使用的 Pack/知识投影版本（现有 `diagnosis_session` 缺失的字段，替代版补上）。

## 4. 主线：一条告警事件就是一张工单

```text
告警事件（= 工单）
  → 创建诊断会话（固定 Pack/知识版本）
  → 五-gate：问题定性 → 诊断路径 → 根因查证 → 措施决策 → 效果观察
  → 结论与根因落库 → 人工闭环
  → 结论回流反馈表 → 驱动故障树迭代（调试模式）
```

飞书推送是**旁路提醒**（让人知道有工单待处理），不是主线；闭环全部在工作台/诊断会话内完成。

## 5. 两种模式

| | 调试模式 | 运营模式 |
|---|---|---|
| 用途 | 故障树迭代、配置调参、历史事件回放 | 工单诊断、告警响应、闭环 |
| 写业务数据（会话/结论/反馈） | 可 | **可（主线依赖）** |
| 写生产知识（故障树/规则/控制限） | 可写候选 | **禁止**（仅消费已发布版本） |
| 知识变更 | 随意改候选 Pack | 仅经审批发布的新版本生效 |
| 飞书推送 | 不触发 | 提醒用，非主线 |

## 6. 迁移策略

- **不切流、直接新建**：现有四仓无线上流量（e2e 报告 NOT RUN，无 live identifiers），旧仓封存作参考实现与算法库。
- 可平移：lads SPC 算法层、数据库表结构与迁移文件、故障树/Pack YAML 格式与校验逻辑、五-gate 流程语义。
- 需重写：demos pipeline 编排（改插件 B 派单）、iweb 面板（改新工作台 UI）、dsClaw 工单/审核流（改插件 E API）、飞书推送（DSH 侧新接）。
- 作废：runtime Bundle composition 路由（DSH 自任路由层）。

## 7. 最大的技术未知数（第一刀）

**DSH 常驻 server + 外部 POST 唤醒会话，未验证。**
当前仅核对过 CLI 形态（`@deepseek-ai/dsh@0.2.0-rc.2`）与插件注册 API 类型声明。
若 spike 失败，唤醒机制退化为后端队列轮询，整体架构需重新评估。

Spike 验证步骤见 [06-spike-plan.md](06-spike-plan.md)。

## 8. 文档索引

- [01-architecture.md](01-architecture.md) — 架构总览与模块职责
- [02-plugins.md](02-plugins.md) — 插件 A–F 职责与接口清单
- [03-backend-compute.md](03-backend-compute.md) — 后端计算服务与任务契约
- [04-data-and-schema.md](04-data-and-schema.md) — 数据层、建表与迁移治理
- [05-diagnosis-and-learning.md](05-diagnosis-and-learning.md) — 诊断工作流、Pack 契约与自学习闭环
- [06-spike-plan.md](06-spike-plan.md) — 第一刀技术 spike 验证清单
- [07-open-questions.md](07-open-questions.md) — 未决问题与风险登记
