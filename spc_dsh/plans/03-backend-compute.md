# 后端计算服务与平台任务契约

> 上游：[00-overview.md](00-overview.md)

## 1. 定位

- 独立 Python 进程，**零 DSH 依赖**；DSH 宕机不影响判异、训练、工单落库、持续取数与唤醒投递重试。
- 计算内核从 lads SPC 算法层平移：Nelson Rules / EWMA / CUSUM / Hotelling T²、控制限训练（含 clamp、分位数法）、能力指数（Cp/Cpk/Pp/Ppk）。
- 进程守护：systemd 或 docker（未决，见 [07-open-questions.md](07-open-questions.md)）。
- 作为 `spc-backend` 服务注册进 plugin-ops（部署、迁移、健康探测统一治理）；后续 profile 的后端服务（拧紧判异计算、排产求解器）以各自描述符注册，任务契约复用本文件 §3。

## 2. 组件

```text
后端计算服务（spc-backend）
├── 任务执行器（Task Executor）
│     ├── 队列消费（pgmq 或内存队列+持久化,未决）
│     ├── 幂等执行（idempotency_key 去重）
│     └── 结果写入 spc.* 结果表
├── 判异引擎（实时路径）
│     ├── 新测量（集成管道持续取数）→ 规则评估 → 违规落库
│     └── 异常点确认 → 写 spc.alert_events（= 工单创建）
│                       → POST platform-gateway /spc/alerts 唤醒（重试 + 至少一次）
├── 定时任务
│     ├── 控制限重训（运营例行由 cron 自持；DSH 侧调试/人工场景经 compute-client 派单）
│     └── 趋势检测（产出告警 → 落库 alert_events → POST 唤醒）
├── 集成管道（plugin-integration 的运行面执行器）
│     ├── 持续取数：MES/设备数据流 → 判异引擎 / 历史回放
│     └── 回写：人工 gate 批准后的措施回写（带出站审计）
└── 健康检查端点（供 plugin-ops status 探测）
```

## 3. 平台任务契约（compute-client ↔ 后端）

> 本契约为**平台契约**：任何受管后端服务的任务派单（SPC 回放、拧紧判异、排产求解）复用同一格式。

### 3.1 派单请求

```text
{
  "service": "spc-backend",
  "task_type": "retrain_control_limits | evaluate_batch | compute_capability | detect_trend",
  "params": { ... 任务类型专属参数,全部 schema 校验 ... },
  "idempotency_key": "<确定性键>",
  "requested_by": "<用户或角色>",
  "submitted_at": "<ISO8601 带时区>"
}
```

后续 profile 新增 `task_type` 时在各自服务内定义专属参数 schema，派单格式不变。

### 3.2 状态与回调

- 状态机：`queued → running → succeeded | failed`；failed 必带 `reason_code`。
- 完成回调 POST platform-gateway `/api/tasks/callback`（由 compute-client 注册的回调消费方校验落库并通知等待方；或 compute-client 轮询 `getTaskStatus` 兜底；二选一，spike 后定）。
- 回调带 `service + task_id + idempotency_key + digest`；消费方校验后落库。

### 3.3 幂等

- 后端以 `idempotency_key` 去重：重复派单返回首次结果引用，不重算。
- 回调消费方（compute-client 消费插件）同样幂等。

## 4. 唤醒投递契约（后端 → platform-gateway）

```text
POST /spc/alerts
{
  "event_id": "<确定性 uuid,沿用 uuid5+时间桶设计>",
  "event_type": "spc_violation | spc_cpk_trend",
  "window_id": "...",
  "process_key": "<稳定工艺标识,端到端必传>",
  "severity": "critical | warning | opportunity",
  "business_alert_time": "<ISO8601 带时区,业务告警时间上界>",
  "occurred_at": "<ISO8601 带时区,投递时间>",
  "metrics": { ... },
  "signature": "<HMAC,密钥由部署配置注入>"
}
```

要点：

- **工单已由后端落库**：判异引擎写 `spc.alert_events`（= 工单创建）后才投递；POST 的语义是"唤醒推理"，不是"创建工单"。投递失败不影响工单存在性。
- `event_id` 由**后端**确定性生成；platform-gateway 只消费不另造，以 `event_id` 幂等去重（重复唤醒返回既有诊断会话引用）。
- `business_alert_time` 与 `occurred_at` 严格区分（前者用于历史证据查询上界）。
- `process_key` 必传且在后端入口校验——修正现有趋势 detector 只带 `process_name`、anchor 回退 Glue 的缺口。
- 重试策略：指数退避，上限 N 次；耗尽 → 死信记录 + 运维告警（通道未决，见 [07-open-questions.md](07-open-questions.md) Q10），工单仍在库中，待 DSH 恢复后由 platform-gateway 补唤醒扫描处理。

## 5. 与旧实现的取舍

| 旧组件 | 处置 |
|---|---|
| lads `_worker/_evaluator.py`（判异+pg_notify 缓存失效） | 平移算法；缓存失效机制视新部署形态简化 |
| lads `_trainer/_trainer.py`（重训+分块 NOTIFY） | 平移训练逻辑；NOTIFY 分块可简化（新架构由回调驱动） |
| demos `runners/pgmq_worker.py` | 替换为后端任务执行器 |
| demos `_spc_trend_detector.py` | 平移趋势算法；anchor 配置改为按 process_key 路由（不回退 Glue） |
| dsruntime Bundle composition 路由 | 作废，DSH 自任路由层 |
