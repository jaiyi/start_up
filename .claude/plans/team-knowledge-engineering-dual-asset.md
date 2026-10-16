# 团队 AI 工作台：知识与 Skill 双资产重构计划

## 目标

纠正当前方案把产品错误收缩成“知识生产线”的问题，恢复原始目标：为约 40 人业务团队建设一个持续沉淀、治理、发布、运行和反馈的 AI 工作台。

工作台同时管理两类核心资产：

- **知识资产**：Agent 应该知道什么；由 Git/审核/WeKnora 支撑采集、治理、发布和检索。
- **Skill 资产**：Agent 应该如何完成一类任务；由 Git/CI/SkillHub/DSH 支撑创建、契约、测试、权限、发布、装载、运行和回滚。

MVP 可以限制 Skill 的风险、环境和发布方式，但不能把 Skill 管理推迟为未来可选能力。

## 当前方案中的方向性问题

1. 产品定位写成“知识生产线”，漏掉 AI 工作台和 Skill 管理目标。
2. `03` 明确写“先定义知识，再定义 Skill”，并把 Skill 标成 P3，错误地把双资产变成单资产加附录。
3. `00` 的核心决策只包含知识发布和 WeKnora，没有 Skill 创建、测试、分发和运行闭环。
4. `02` 的主流程只有知识卡片，没有 Skill 工作流和知识/Skill 组合运行流程。
5. `05` 虽然提到 SkillHub 和 DSH，但它们只是边界说明，不是平台的一等能力。
6. `08` 把 Skill 当作知识稳定后的非生产试点，而不是和知识并列的核心 MVP 能力。
7. `验证/` 没有明确“SkillHub 自动发布未验证”与“Skill 管理仍是产品目标”的区别。

## 重构后的产品模型

```text
团队 AI 工作台
├── 知识资产管理
│   ├── 采集、抽取、证据和来源
│   ├── 审核、版本、复核和退役
│   ├── Git canonical source
│   └── WeKnora 检索投影
├── Skill 资产管理
│   ├── 创建、模板和 metadata
│   ├── 输入/输出契约
│   ├── 知识依赖、工具需求和 effects
│   ├── 测试、golden cases 和回归
│   ├── 版本、digest、profile 和权限
│   ├── 审核、beta/stable、分发和回滚
│   └── 运行反馈和质量运营
└── Agent 运行工作台
    ├── profile 和 Skill 装载
    ├── 知识检索和引用
    ├── 工具调用和人工确认
    ├── run/trace/审计
    └── 反馈回流到知识或 Skill
```

## 新的业务主线

文档不再只描述“资料如何变成知识”，而是描述两条生产线汇合到一次 Agent 运行：

```text
知识生产线：资料 → 知识草稿 → 事实/范围确认 → Git/MR → WeKnora → 可引用知识

Skill 生产线：任务需求 → Skill 草稿 → 契约/权限/effects → 测试回归 → Git/MR → SkillHub/管理员发布 → DSH profile 装载

两条线汇合：
知识版本 + Skill digest + profile + run
  → Agent 执行
  → 结果/人工纠正/业务结果
  → 反馈分别进入知识复核或 Skill 回归
```

## 实施改动范围

### 1. README 和方案总览

将产品定位改为“知识与 Skill 双资产的团队 AI 工作台”，明确 WeKnora 不足以替代 Skill 管理，并增加双资产关系、统一运行链和一等能力列表。

### 2. 问题、用户与产品范围

增加 Skill 相关角色和场景：

- 业务贡献者：提出任务需求、确认 Skill 行为和结果；
- Skill steward/owner：维护任务边界、契约、测试和风险；
- 平台 owner：维护 profile、权限、发布和运行环境；
- 领域 steward：负责知识事实和适用范围。

MVP 选择一个低风险知识域和一个低风险高频任务，同时跑通一个知识资产闭环和一个 Skill 资产闭环。

### 3. 端到端工作流

重写为三段：

1. 知识资产生产；
2. Skill 资产生产；
3. 知识 + Skill 的 Agent 运行和反馈。

每个环节明确输入、责任人、产出、证据、人工 gate、失败处理和回流路径。

### 4. 资产模型与生命周期

将 `03` 重写为双资产模型：

- Knowledge：`captured → candidate → reviewing → approved → publishing → published`，并定义 stale/deprecated/index_failed/index_unknown；
- Skill：`requested → scaffolded → authoring → validating → reviewing → approved → beta → stable`，并定义 rejected/blocked/withdrawn/deprecated/retired；
- 发布状态与运行状态分离；
- Skill 必须绑定知识依赖、工具需求、effects、风险等级、input/output schema、测试集、owner、profile compatibility 和 digest；
- Skill 不自行获得权限、不直接写正式知识、不依赖 latest；
- Knowledge 和 Skill 的每次运行都必须能被同一 run 关联。

### 5. 治理、系统架构、安全

补充 Skill 专属治理：需求准入、契约审核、权限/effects 审核、golden/regression 门禁、beta/stable 晋升、依赖和 SBOM、digest pin、profile 发布、回滚和退役。

架构边界统一为：

- Git：知识源文件、Skill 源码、schema、测试、metadata、评审和版本；
- WeKnora：知识检索和 ACL 投影；
- SkillHub：Skill registry/distribution，能力未验证时由管理员流程替代；
- DSH：Skill 装载、profile、工具执行、人工确认和 run；
- 工作台控制面：资产目录、变更包、job、approval、发布状态、反馈、审计和补偿；
- Bot：可选的 Agent 协作层，不是资产治理权威。

### 6. MVP 实施与验证

阶段调整为：

- P0：双资产边界、样本、角色、schema、provider contract 和运行关联；
- P1：知识闭环 + Skill 创建/契约/测试/审核/非生产装载的双资产 MVP；
- P2：双资产运行反馈和运营闭环；
- P3：Skill beta/stable、SkillHub 自动分发和多 profile 验证；
- P4：Console/Gateway/MCP/多 provider 演进；
- P5：Bot 协作、Plugin 和高风险生产写入。

P1 的 Skill 不是生产高风险发布，而是完整的低风险、非生产可运行闭环。Skill 管理必须从 P0 开始建模、从 P1 开始交付。

验收矩阵增加：

- Skill 创建和模板；
- input/output schema；
- effects/权限冲突阻断；
- golden/regression；
- 知识依赖和引用；
- digest pin 和 profile 装载；
- beta/stable 审核；
- Skill 运行归因和反馈晋升；
- Skill 回滚和退役。

### 7. 验证材料

将验证文档明确分成两类：

- 产品目标：Skill 管理始终是核心范围；
- 实现能力：SkillHub API、DSH loader、profile、插件扩展等需要目标环境验证。

即使 SkillHub 自动发布不可用，也必须通过 Git/CI + 管理员发布 + DSH 非生产 profile 保证 Skill 管理闭环可运行。

## 文件处理

直接重写现有新目录中的 14 个文件，不恢复历史 `设计/` 目录，不恢复已经删除的重复技术文档。保持当前目录结构，但把目录从“知识方案 + 外部验证”改成“知识与 Skill 双资产方案 + 外部能力验证”。

不改变项目外其他文档，不提交生产凭据，不执行外部系统写入。

## 验证

完成后执行：

- 搜索所有“Skill P3 以后”“先知识再 Skill”“不是核心”等错误表述；
- 搜索所有仍把产品称为纯知识生产线的定位；
- 检查知识、Skill、WeKnora、SkillHub、DSH、Git 的职责是否一致；
- 检查所有内部 Markdown 链接；
- 执行 `git diff --check`；
- 检查工作区状态；
- 不自动 commit/push，除非用户另行要求。
