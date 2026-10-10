# 架构总览与模块职责（平台/应用两层）

> 上游：[00-overview.md](00-overview.md)

## 1. 分层

```text
┌─────────────────────────────────────────────────┐
│  工作台 UI（独立前端工程，调试/运营两种模式）      │
└──────────────────┬──────────────────────────────┘
                   │ HTTP（用户 token / 运维角色）
┌──────────────────▼──────────────────────────────┐
│  DSH 宿主（平台，server 模式常驻）                │
│  ┌─ 平台资产（跨 profile 复用）────────────────┐ │
│  │ platform-core / platform-gateway             │ │
│  │ plugin-workorder / plugin-ops                │ │
│  │ plugin-integration / compute-client          │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ Profile: spc-station（薄）─────────────────┐ │
│  │ spc 路由组 / 诊断能力 / 配置引导 + Pack schema │ │
│  │ 服务注册: spc-backend 描述符                  │ │
│  └──────────────────────────────────────────────┘ │
└──────┬───────────────────────────┬──────────────┘
       │ 派单 / 任务回调             │ POST 唤醒（工单已落库）
┌──────▼───────────────────────────▼──────────────┐
│  后端计算服务（独立 Python 进程）                 │
│  判异引擎：异常点确认 → 写 alert_events（工单）    │
│           → POST gateway /spc/alerts 唤醒        │
│  集成管道：持续取数/回写（integration 运行面）     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  PostgreSQL 单实例（platform / spc schema 分域，  │
│  未来 tightening / sched schema）                │
└─────────────────────────────────────────────────┘
```

## 2. 模块职责

### 2.1 工作台 UI（独立前端）

- DSH 不提供 Web UI，此为独立工程。
- MVP 优先做调试模式：故障树编辑、历史事件回放、候选根因对比。
- 运营面板（五-gate 推进、告警列表）第二步上。
- 多 profile 后工作台形态未决（每 profile 独立 UI vs 平台工作台 + profile 扩展），首版按 SPC 专属做。

### 2.2 平台资产（跨 profile 复用，独立版本化）

- **platform-core**：审计事件写入（持久化失败不伪造成功）、幂等键管理、db 访问层（按写权限矩阵约束）、发布流水线（Pack/配置/连接器共用，校验器可注册）、时间纪律。全部插件与 profile 强制复用。
- **platform-gateway**：唯一 HTTP 边界。路由组挂载 API——profile 声明路由组（`/spc/*`），挂载进平台中间件链（鉴权/审计/幂等全局一份）。不含域逻辑。
- **plugin-workorder**：通用工单引擎——工单处理状态、gate 状态机（数量与语义可由 profile 声明）、诊断会话生命周期、反馈闭环。判异类 profile（SPC、拧紧）共用；诊断的具体能力（证据查询、故障树）由 profile 作为能力提供者注入。
- **plugin-ops**：受管服务注册表 + deploy/migrate/status 治理。profile 注册服务描述符（服务名、部署目标、迁移目录、健康端点、schema 归属），ops 对注册表统一执行。
- **plugin-integration**：外部系统连接治理——连接器注册表（版本化定义：端点/协议/契约/限流/重试）、凭据管理（secret 引用）、端点白名单、出入站审计。执行面分两层：持续管道归后端（运行面），交互式查询为 DSH 侧工具/MCP 适配器（管理面）。
- **compute-client**：后端任务派单的 TS 薄客户端；任务契约为平台契约（[03-backend-compute.md](03-backend-compute.md) §3）。

### 2.3 Profile: spc-station（薄）

- spc 路由组（挂载进 platform-gateway）。
- spc 诊断能力：evidence/fault-tree 工具，实现 plugin-workorder 的领域接口。
- spc 配置引导工具 + SPC Pack schema（注册进 platform-core 发布流水线）。
- 服务注册：spc-backend 描述符（挂进 plugin-ops）。
- 会话内 todo/jobs 不是业务真相源；业务状态全部在 Postgres（对齐 17 号文档结论）。

### 2.4 后端计算服务（运行面）

- 无 DSH 依赖，独立进程，systemd/docker 守护（作为 `spc-backend` 注册进 plugin-ops）。
- 计算内核从 lads SPC 算法层平移（判异 Nelson/EWMA/CUSUM/T²、控制限训练、能力指数）。
- **工单落库**：判异引擎确认异常后写 `spc.alert_events`（= 工单创建），再 POST 唤醒 DSH——DSH 宕机期间工单照常累积。
- **集成管道**：持续取数（MES/设备数据流）与回写属运行面，DSH 宕机不断流。
- 详见 [03-backend-compute.md](03-backend-compute.md)。

### 2.5 数据库

- **单实例 PG，schema 按域分域**（platform / spc / 未来 tightening、sched），不碰旧库。
- spc schema 从 lads 迁移文件起步，由 plugin-ops 的迁移 runner 管理。
- 详见 [04-data-and-schema.md](04-data-and-schema.md)。

## 3. 关键数据流

### 3.1 运营模式主线：告警事件即工单（目标态）

```text
测量数据（集成管道持续取数）→ 后端判异 → 异常点确认
  → 后端写 spc.alert_events（= 工单创建）
  → 后端 POST platform-gateway /spc/alerts（唤醒信号，event_id 幂等）
  → platform-gateway 校验签名与幂等 → 委托 plugin-workorder 唤醒推理会话
  → plugin-workorder 编排 spc 诊断能力查证据（控制图、控制限历史、故障树分支）
  → 生成排障建议（区分事实/候选/待查证）→ 诊断会话与结论落库
  → 飞书提醒（旁路：让人知道有工单待处理）
  → 人在工作台走五-gate → 根因结论落库 → 措施 → 效果观察 → 人工闭环
  → 结论回流反馈表 → 驱动故障树迭代（调试模式）
```

诊断产物（证据快照、候选根因、gate 决策、最终结论）**全部持久化**——它们既是工单的审理记录，也是后续故障树迭代的学习原料。

**DSH 宕机语义**：工单照常创建与累积（后端写库不依赖 DSH）；唤醒投递按重试策略进行，耗尽走死信 + 运维告警；DSH 恢复后由 platform-gateway 补唤醒未诊断工单（机制见 [07-open-questions.md](07-open-questions.md) Q10）。

### 3.2 调试模式迭代链

```text
工艺专家在工作台编辑候选故障树/Pack（spc 知识配置能力）
  → 回放编排：compute-client 派单 evaluate_batch
    + plugin-workorder 诊断编排对历史事件跑候选 Pack
  → 对比候选根因与已知结论
  → 满意后提交发布 → platform-core 发布流水线（校验 → 专家批准 → 版本号递增）→ 进运营模式
```

### 3.3 计算任务链

```text
compute-client 派单（任务类型 + 参数 + 幂等键）
  → 后端执行器入队、执行、写结果表
  → 回调 platform-gateway /api/tasks/callback（或 compute-client 轮询兜底）
  → 状态与 receipt 落库
```

运营例行的控制限重训与趋势检测由后端 cron 自持，不经 DSH 派单——运行面自持。

### 3.4 外部系统集成（integration 域）

```text
公司业务系统（MES/ERP/QMS/设备）
  ├── 持续取数（运行面管道,后端执行）→ 判异引擎 / 历史回放
  ├── 交互式查询（管理面,MCP/工具适配器）→ 诊断会话中的证据补充
  └── 回写（拟执行的措施）→ 草案 → 人工 gate → integration 域执行 → 出站审计
```

连接器定义全部经注册表治理：候选 → 契约校验 → 审批 → 版本发布（与 Pack 同一条发布流水线）。

## 4. 失败语义

全链路 fail closed：

- platform-gateway 收到未签名/重复/缺字段的 POST → 拒绝并记审计，不触发推理（工单已在库，存在性不受影响）。
- plugin-workorder 查不到 Pack 或 process_key 未注册 → 返回"该工艺未支持"，不回退默认工艺。
- compute-client 任务失败 → 状态机标记 failed + 原因，不静默重试超过上限。
- plugin-ops 迁移失败 → 停在当前版本，不半途改库。
- plugin-integration 出站调用失败/熔断 → 记录审计与降级原因，回写类操作不静默重试。

对齐现有系统的 fail-closed 传统（state 校验、pack_loader 拒绝、advance bridge 审计持久化失败不伪造成功）。
