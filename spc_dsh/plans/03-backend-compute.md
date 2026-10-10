# 计算节点与平台任务契约

> 上游：[00-overview.md](00-overview.md)
> v0.3.1（2026-10-10 三轮评审）：后端从"SPC 后端服务"重新定义为**通用计算节点**——具备计算与存储能力的 Docker，独立自持运行；SPC 是挂载其上的第一个工作负载。管理（算什么/怎么算/pipeline 怎么搭）全部收拢到 DSH 侧，经版本化工件**管理时发布**，后端从 PG 读配置自持运行。

## 1. 定位：通用计算节点 + 工作负载

### 1.1 三层资产

| 层 | 内容 | 形态 |
|---|---|---|
| **计算节点（compute node）** | 任务执行器 + 判异引擎（流处理）+ PG 存储 + 健康端点 | Docker 容器，**无业务逻辑**，独立自持运行 |
| **算子（operators）** | Nelson/EWMA/CUSUM/T² 判异、控制限训练、能力指数、趋势检测；未来拧紧曲线特征判异等 | 版本化包，随节点部署 |
| **流水线（pipelines）** | 数据源 → window 分割 → 算子编排 → 落库/告警 | 声明式定义（版本化工件，经发布流水线生效） |

多 profile 的复用单位由此从"整个后端服务"细化为**算子 + 流水线定义**：拧紧 profile 不需要自己的后端，只需注册拧紧算子、发布拧紧流水线（见 [07-open-questions.md](07-open-questions.md) Q12）。

### 1.2 管理时发布，非运行时控制（关键边界）

"DSH 把算什么、怎么算、pipeline 怎么搭挂到后台去"的正确实现是**管理时发布**，不是运行时控制：

- **❌ 运行时控制**：DSH 向后端实时下发"算什么"的指令流——后端运行时依赖 DSH，违背运行面自持底线（00 §3.1），DSH 宕机 = 判异停摆。
- **✅ 管理时发布**：算什么/怎么算/pipeline 定义全部走**版本化工件**，工件落 PG，**后端从 PG 读自己的配置自持运行**。DSH 只在变更时刻出现。

两类生产知识的对称治理（00 §3.4 原则的推广）：

```text
DSH 侧生产知识：Diagnosis Pack（故障树/诊断逻辑）  → 发布流水线 → 诊断会话消费
后端生产知识：  算子 + 流水线定义（判异/训练/编排） → 同一条发布流水线 → 计算节点消费
```

模型只能产候选，专家审批后版本化生效——对计算定义同样成立。

运行时例外：compute-client 派单的**临时任务**（回放、手动重训）是按需作业，不是运营管线的控制指令，不构成运行时依赖。

### 1.3 节点自身

- 独立 Python 进程，**零 DSH 依赖**；DSH 宕机不影响判异、训练、工单落库、持续取数与唤醒投递重试。
- 进程守护：**Docker**（计算节点模型的自然形态；见 [07-open-questions.md](07-open-questions.md) Q2）。
- 作为计算节点服务注册进 plugin-ops（部署、迁移、健康探测统一治理）；后续 profile 的算子与流水线以各自工件挂载，任务契约复用本文件 §3。

## 2. 组件

```text
计算节点（spc-backend 起步,通用形态）
├── 任务执行器（Task Executor）
│     ├── 队列消费（pgmq 或内存队列+持久化,未决）
│     ├── 幂等执行（idempotency_key 去重）
│     └── 结果写入 spc.* 结果表
├── 判异引擎（流处理,运营流水线内联）
│     ├── 新测量（集成管道持续取数）→ 规则评估 → 违规落库
│     └── 异常点确认 → 写 spc.alert_events（= 工单创建）
│                       → POST platform-gateway /spc/alerts 唤醒（重试 + 至少一次）
├── 流水线运行器（pipeline runner）
│     ├── 启动/重载时从 PG 读取已发布的流水线定义
│     └── 按定义编排算子（实时路径 = 判异引擎内联;批量路径 = 派任务执行器）
├── 算子库（版本化,随节点部署）
│     ├── 判异算子：Nelson Rules / EWMA / CUSUM / Hotelling T²（lads 平移）
│     ├── 训练算子：控制限训练（含 clamp、分位数法）（lads 平移）
│     └── 分析算子：能力指数 Cp/Cpk/Pp/Ppk、趋势检测（lads 平移）
├── 定时任务（运营例行,后端 cron 自持）
│     ├── 控制限重训（DSH 侧调试/人工场景经 compute-client 派单）
│     └── 趋势检测（产出告警 → 落库 alert_events → POST 唤醒）
├── 集成管道（plugin-integration 的运行面执行器）
│     ├── 持续取数：MES/设备数据流 → 判异引擎 / 历史回放
│     └── 回写：人工 gate 批准后的措施回写（带出站审计）
└── 健康检查端点（供 plugin-ops status 探测）
```

## 3. 平台任务契约（compute-client ↔ 计算节点）

> 本契约为**平台契约**：任何受管计算节点的任务派单（SPC 回放、拧紧判异、排产求解）复用同一格式。

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

后续 profile 新增 `task_type`（即新算子暴露的任务面）时在各自流水线定义中声明专属参数 schema，派单格式不变。

### 3.2 状态与回调

- 状态机：`queued → running → succeeded | failed`；failed 必带 `reason_code`。
- 完成回调 POST platform-gateway `/api/tasks/callback`（由 compute-client 注册的回调消费方校验落库并通知等待方；或 compute-client 轮询 `getTaskStatus` 兜底；二选一，spike 后定）。
- 回调带 `service + task_id + idempotency_key + digest`；消费方校验后落库。

### 3.3 幂等

- 后端以 `idempotency_key` 去重：重复派单返回首次结果引用，不重算。
- 回调消费方（compute-client 消费插件）同样幂等。

## 4. 唤醒投递契约（计算节点 → platform-gateway）

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

- **工单已由计算节点落库**：判异引擎写 `spc.alert_events`（= 工单创建）后才投递；POST 的语义是"唤醒推理"，不是"创建工单"。投递失败不影响工单存在性。
- `event_id` 由**后端**确定性生成；platform-gateway 只消费不另造，以 `event_id` 幂等去重（重复唤醒返回既有诊断会话引用）。
- `business_alert_time` 与 `occurred_at` 严格区分（前者用于历史证据查询上界）。
- `process_key` 必传且在后端入口校验——修正现有趋势 detector 只带 `process_name`、anchor 回退 Glue 的缺口。
- 重试策略：指数退避，上限 N 次；耗尽 → 死信记录 + 运维告警（通道未决，见 [07-open-questions.md](07-open-questions.md) Q10），工单仍在库中，待 DSH 恢复后由 platform-gateway 补唤醒扫描处理。

## 5. 算子与流水线的定义及发布（管理面）

### 5.1 算子交付链（显式四步）

算子从代码到运行面经过四步，每步有明确的角色、工具与真相源；DSH 不承担"写代码通道"：

```text
① 写代码    算法工程师在算子库仓库/IDE 写算子 Python 模块（含单测）
              ——不在 DSH 会话里写;DSH 不提供改生产算子代码的工具
② 归档      commit → PR → code review → merge（真相源 = 算子库仓库的 Git 历史）
③ 构建      CI 构建：算子库 → 构建产物（打进计算节点镜像,或版本化包）,digest 固定
④ 部署      plugin-ops deploy（唯一合法入口,人工 gate + 审计 + receipt）
              → 节点重启/重载,新算子生效
```

- **代码真相源 = 算子库仓库，不是 DSH 会话**（对齐 00 §3.5"会话不是真相源"的既有原则）：部署产物 digest 必须与 Git 版本对应，审计链条才闭合。会话内产生的算子代码不构成任何部署效力。
- 角色分层由此自然成立：**普通工艺工程师不碰算子本体**（调试模式里只能做参数与算法选择,即 `guide_spc_params` + `run_replay`）；算子代码变更走 ①–④,责任主体是算法工程师 + code review + 运维审批。
- 算子不单独热更新（避免半版本状态）——变更是部署事件,不是会话内动作。
- 仓库与 CI 的工程归属未决（Q18）。

### 5.2 算子调试（算法工程师经 DSH）

改的动作在仓库（①②）,**验证与部署的回路在 DSH**：

```text
工程师在仓库改算子 → PR → merge → CI 构建出候选版本（②③,DSH 之外）
  → 工程师进 DSH 调试会话（算法工程师角色）
  → 经 compute-client 派 debug_operator 沙箱任务：
      candidate = 构建产物引用（digest）,不是会话内代码
      dataset   = 历史窗口/CSV（只读）
      compare_baseline = 当前已发布算子@版本
  → 回放对比报告回会话（增益/回归/告警差异）——报告不落任何生产表
  → 满意 → 会话内发起 deploy（plugin-ops,人工审批,审计+receipt）→ 新算子上线
```

`debug_operator` 任务面（新增 task_type,与生产任务面隔离）：

```text
task_type: "debug_operator"
params: {
  candidate_ref,              # 构建产物引用（digest）或参数变体
  dataset: {...历史窗口/CSV,只读},
  compare_baseline: "<已发布算子@版本>",
  idempotency_key: ...
}
```

沙箱边界（fail closed）：独立进程/容器受限执行；资源限额与超时熔断；只读历史数据、无网络、无凭据、无生产表写路径；结果只进回放对比报告，`spc.compute_task` 记录任务但 `result_ref` 指向回放产物。候选算子代码是模型/人产出的不可信输入，执行环境由节点配置声明。

**首版实现分寸（02 §9 纪律）**：`debug_operator` 的任务面与沙箱边界**现在定义**（结构决策）；首版实现只到**参数变体**（`candidate_ref` = 参数集），`candidate_code_ref`（代码级候选）在契约中留位、等真实诉求触发再实现（Q17）。

### 5.3 流水线定义

- 声明式工件，经 platform-core 发布流水线（候选 → 校验 → 审批 → 版本落库 `spc.pipeline_release`）生效；计算节点启动/重载时从 PG 读已发布版本，**不从 DSH 取**。
- 模型可以经 spc 配置引导工具产流水线/参数**候选**，发布必须专家/运维人工 gate。
- **首版实现按 SPC 具体做**："流水线"首版退化为现有 `config_release`（window 分割、参数配置）+ 判异/训练/回放的固定编排——已是这个方向，只是不叫流水线。通用流水线 DSL 与算子注册表机制等拧紧 profile 触发（02 §9 纪律）。

## 6. 与旧实现的取舍

| 旧组件 | 处置 |
|---|---|
| lads `_worker/_evaluator.py`（判异+pg_notify 缓存失效） | 平移为判异算子；缓存失效机制视新部署形态简化 |
| lads `_trainer/_trainer.py`（重训+分块 NOTIFY） | 平移为训练算子；NOTIFY 分块可简化（新架构由回调驱动） |
| demos `runners/pgmq_worker.py` | 替换为计算节点任务执行器 |
| demos `_spc_trend_detector.py` | 平移为趋势检测算子；anchor 配置改为按 process_key 路由（不回退 Glue） |
| dsruntime Bundle composition 路由 | 作废——其"组合路由"意图由流水线定义工件承接（发布治理版） |
