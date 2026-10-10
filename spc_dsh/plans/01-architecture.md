# 架构总览与模块职责

> 上游：[00-overview.md](00-overview.md)

## 1. 分层

```text
┌─────────────────────────────────────────────────┐
│  工作台 UI（独立前端工程，调试/运营两种模式）      │
└──────────────────┬──────────────────────────────┘
                   │ HTTP（用户 token / 运维角色）
┌──────────────────▼──────────────────────────────┐
│  DSH 宿主（server 模式常驻）                     │
│  Profile: spc-station                           │
│  ├─ spc-core（共享内核，非插件）                  │
│  ├─ 插件 gateway —— 全部 HTTP 边界               │
│  ├─ 插件 workorder-diagnosis —— 工单与诊断域      │
│  ├─ 插件 knowledge-config —— 配置与知识域         │
│  ├─ 插件 ops —— 后端部署与治理                    │
│  └─ compute-client（共享库，后端任务派单客户端）  │
└──────┬───────────────────────────┬──────────────┘
       │ 派单 / 任务回调             │ POST 唤醒（工单已落库）
┌──────▼───────────────────────────▼──────────────┐
│  后端计算服务（独立 Python 进程）                 │
│  判异引擎：异常点确认 → 写 alert_events（工单）    │
│           → POST gateway /spc/alerts 唤醒        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  PostgreSQL（全新实例，幂等迁移管理）              │
└─────────────────────────────────────────────────┘
```

## 2. 模块职责

### 2.1 工作台 UI（独立前端）

- DSH 不提供 Web UI，此为独立工程。
- MVP 优先做调试模式：故障树编辑、历史事件回放、候选根因对比。
- 运营面板（五-gate 推进、告警列表）第二步上。

### 2.2 DSH 宿主与 profile

- `spc-station` profile 打包全部插件、spc-core、compute-client 与默认配置。
- **spc-core（共享内核，非插件）**：审计事件写入（持久化失败不伪造成功）、幂等键管理、PG 访问层、发布流水线（Pack 与 config 共用）、Pack 校验、时间纪律。全部插件强制复用，禁止各自手搓。
- **插件 gateway**：唯一 HTTP 边界。路由、鉴权、幂等去重、审计中间件；不含域逻辑，各路由组委托域插件的内部服务。
- **插件 workorder-diagnosis**：工单与诊断域唯一 owner——工单处理状态、五-gate 状态机、诊断会话生命周期、证据查询、推理编排、飞书旁路提醒。
- **插件 knowledge-config**：配置引导草案 + Pack/配置的候选编辑、回放验证与发布治理。
- **插件 ops**：deploy/migrate/rollback/status 的域逻辑；操作经 gateway `/api/ops/*` 由人触发，模型只能调用 status。
- **compute-client（共享库）**：后端任务派单的 TS 薄客户端；消费方为 knowledge-config（回放）与人工触发场景；运营例行任务由后端 cron 自持。
- 会话内 todo/jobs 不是业务真相源；业务状态全部在 Postgres（对齐 17 号文档结论）。

### 2.3 后端计算服务

- 无 DSH 依赖，独立进程，systemd/docker 守护。
- 计算内核从 lads SPC 算法层平移（判异 Nelson/EWMA/CUSUM/T²、控制限训练、能力指数）。
- **工单落库**：判异引擎确认异常后写 `spc.alert_events`（= 工单创建），再 POST 唤醒 DSH——DSH 宕机期间工单照常累积。
- 详见 [03-backend-compute.md](03-backend-compute.md)。

### 2.4 数据库

- 全新 PG 实例，不碰旧库。
- schema 从 lads 迁移文件起步，由 ops 域的迁移 runner 管理。
- 详见 [04-data-and-schema.md](04-data-and-schema.md)。

## 3. 关键数据流

### 3.1 运营模式主线：告警事件即工单（目标态）

```text
测量数据 → 后端判异 → 异常点确认
  → 后端写 spc.alert_events（= 工单创建）
  → 后端 POST gateway /spc/alerts（唤醒信号，event_id 幂等）
  → gateway 校验签名与幂等 → 委托 workorder 域唤醒推理会话
  → workorder 域查证据（控制图、控制限历史、故障树分支）
  → 生成排障建议（区分事实/候选/待查证）→ 诊断会话与结论落库
  → 飞书提醒（旁路：让人知道有工单待处理）
  → 人在工作台走五-gate → 根因结论落库 → 措施 → 效果观察 → 人工闭环
  → 结论回流反馈表 → 驱动故障树迭代（调试模式）
```

诊断产物（证据快照、候选根因、gate 决策、最终结论）**全部持久化**——它们既是工单的审理记录，也是后续故障树迭代的学习原料。

**DSH 宕机语义**：工单照常创建与累积（后端写库不依赖 DSH）；唤醒投递按重试策略进行，耗尽走死信 + 运维告警；DSH 恢复后由 gateway 补唤醒未诊断工单（机制见 [07-open-questions.md](07-open-questions.md) Q10）。

### 3.2 调试模式迭代链

```text
工艺专家在工作台编辑候选故障树/Pack（knowledge-config 域）
  → 回放编排：compute-client 派单 evaluate_batch
    + workorder 域诊断能力对历史事件跑候选 Pack
  → 对比候选根因与已知结论
  → 满意后提交发布 → spc-core 发布流水线（校验 → 专家批准 → 版本号递增）→ 进运营模式
```

### 3.3 计算任务链

```text
compute-client 派单（任务类型 + 参数 + 幂等键）
  → 后端执行器入队、执行、写结果表
  → 回调 gateway /api/tasks/callback（或 compute-client 轮询兜底）
  → 状态与 receipt 落库
```

运营例行的控制限重训与趋势检测由后端 cron 自持，不经 DSH 派单——运行面自持。

## 4. 失败语义

全链路 fail closed：

- gateway 收到未签名/重复/缺字段的 POST → 拒绝并记审计，不触发推理（工单已在库，存在性不受影响）。
- workorder 域查不到 Pack 或 process_key 未注册 → 返回"该工艺未支持"，不回退默认工艺。
- compute-client 任务失败 → 状态机标记 failed + 原因，不静默重试超过上限。
- ops 迁移失败 → 停在当前版本，不半途改库。

对齐现有系统的 fail-closed 传统（state 校验、pack_loader 拒绝、advance bridge 审计持久化失败不伪造成功）。
