# 数据层、建表与迁移治理

> 上游：[00-overview.md](00-overview.md)

## 1. 原则

1. **全新 PG 实例，不碰旧库**（对齐"不切流、直接新建"决策）。
2. **schema 是代码**：DDL 由人写的版本化迁移文件管理，随 profile 发布。
3. **模型不写 DDL**：插件 F 的迁移 runner 只执行已发布的迁移文件。
4. **幂等迁移**：平移 lads `SpcSchemaManager` 模式（`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` + DO 块守卫）。

## 2. 迁移治理

```text
migrations/
├── 0001_spc_core.sql        # 沿 lads _schema.sql 起步：windows/samples/measurements/
│                            #   control_limits/rule_results/capability_results...
├── 0002_spc_push.sql        # 告警路由与反馈（沿 lads _push_ddl.sql 改造）
├── 0003_spc_alerts.sql      # 告警事件表（新:event_id/签名校验记录/通知状态）
├── 0004_diagnosis.sql       # 诊断会话/gate 审计（新:固定 pack_id@version）
├── 0005_knowledge.sql       # Pack 版本/发布审批/知识投影版本
├── 0006_tasks.sql           # 计算任务表（task_id/idempotency_key/状态机）
└── 9999_schema_migrations.sql  # 或由 runner 自管
```

- runner：按序执行未应用版本，`schema_migrations(version, applied_at, applied_by, checksum)` 记录。
- 失败即停在当前版本，输出已应用/未应用清单；**不半途改库**。
- 每次执行落审计事件（谁、何时、目标版本、结果）。
- schema 回滚：v0.1 只支持"回滚到迁移快照"（pg_dump），不写 down 脚本；理由是 SPC 数据不允许丢弃式回滚。

## 3. 核心表（从 lads 平移 + 新增）

### 平移（结构基本沿用）

- `spc.samples` / `spc.measurements` / `spc.control_limits` / `spc.rule_results` / `spc.capability_results` / `spc.windows` 等。
- 保留 `bind_measurement_window` 触发器类的一致性守卫思路（measurement 归属窗口由 sample 决定）。

### 新增/改造

| 表 | 用途 | 关键字段 |
|---|---|---|
| `spc.alert_events` | 告警事件（后端投递的落库镜像） | `event_id(PK)`, `event_type`, `process_key`, `window_id`, `severity`, `business_alert_time`, `occurred_at`, `digest`, `notify_status` |
| `spc.diagnosis_session` | 诊断会话 | `session_id`, `event_id`, `process_key`, **`pack_id`, `pack_version`, `knowledge_projection_version`**（补现有缺口）, `current_gate` |
| `spc.diagnosis_session_event` | gate/审计事件（append-only） | `session_id`, `event_type`, `actor`, `payload` |
| `spc.knowledge_pack_release` | Pack 发布审批 | `pack_id`, `version`, `candidate_digest`, `approved_by`, `approved_at` |
| `spc.compute_task` | 计算任务 | `task_id`, `task_type`, `idempotency_key(UQ)`, `status`, `reason_code`, `result_ref` |
| `spc.config_release` | 接入/参数配置版本 | `config_type`, `version`, `payload`, `status(draft/active)`, `approved_by` |

### 借鉴修正

- `push_feedback` / `workorder_feedback` 双反馈源设计在新架构下合并为**单一反馈表**，统一带 `source_event_id` + `process_key` + `pack_version` 血缘（旧 workorder_feedback 缺 process_key 的教训）。

## 4. 数据接入

- 首版文件源：CSV/DB 表批量导入（`evaluate_batch` 任务回放历史）。
- 实时路径：后端判异引擎消费新测量。
- window 分割、检测项白名单等配置由插件 A 生成草案、人工发布后生效（`spc.config_release`）。

## 5. 备份与可观测

- 每日 pg_dump + 迁移前快照（回滚依赖）。
- 表级监控：队列深度、告警投递失败数、gate 审计写入失败数——任何"审计写失败"都视为系统不健康而非可忽略日志。
