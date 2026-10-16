# TeamAI 分发层方案迭代计划

## 目标

参考 `/Users/lijiayi/Downloads/TeamAI_OpenCSG组合方案_20261013.pdf`，将 TeamAI 的可复用价值和必要性正式纳入团队知识工程方案，但不改变当前产品核心边界：第一阶段仍然建设 Knowledge + Skill 双资产闭环，TeamAI 作为可替换的团队 AI 资产分发/本地同步适配层，不能成为首期硬依赖。

## 关键决策

1. **TeamAI 的定位**：团队 AI 资产的 Git-based 分发、本地同步、版本切换、初始化和跨团队 Agent 包分发候选；不是知识事实审批系统、Skill 业务质量系统、Plugin Registry/Runtime 或运行权威。
2. **首期必要性**：对 40 人左右单业务团队，P1 只要求 Git + MR/CI + 工作台 + WeKnora + DSH 非生产 profile 形成闭环；TeamAI 可选接入，TeamAI 不可用不得阻塞 Knowledge + Skill MVP。
3. **规模化价值**：当本地 dsh 分发、版本一致性、新人接入、多人同步或跨团队复用成为瓶颈时，优先复用 TeamAI，而不是自研另一套同步系统。
4. **P3 评估范围**：将原“SkillHub 自动分发”扩展为“Skill/Agent 分发实现评估”，候选包括 SkillHub、TeamAI 和 Git/管理员 fallback。最终以固定版本、digest、profile、安装读回、权限过滤、灰度、撤回、回滚、审计和运行归因能力选择，而不是按产品名称选择。
5. **安全边界**：`teamai push` 只能进入个人分支/变更请求；合并、发布、权限授予和全员生效必须经过 CI、人工审核和稳定版本生成。自动同步不等于自动批准或自动生效。
6. **Agent Manifest**：作为多个 Skill、知识 Profile、模型/运行策略和工具依赖的组合/分发包，属于后续复用能力；不取代 Skill，也不改变 Knowledge、Skill、Plugin 三类资产边界。
7. **Plugin 关系**：TeamAI 可以分发 Plugin manifest 或 Agent package，但不替代 Plugin Registry/Runtime、权限、凭据、health 和工具运行时治理。

## 文档修改范围

### 1. README

- 增加“治理层与分发层分离”的核心表述。
- 明确 TeamAI 是分发适配层候选，承接 Skills/Rules/Agent Manifest/受控配置的初始化、同步、版本切换和本地注入。
- 明确首期不依赖 TeamAI；当前状态增加 TeamAI CLI、dsh hooks、profile、仓库结构和内网部署待验证项。
- 将“SkillHub 负责分发”的绝对表述改为“SkillHub/TeamAI/管理员流程按验证结果承担分发实现”。
- 增加“TeamAI 不能替代工作台、WeKnora、Skill 质量治理或 Plugin runtime”的边界。

### 2. 方案/00-方案总览与关键决策.md

- 产品定义增加“资产治理闭环”和“资产分发闭环”两个概念。
- 首期双链之后补充候选分发路径：Git/管理员、SkillHub、TeamAI。
- 核心决策表增加 TeamAI 分发适配层，不将其列为正式源。
- 阶段顺序调整：P0 侦察 TeamAI；P1 可选使用但不阻塞；P3 评估 SkillHub/TeamAI/管理员流程并选择稳定分发实现；跨团队数字员工只作为后续场景，不提前变成 MVP 依赖。
- 成功标准增加“稳定分发可替换、实际装载版本可读回、未审核版本不能自动生效”。

### 3. 方案/01-问题、用户与产品范围.md

- 增加本地 dsh 分发、版本不一致、新人接入、跨团队重复建设等规模化问题。
- 增加 distribution/platform owner 责任角色。
- 明确 TeamAI 是解决分发运营成本的候选方案，不是首期产品范围硬依赖。
- 将跨团队 Agent/数字员工列为后续复用场景和触发条件。

### 4. 方案/02-端到端知识工作流.md

- 在知识生产线、Skill 生产线和 Plugin 长期能力线之外增加“分发/同步线”。
- 描述安全的 TeamAI 流程：`init → 本地修改/草稿 → push 到分支 → MR/CI/审核 → 稳定版本/digest → pull → 本地安装/注入读回 → profile 启用 → run 归因`。
- 明确 `push` 不得直达 protected main，Hook 不得绕过审核、携带 secret 或让未批准版本立即全员生效。
- 增加 TeamAI 失败时的 SkillHub 或管理员 fallback。
- 增加 Agent Manifest 的跨团队复用流程，但将其定义为后续组合/分发包，不等同于 Skill。
- 反馈分流增加同步失败、版本漂移、安装读回失败和本地配置冲突。

### 5. 方案/03-知识资产与生命周期.md

- 增加“分发包/Agent Manifest”说明：可引用多个 Skill、知识 Profile、模型和工具，负责组合和分发，不拥有被引用资产的 canonical source。
- 增加 TeamAI workspace/revision/target 等分发 metadata 的建议字段。
- 说明 TeamAI 管理的仓库内容可以包含 Knowledge/Skill/Rules/Agents/受控 Plugin manifest，但不同资产仍按各自 schema、owner、审核和生命周期治理。
- 补充 TeamAI 版本同步不改变 Skill stable、Plugin enabled 或知识 published 状态。

### 6. 方案/04-角色、治理与运营机制.md

- RACI 增加 Distribution/platform owner。
- 增加 TeamAI/分发门禁：目标仓库、分支保护、profile 兼容、版本 pin、secret 扫描、删除清理、安装读回、回滚和审计。
- 明确 Agent Manifest 的发布需要各依赖 Skill/知识/Profile 的授权，不得用 Agent 包绕过资产审批。
- 运营指标增加同步成功率、版本漂移、安装失败、新人接入耗时和跨团队复用率。

### 7. 方案/05-系统架构与权威边界.md

- 拓扑增加可选 TeamAI distribution adapter/local sync，位于 Git/CI 与 DSH local loader/profile 之间。
- 组件职责中明确 TeamAI 负责仓库镜像、init/pull/push、映射/注入、版本切换和分发状态；不负责事实审批、Skill 质量、知识检索、Plugin 运行或权限授予。
- 权威边界增加 TeamAI 行，明确其读取 Git 批准版本并分发，不成为 canonical source。
- 将 SkillHub 表述为分发候选之一；管理员 fallback 仍是必须保留的能力。
- 增加 OpenCSG 位置的谨慎表述：若目标环境验证成立，可作为模型/Agent 运行层；不因参考方案描述而视为已集成。
- 增加“自动同步 ≠ 自动批准/自动生效”的不可混淆边界。

### 8. 方案/06-数据、状态与可追溯性.md

- 最小数据模型增加 distribution_target、distribution_installation 或 sync_revision（命名以现有模型风格为准）。
- 追踪链增加 `release → distribution adapter → target workspace/local installation → profile → run`。
- 关键字段增加 distribution adapter、target、sync revision、installed revision、local sync status、drift/error code 等。
- 明确运行归因仍关联 Skill digest、Knowledge refs、profile 和实际本地装载 revision；TeamAI pull 成功不等于 Skill stable 或运行成功。
- 增加版本漂移、删除清理、重复 pull、断网和未知安装状态的对账要求。

### 9. 方案/07-发布、安全与故障处置.md

- 增加 TeamAI/分发发布链：批准变更 → package/digest → TeamAI 分发 → target pull/install → dsh/profile 读回 → stable/beta 生效。
- 增加 TeamAI CI 门禁：protected main、MR、secret 扫描、依赖/路径安全、profile 兼容、版本 pin、hook 限制、幂等、删除清理和 rollback。
- 增加故障：TeamAI 服务/仓库不可用、pull 半成功、注入失败、版本漂移、Hook 冲突、跨安全域同步失败；均进入 unknown/reconciling 或 fallback，不报告为成功。
- 增加回滚：停止新分发 → 回到旧 package/digest/profile pin → pull/install 读回 → 清理新文件 → smoke/regression → 审计。
- 明确外网 ThinkPad 只允许脱敏/公开样本，不能通过 TeamAI 自动同步正式敏感知识、生产凭据或高风险工具。

### 10. 方案/08-MVP实施、验证与验收.md

- P0 加入 TeamAI 能力侦察和 fake distribution contract，不要求真实 TeamAI runtime。
- P1 增加“可选 TeamAI adapter”：验证通过可用于本地同步；未通过继续管理员流程。
- P3 重命名为“Skill/Agent 分发与稳定发布”，评估 SkillHub、TeamAI 和管理员 fallback。
- 增加 TeamAI 采用门槛和不采用条件，避免工具先行。
- 增加跨团队 Agent Manifest 作为 P3/P4 之后的扩展场景，不阻塞单团队 MVP。
- 验收矩阵新增：
  - V-17：TeamAI/分发 contract（MR、固定版本、pull/install 读回、权限/secret、回滚、失败 fallback）；
  - V-18：Agent Manifest 复用（依赖 Skill/知识/Profile 可追踪，不能绕过审批；不要求首期实现）。
- Go/No-Go 增加分发能力只在证据充分时启用，TeamAI 失败必须可回退。

### 11. 验证材料

- 验证 README 增加 TeamAI 是待验证分发实现，不是产品核心或首期硬依赖。
- 能力矩阵增加 TeamAI CLI/repository/hooks/local injection、SkillHub/TeamAI 分发比较和 OpenCSG 运行层验证。
- 新增实验：目标 TeamAI 版本、内网 Git、dsh 版本和目标 profile 下验证 init/pull/push/MR、格式兼容、hook 生命周期、版本锁、灰度、安装读回、删除清理、回滚、审计、脱敏和跨安全域限制。
- 通过条件：未审核内容不能自动生效；实际本地版本可读回；失败可 fallback；无 secret/敏感数据外流；TeamAI 不改变 Skill/Knowledge/Plugin 权威边界。
- DeepSeek Bot 评估中补充 Agent Manifest/DS Bot 组合复用只是待验证能力，Bot 不成为分发或治理权威。

## 验证和收尾

1. 检查所有文档章节编号、Markdown 表格列数、内部链接和 P0-P5 表述一致性。
2. 检查 TeamAI、SkillHub、WeKnora、DSH、OpenCSG、Plugin 的权威边界没有互相覆盖。
3. 检查所有未验证外部能力均标记为待验证/fallback，不把参考 PDF 内容当成已集成事实。
4. 执行 `git diff --check`。
5. 更新紧凑版 PDF，确认包含 TeamAI 定位、复用价值、必要性判断、分发流程和验证矩阵。
6. 检查 PDF 文件、页数、文本可提取性和临时文件；不执行 commit/push，除非用户另行明确要求。
7. 完成独立 code/document review，确认不破坏当前未提交的 Plugin 扩展修改。
