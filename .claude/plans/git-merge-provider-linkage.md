# Git 合并后知识索引与 Skill 分发联动设计补充计划

## 目标
将“Git merge event → Workbench outbox/worker → 下游 provider → 真实 readback”的异步发布链补充到现有团队知识工程方案，明确 WeKnora、SkillHub、TeamAI 和 DSH 的职责边界、状态、幂等、失败处置与验收证据。

## 修改范围

1. `项目/团队知识工程/README.md`
   - 将知识发布、Skill 发布、TeamAI 分发和 DSH 装载拆成连续链路。
   - 明确 merge、published、released、installed、loaded、succeeded 不等价。

2. `项目/团队知识工程/方案/00-方案总览与关键决策.md`
   - 更新首期生产线、核心决策、阶段退出条件和 MVP 成功标准。
   - 明确 SkillHub 是 Skill release/digest 权威，TeamAI 只分发已固定 digest，管理员仅作 fallback。

3. `项目/团队知识工程/方案/02-端到端知识工作流.md`
   - 详细补充 Git merge event、event receipt/outbox、worker、WeKnora ingest/readback。
   - 详细补充 Skill merge、package/digest、SkillHub release/readback、TeamAI distribution/readback、DSH handoff/load。
   - 增加责任证据和异常分支。

4. `项目/团队知识工程/方案/03-知识资产与生命周期.md`
   - 区分资产生命周期和外部 operation 状态。
   - 增加 SkillHub release、TeamAI installed、DSH loaded 的发布/分发证据及 pinned digest 关系。

5. `项目/团队知识工程/方案/05-系统架构与权威边界.md`
   - 扩展拓扑和组件职责，明确 outbox/worker/readback。
   - 拆分 Git merge event、WeKnora index、SkillHub release、TeamAI distribution、DSH handoff 的权威边界。

6. `项目/团队知识工程/方案/06-数据、状态与可追溯性.md`
   - 增加统一 operation 状态、事件/任务/读回字段、幂等键和最小追踪链。
   - 固化知识 ingest、SkillHub release、TeamAI distribution、DSH handoff 的证据要求。

7. `项目/团队知识工程/方案/07-发布、安全与故障处置.md`
   - 作为发布链的规范章节，重写知识发布、Skill 发布和分发交接链。
   - 增加事件安全、provider unknown、digest 漂移、fallback、回滚和审计规则。

8. `项目/团队知识工程/方案/08-MVP实施、验证与验收.md`
   - 将事件、outbox、readback、digest 一致性纳入 P0/P1/P3 和 Go/No-Go 验收。

9. `项目/团队知识工程/验证/01-平台与Provider能力验证.md`
   - 拆分并补充 Git event、outbox/worker、WeKnora readback、SkillHub release/readback、TeamAI/DSH 分发验证实验。

10. `项目/团队知识工程/方案/04-角色、治理与运营机制.md`
    - 细化 merge 接收、worker、WeKnora 对账、SkillHub release、TeamAI 安装和 DSH handoff 的责任与指标。

## 统一术语和规则

- `merge event` 是触发事实，不是业务发布成功。
- Workbench PostgreSQL/outbox/worker 负责异步编排、幂等、租约、重试、对账和补偿，不保存 canonical 正文。
- WeKnora 只有 document/version/source/ACL 读回并通过检索冒烟后，知识才是 `published`。
- Skill 从固定 merge commit 构建 immutable package/digest；SkillHub 读回一致的 release/digest 后才是 `released`。
- TeamAI 只能消费 SkillHub 已确认的 pinned digest，安装读回一致后才是 `distributed/installed`。
- DSH 读回目标 profile 和 loaded digest 后才是 `loaded`；任何环节不能把成功请求或 HTTP 200 当成最终业务成功。
- 统一幂等键：event 使用 `event_id`；知识 ingest 使用 `merge_commit + knowledge scope`；SkillHub 使用 `skill_id + package_digest`；TeamAI/DSH 使用 `target + profile + pinned_digest`。
- provider 半成功或读回超时进入 `unknown/reconciling`，禁止盲目创建新资源或推进状态。

## 后续补充：发布后的消费与反馈指标

目标是在 `方案/01-问题、用户与产品范围.md` 的 `3.4 发布后的消费与反馈` 中明确回答：能否看到每个 Skill 的调用次数、使用人数、成功次数和 badcase。结论是可以，但工作台只接收下游 Harness/业务系统的最小消费事件与反馈引用，不复制完整 Runtime。

### 设计原则

- SkillHub release、TeamAI install、DSH load 不计作 Skill 调用；只有实际开始一次逻辑执行才计入。
- 逻辑调用与执行重试分开：`invocation_id` 统计调用次数，`attempt_no` 统计尝试次数。
- 使用人数只统计经过验证的人类主体；服务账号、批处理和自动任务单独统计。
- 成功至少拆为技术完成、契约成功、业务结果成功；未知和缺失结果不推断为成功。
- badcase 区分报告数、确认数和受影响调用数；反馈先 triage，再进入知识复核、Skill 回归、分发故障或平台协作。
- 每条消费和反馈必须绑定 `team_id`、`asset_space_id`、`skill_id/version/package_digest`，不能按 `latest` 归因。
- 原始 Prompt、完整输出、业务原文、工具敏感参数、Token 和完整 Tool Call trace 仍由下游系统保管。
- 报表需展示时间窗口、分子/分母、反馈覆盖率、unknown 数量、数据来源和最后对账时间，并遵守 team/asset-space ACL、小样本保护和访问审计。

### 联动章节

- `方案/01-问题、用户与产品范围.md`：增加 3.4.1–3.4.6，定义指标、最小消费事件、反馈生命周期、隐私和展示边界；同步更新价值指标。
- `方案/02-端到端知识工作流.md`：补充消费事件到 feedback reference、triage 和新 Creation Session 的链路。
- `方案/03-知识资产与生命周期.md`：补充机器可识别的 Skill 成功标准和按版本/digest 归因。
- `方案/04-角色、治理与运营机制.md`：补充消费量、活跃用户、成功和 badcase 的周/月复核责任。
- `方案/05-系统架构与权威边界.md`：明确 Harness/业务系统拥有运行事实，工作台只接收最小引用。
- `方案/06-数据、状态与可追溯性.md`：补充 `consumption_event_reference`、`invocation_id`、`attempt_no`、`outcome_reference`、聚合和迟到事件字段。
- `方案/07-发布、安全与故障处置.md`：补充事件接入验签、schema、版本/digest、脱敏、ACL、限流和审计要求。
- `方案/08-MVP实施、验证与验收.md`：增加指标语义、去重、badcase 分流、隔离和隐私验收。
- `方案/09-工作台信息架构与核心对象.md`：补充版本级消费概览、反馈候选和 badcase triage 展示边界。
- `方案/10-Workflow到Skill的生成、测试与发布.md`：要求成功标准可用于运行后判断，并将确认 badcase 纳入回归和新版本验证。
- `README.md`、`方案/00-方案总览与关键决策.md`：说明可查看聚合消费/质量指标，但不建设完整运行观测系统。

### 验证重点

- 重复消费事件只计一次；同一逻辑调用的 retry 不增加调用数。
- 同一人多次调用只计一名活跃用户；服务账号不混入人类用户数。
- load/handoff/release 不计调用；无业务结果显示 unknown/不可计算。
- 重复反馈可合并；未确认反馈不计 confirmed badcase；平台/分发故障不归为 Skill 质量问题。
- 聚合数据可以反查 Skill version/digest、handoff、消费引用、反馈引用和修复版本。
- 团队隔离、小样本保护、敏感信息不进入指标和报表均可验证。
