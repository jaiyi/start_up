# MVP 实施、验证与验收

> 本文是唯一的实施路线和验收入口。其他文档不能自行增加阶段、提前硬依赖或把待验证能力写成已支持。

## 1. 交付方式

采用：**一条垂直链、一个 provider、一个知识域、一个 worker、一个审核 owner**。

每个阶段都必须留下版本、环境、fixture、运行命令、预期/实际结果、失败动作、owner、回滚方式和 Go/No-Go 决策。

## 2. P0：边界与能力侦察

### 交付

- 一个真实但脱敏、可回放的知识样本集；
- steward、备份 steward 和平台 owner；
- 最小知识 schema、状态机、fake Git/WeKnora provider；
- 固定目标版本和能力记录；
- DSH、WeKnora、SkillHub 的可用/不可用边界；
- 不使用生产 Token 的验证证据。

### 退出

schema、非法状态、幂等、错误路径和人工 fallback 均有测试；所有未知能力都有 owner、验证日期和处理方式。

## 3. P1：知识闭环

### 交付

收件箱、知识卡片、变更包、一个 Git provider、CI/CODEOWNERS、审核记录、WeKnora ingest/status/search、最小 audit/run/feedback/review_task 和故障 runbook。

### 退出

非程序员无需操作 Git；重复请求不重复创建 MR/索引；CI 失败阻止合并；approved/published/index_failed 有不同证据；检索结果带 document ID、版本、来源和 ACL；故障可人工接管。

## 4. P2：反馈与运营闭环

### 交付

运行和反馈关联、反馈分类、复核队列、每周复核、每月质量报告、stale/零使用/纠正率异常提醒、备份 owner 和退役流程。

### 退出

反馈不直接改正式正文；连续 4 周有真实使用和复核记录；至少一个质量指标改善，或确认场景没有价值；超时、重复、丢回调和未知状态可人工对账。

## 5. P3：Skill 非生产试点

进入条件是 P1/P2 稳定，且有一个高频、低风险、可回放任务。

Skill 必须有输入/输出 schema、effects/permissions、golden cases、非生产 profile、固定 digest、回归和回滚记录。SkillHub 未验证时保持管理员发布，stable 必须明确批准并可回到旧 pin。

## 6. P4：控制台/Gateway 演进

只有在两个知识域稳定使用、第二个 provider、人工状态查询成为明显瓶颈、集中权限/审计需求或模块化单体无法接受地测试发布时，才拆 Console Plugin、Integration Gateway、adapter、签名事件和低风险 MCP。

新增层不能改变权威边界，不能让 Agent 直接 merge、publish 或扩大权限。

## 7. P5：Bot、Plugin 与高风险能力

只有在低风险知识和 Skill 已证明价值，且具备隔离构建、依赖扫描、审批、二次确认、观测和回滚后，才验证 DeepSeek Bot 协作、Plugin 或生产写入。

## 8. 统一验收矩阵

| ID | 验证项 | 通过标准 |
|---|---|---|
| V-01 | 样本和角色 | 脱敏样本、owner/steward/备份齐全 |
| V-02 | schema 和状态 | 合法/非法/重复/并发迁移有测试 |
| V-03 | Git 变更 | 路径安全、MR 幂等、CI/审批有效 |
| V-04 | WeKnora 索引 | 来源/版本/ACL 可读回，失败保留旧版 |
| V-05 | 非程序员体验 | 不操作 Git 可完成闭环 |
| V-06 | 运行归因 | run 关联 asset、commit、knowledge version |
| V-07 | 反馈复核 | 反馈生成任务，不自动改正式资产 |
| V-08 | Skill 回归 | schema、golden、digest pin、回滚有效 |
| V-09 | 外部能力 | 目标版本真实验证，未知能力人工处理 |
| V-10 | 安全审计 | 无 secret 泄露、越权和不可追踪写入 |
| V-11 | 故障恢复 | 超时、丢回调、重复和未知状态可对账 |
| V-12 | 运营价值 | 减少重复劳动或明确停止扩展 |

详细平台实验见[验证材料](../验证/README.md)。

## 9. Coding agent 交付规范

每次只给 coding agent 一个小任务包：背景、范围、输入输出、禁止事项、失败测试、最小实现、验收命令、证据路径和回滚方式。schema/状态机优先于 UI 和真实 provider，fake provider 优先于生产凭据。

Agent 不拥有生产凭据，不直接 merge `main`，不执行任意 shell/路径，不隐藏未验证能力。完成后必须做独立 code review、安全 review 和范围检查。

## 10. Go/No-Go

以下任一项不通过，就保持当前阶段：权限隔离、审计完整性、未知状态处理、旧版本保留、回滚、人工接管、secret 扫描、非程序员可用性或真实业务价值。
