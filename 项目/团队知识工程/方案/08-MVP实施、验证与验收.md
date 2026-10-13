# MVP 实施、验证与验收

> 本文是唯一的实施路线和验收入口。Skill 管理从 P0 建模，从 P1 与知识闭环并行交付；后续阶段只扩大分发、规模和风险范围。

## 1. 交付方式

采用：**一个知识域、一个高频低风险任务、一个 Git provider、一个 worker、一个知识 steward、一个 Skill owner、一个非生产 profile**。

每个阶段留下版本、环境、fixture、运行命令、预期/实际结果、失败动作、owner、回滚方式和 Go/No-Go 决策。

## 2. P0：双资产边界与能力侦察

### 交付

- 一个真实但脱敏、可回放的知识样本集和任务样本集；
- 知识 steward、Skill owner、备份责任人和平台 owner；
- Knowledge/Skill schema、状态机、关系和统一 run 追踪；
- fake Git/WeKnora/SkillHub/DSH provider 或 adapter contract；
- Skill input/output、effects、profile 和风险模型；
- 目标版本的 DSH loader/profile、WeKnora 状态、SkillHub API 能力记录；
- 不使用生产 Token 的验证证据。

### 退出

双资产 schema、非法状态、幂等、权限冲突、契约失败、运行归因、故障路径和人工 fallback 均有测试；未知能力都有 owner、日期和处理方式。

## 3. P1：双资产 MVP 闭环

### 知识交付

收件箱、知识卡片、变更包、Git provider、CI/CODEOWNERS、审核、WeKnora ingest/status/search、引用和复核任务。

### Skill 交付

Skill 需求卡、模板化创建、input/output schema、知识依赖、effects/权限声明、golden/regression、Git/CI 审核、digest、非生产 profile 装载、可回放运行、反馈和旧版本回滚。

SkillHub 未验证时使用管理员发布，但必须保持 package、digest、profile、approval 和回滚状态可追踪。

### P1 退出

- 非程序员不操作 Git 即可创建知识和 Skill 草稿；
- 知识检索结果带 document/version/source/ACL；
- Skill 运行能反查 version/digest/profile/knowledge refs；
- 重复请求不重复创建 MR、release、index 或 installation；
- CI 失败、契约冲突或权限超界不能发布/装载；
- DSH 装载失败、索引失败和 provider 超时有清晰状态和人工接管；
- 至少有一项真实任务使用双资产完成。

## 4. P2：双资产反馈与运营闭环

### 交付

运行和反馈关联、反馈分流、知识复核队列、Skill 回归队列、每周复核、每月质量报告、stale/纠正率/失败率/权限异常提醒、备份 owner、退役和回滚流程。

### 退出

反馈不直接改正式资产；连续 4 周有真实使用和复核记录；至少一个质量指标改善；知识问题能进入知识 MR，Skill 问题能进入 Skill 回归；未知状态可人工对账。

## 5. P3：Skill 分发与稳定发布

在 P1/P2 稳定后，真实验证 SkillHub 的 package 注册、metadata、beta/stable、digest、DSH profile 安装、revoke、audit、webhook 和回滚。

如果 SkillHub 不具备稳定 API，继续使用管理员发布，不改变 Skill 作为核心资产的定位。

## 6. P4：控制台/Gateway/MCP 演进

只有在两个以上知识域或 Skill 稳定使用、出现第二 provider、人工状态查询成为瓶颈、需要集中权限/审计，或模块化单体无法接受地测试发布时，才拆 Console Plugin、Integration Gateway、adapter、签名事件和低风险 MCP。

新增层不能改变 Git、WeKnora、SkillHub、DSH 和人工审核的权威边界。

## 7. P5：Bot、Plugin 与高风险能力

只有在知识和 Skill 已有真实价值、运行归因完整、隔离构建、依赖扫描、审批、二次确认、观测和回滚都成立后，才验证 DeepSeek Bot 协作、Plugin 或生产写入。

## 8. 统一验收矩阵

| ID | 验证项 | 通过标准 |
|---|---|---|
| V-01 | 双资产样本和角色 | 脱敏知识/任务样本、owner/steward/备份齐全 |
| V-02 | 双资产 schema/状态 | 合法/非法/重复/并发迁移有测试 |
| V-03 | Skill 创建 | 模板、metadata、契约和知识依赖可生成并审核 |
| V-04 | Skill 门禁 | schema、effects、权限、依赖、golden/regression 有效 |
| V-05 | Git 变更 | 知识/Skill 路径安全、MR 幂等、CI/审批有效 |
| V-06 | WeKnora | 来源/版本/ACL 可读回，失败保留旧版 |
| V-07 | Skill 发布/装载 | digest、profile、安装结果和回滚可读回 |
| V-08 | 非程序员体验 | 不操作 Git 可创建、确认、审核和运行 |
| V-09 | 统一运行归因 | run 关联 knowledge version、skill digest、profile、commit |
| V-10 | 反馈分流 | 知识问题进知识复核，Skill 问题进 Skill 回归 |
| V-11 | 安全审计 | 无 secret 泄露、越权和不可追踪写入 |
| V-12 | 故障恢复 | 超时、丢回调、重复和未知状态可对账 |
| V-13 | 稳定发布 | beta/stable 有批准、真实证据、digest 和旧 pin 回滚 |
| V-14 | 运营价值 | 至少一个任务减少重复劳动或返工 |

详细平台实验见[验证材料](../验证/README.md)。

## 9. Coding agent 交付规范

每次只给 coding agent 一个小任务包：背景、范围、输入输出、禁止事项、失败测试、最小实现、验收命令、证据路径和回滚方式。先做 schema、状态机、fake provider、契约和回归，再做 UI 和真实 provider。

Agent 不拥有生产凭据，不直接 merge `main`，不执行任意 shell/路径，不隐藏未验证能力。完成后必须做独立 code review、安全 review 和范围检查。

## 10. Go/No-Go

以下任一项不通过，就保持当前阶段：双资产权限隔离、审计完整性、契约和回归、知识/Skill 版本可追踪、未知状态处理、旧版本保留、回滚、人工接管、secret 扫描、非程序员可用性或真实业务价值。
