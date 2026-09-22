# 家庭营养师 Agent 项目结构规划

> 适用范围：`nutrition-agent-pov/` 既是 WeKnora 知识库目录，也是后续家庭营养师 Agent 的代码、Prompt、Skill、状态文件和运维配置的维护根目录。

## 1. 设计原则

```text
一个目录维护完整项目：知识 + Prompt + Skill + 状态 + 配置 + 测试 + 运维说明。
```

结构设计遵循：

```text
1. 知识库内容和代码分层，但放在同一个项目根目录下。
2. Markdown 是稳定知识、规则、Prompt、Skill、模板和导出快照的 source of truth；动态强状态以独立 Postgres 为准。
3. Prompt / Skill 要版本化，不能只存在于 WeKnora 平台页面里。
4. WeKnora 平台配置要可复现，避免只靠手工记忆。
5. 同机 Docker Postgres + MCP 服务的设计、代码和部署说明也放在本目录下逐步扩展。
6. 菜谱库继续保持扁平结构，不按目录拆分类，分类写在菜谱 metadata / 标签里。
```

## 2. 推荐目标结构

```text
nutrition-agent-pov/
├── README.md
├── STRUCTURE.md
│
├── family/
│   ├── family-profile.md
│   ├── member-preferences.md
│   └── dietary-rules.md
│
├── recipes/
│   ├── 001-西葫芦胡萝卜鸡肉饼.md
│   ├── 002-黑芝麻红枣米糊.md
│   ├── ...
│   ├── _cooking-tips-audit.md
│   ├── _verified-source-links.md
│   └── confirmed-dish-candidates.md
│
├── sources/
│   ├── cooking-bloggers.md
│   └── source-evaluation-rules.md
│
├── inventory/
│   ├── current-inventory.md
│   ├── purchase-log.md
│   ├── planned-consumption-log.md
│   ├── ingredient-inventory-profile.md
│   └── fish-seafood-purchase-guide.md
│
├── meals/
│   ├── recent-menu-log.md
│   ├── meal-feedback-log.md
│   ├── weekly-menu-log.md
│   └── monthly-menu-summary.md
│
├── agent-rules/
│   ├── recommendation-rules.md
│   ├── feedback-update-rules.md
│   ├── recipe-template.md
│   ├── inventory-update-rules.md
│   ├── knowledge-write-rules.md
│   └── wechat-interaction-examples.md
│
├── prompts/
│   ├── main-agent-system-prompt.md
│   ├── meal-recommender.prompt.md
│   ├── inventory-manager.prompt.md
│   ├── recipe-collector.prompt.md
│   ├── feedback-learner.prompt.md
│   └── knowledge-maintainer.prompt.md
│
├── skills/
│   ├── meal-recommender/
│   │   ├── module-meal-recommender-readme.md
│   │   ├── skill-meal-recommender.md
│   │   └── examples-meal-recommender.md
│   ├── inventory-manager/
│   │   ├── module-inventory-manager-readme.md
│   │   ├── skill-inventory-manager.md
│   │   └── examples-inventory-manager.md
│   ├── recipe-collector/
│   │   ├── module-recipe-collector-readme.md
│   │   ├── skill-recipe-collector.md
│   │   └── examples-recipe-collector.md
│   ├── feedback-learner/
│   │   ├── module-feedback-learner-readme.md
│   │   ├── skill-feedback-learner.md
│   │   └── examples-feedback-learner.md
│   └── knowledge-maintainer/
│       ├── module-knowledge-maintainer-readme.md
│       ├── skill-knowledge-maintainer.md
│       └── examples-knowledge-maintainer.md
│
├── weknora/
│   ├── agent-config.md
│   ├── agent-config.example.yaml
│   ├── knowledge-base-config.md
│   ├── tool-permissions.md
│   └── deployment-notes.md
│
├── state/
│   ├── README.md
│   ├── data-dictionary.md
│   ├── schemas/
│   ├── migrations/
│   ├── seeds/
│   ├── fixtures/
│   └── exports/
│       └── markdown/
│
├── app/
│   ├── README.md
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── ports/
│   │   ├── adapters/
│   │   │   ├── postgres/
│   │   │   ├── markdown/
│   │   │   └── weknora/
│   │   ├── mcp/
│   │   │   ├── tools/
│   │   │   └── schemas/
│   │   ├── jobs/
│   │   └── utils/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── contract/
│
├── infra/
│   ├── README.md
│   ├── docker-compose.family-state.example.yml
│   ├── env.example
│   └── postgres/
│
├── scripts/
│   ├── validate-recipes.md
│   ├── sync-to-weknora.md
│   ├── export-knowledge.md
│   └── archive-menu-log.md
│
├── tests/
│   ├── fixtures/
│   ├── prompt-cases/
│   ├── skill-cases/
│   └── regression-cases/
│
└── ops/
    ├── runbook.md
    ├── backup-restore.md
    └── release-checklist.md
```

## 3. 当前已有目录如何保留

### 3.1 `family/`

职责：家庭成员画像、饮食偏好、禁忌和长期饮食规则。

当前文件保留：

```text
family-profile.md
member-preferences.md
dietary-rules.md
```

写入原则：

```text
低频更新；
只记录已确认事实；
反馈学习产生的偏好更新必须经用户确认后写入。
```

### 3.2 `recipes/`

职责：标准菜谱库，每道菜一个 Markdown 文件。

继续保持扁平结构：

```text
recipes/001-菜名.md
recipes/002-菜名.md
```

不建议拆成：

```text
recipes/baby/
recipes/adult/
recipes/soup/
recipes/breakfast/
```

原因：

```text
一道菜可能同时属于宝宝餐、成人餐、老人复热餐、早餐或清库存餐；
多目录分类会导致重复维护；
分类应该写进菜谱 frontmatter / 标签，由 WeKnora 检索和 Agent 规则处理。
```

建议每道菜逐步补齐 metadata：

```yaml
---
id: recipe-001
name: 西葫芦胡萝卜鸡肉饼
tags:
  - 宝宝餐
  - 早餐
  - 高蛋白
  - 可冷冻
suitable_for:
  baby: true
  adult: true
  elder: true
inventory_keywords:
  - 西葫芦
  - 胡萝卜
  - 鸡肉
repeat_policy:
  avoid_within_days: 7
---
```

### 3.3 `sources/`

职责：菜谱来源、做菜博主、来源可信度和收集规则。

适合被 `recipe-collector` 使用。

### 3.4 `inventory/`

职责：保存由 Postgres 导出的库存快照、采购记录摘要和计划消耗摘要。

建议补齐：

```text
current-inventory.md：由 Postgres 导出的当前库存快照
purchase-log.md：由 Postgres 导出的每周/每次采购记录摘要
planned-consumption-log.md：由 Postgres 导出的计划消耗摘要
ingredient-inventory-profile.md：家庭常备食材画像
fish-seafood-purchase-guide.md：鱼虾海鲜采购规则
```

关键规则：

```text
推荐菜单通过 MCP 生成 planned consumption；
确认执行且饭后无反馈，通过 MCP 把 planned consumption 转成实际库存扣减；
饭后有反馈时，通过 MCP 以反馈修正实际消耗；
Markdown 文件只承接导出快照，不作为实时事务状态源。
```

### 3.5 `meals/`

职责：保存由 Postgres 导出的近期菜单、饭后反馈、一周菜单和历史归档摘要。

建议补齐：

```text
recent-menu-log.md：由 Postgres 导出的最近 14 天滚动菜单摘要
meal-feedback-log.md：由 Postgres 导出的饭后反馈摘要
weekly-menu-log.md：周菜单计划
monthly-menu-summary.md：超过 14 天后的简要归档
```

近期重复规避以 Postgres 中的 meal_events / meal_plans 为准，`recent-menu-log.md` 是导出快照。

## 4. 新增目录职责

### 4.1 `prompts/`

职责：保存所有可复制到 WeKnora 平台的 Prompt。

建议文件：

```text
main-agent-system-prompt.md
meal-recommender.prompt.md
inventory-manager.prompt.md
recipe-collector.prompt.md
feedback-learner.prompt.md
knowledge-maintainer.prompt.md
```

原则：

```text
平台上的 Prompt 不能成为唯一副本；
每次调整 Prompt 先改本目录，再同步到 WeKnora；
Prompt 要和测试用例一起演进。
```

### 4.2 `skills/`

职责：保存后台 Skill 的定义、示例和后续可执行逻辑。

第一版可以只放 Markdown：

```text
skill-<module>.md：Skill 定义、输入、输出、边界
examples-<module>.md：典型用户输入和理想输出
module-<module>-readme.md：该能力模块的职责说明
```

说明：这里使用带模块名的文件名，是为了上传到 WeKnora 知识库时避免多个 `skill.md` / `examples.md` 在文档列表里难以区分。

后续如果 WeKnora Skill 支持代码或 manifest，可以扩展为：

```text
skill.yaml
handler.ts / handler.py
schema.json
tests/
```

### 4.3 `weknora/`

职责：保存 WeKnora 平台配置、工具权限、知识库绑定和部署备注。

建议文件：

```text
agent-config.md：页面配置说明
agent-config.example.yaml：结构化配置样例
knowledge-base-config.md：知识库上传/同步说明
tool-permissions.md：工具权限白名单和禁用项
deployment-notes.md：与部署文档的关联说明
```

注意：

```text
不要在这里放 API Key、密码、Token。
只放可公开的配置项和操作步骤。
```

### 4.4 `state/`

职责：保存动态状态的数据模型、数据库迁移、测试数据和 Markdown 导出规范。

建议内容：

```text
state/data-dictionary.md：动态状态字段、枚举和业务含义
state/schemas/：MCP 输入输出和数据库记录 schema
state/migrations/：Postgres 迁移脚本
state/seeds/：初始化数据
state/fixtures/：测试数据
state/exports/markdown/：状态导出 Markdown 的结构规范
```

### 4.5 `app/`

职责：后续实现家庭营养状态 MCP 服务、微信 Bot 或轻量 API 时，代码放在这里。

建议分层：

```text
app/src/domain/：核心领域模型，例如 Recipe、InventoryItem、MealEvent
app/src/application/：业务用例，例如推荐编排、库存扣减、反馈学习
app/src/ports/：仓储和外部服务接口
app/src/adapters/：Postgres、Markdown、WeKnora、微信适配器
app/src/mcp/：MCP 工具定义和输入输出 schema
app/src/utils/：通用工具
app/tests/：代码级单元测试和集成测试
```

当前先保留 README 规划；真正实现 MCP 服务时再补代码、测试和迁移。

### 4.6 `infra/`

职责：保存同机 Docker Postgres + MCP 服务的部署说明和示例配置。

建议文件：

```text
infra/README.md：部署原则和目录边界
infra/docker-compose.family-state.example.yml：示例 compose，不含真实密钥
infra/env.example：环境变量示例
infra/postgres/：Postgres 初始化和运维说明
```

### 4.7 `scripts/`

职责：保存维护脚本说明或脚本。

可逐步增加：

```text
validate-recipes：检查菜谱格式是否完整
sync-to-weknora：同步 Markdown 到 WeKnora
export-knowledge：导出知识库快照
archive-menu-log：把超过 14 天菜单归档
```

### 4.8 `tests/`

职责：保存 Prompt / Skill / 回归测试样例。

建议结构：

```text
tests/fixtures/：测试用家庭画像、库存、菜单记录
tests/prompt-cases/：Prompt 输入输出用例
tests/skill-cases/：Skill 行为用例
tests/regression-cases/：历史失败案例，防止回归
```

第一版测试可以先用 Markdown 表格，不一定马上写自动化测试。

### 4.9 `ops/`

职责：运维、备份、发布和故障处理。

建议文件：

```text
runbook.md：日常操作手册
backup-restore.md：备份与恢复
release-checklist.md：每次更新 WeKnora 配置前的检查清单
```

## 5. 第一阶段最小落地结构

第一阶段直接按“稳定知识 + Postgres 动态状态 + MCP 服务”的方向组织，不再把库存和菜单 Markdown 当作实时强状态。

```text
nutrition-agent-pov/
├── README.md
├── STRUCTURE.md
├── family/
├── recipes/
├── sources/
├── inventory/
│   ├── current-inventory.md
│   ├── purchase-log.md
│   └── planned-consumption-log.md
├── meals/
│   ├── recent-menu-log.md
│   └── meal-feedback-log.md
├── agent-rules/
│   ├── recommendation-rules.md
│   ├── feedback-update-rules.md
│   ├── recipe-template.md
│   ├── inventory-update-rules.md
│   └── knowledge-write-rules.md
├── prompts/
│   └── main-agent-system-prompt.md
├── skills/
│   ├── meal-recommender/
│   ├── inventory-manager/
│   ├── recipe-collector/
│   ├── feedback-learner/
│   └── knowledge-maintainer/
├── weknora/
│   ├── agent-config.md
│   └── tool-permissions.md
├── state/
│   └── README.md
├── app/
│   └── README.md
└── infra/
    ├── README.md
    ├── docker-compose.family-state.example.yml
    └── env.example
```

## 6. 第二阶段扩展结构

当 WeKnora 平台配置和 MCP 架构跑通后，再补代码级实现和自动化：

```text
state/data-dictionary.md
state/migrations/
state/schemas/
app/src/
app/tests/
scripts/
ops/
```

第二阶段重点：

```text
1. 建立 Postgres 表结构和迁移；
2. 实现 MCP 工具的输入校验、幂等和审计；
3. 自动导出 inventory/ 和 meals/ Markdown 快照；
4. 自动同步稳定 Markdown 到 WeKnora；
5. 为推荐、库存、反馈建立回归测试集。
```

## 7. 文件命名规范

### 7.1 菜谱文件

```text
recipes/001-菜名.md
recipes/002-菜名.md
```

规则：

```text
三位数字递增；
中文菜名；
不在文件名里塞太多标签；
标签写进文件内容。
```

### 7.2 日志文件

```text
recent-menu-log.md
meal-feedback-log.md
purchase-log.md
planned-consumption-log.md
```

规则：

```text
日志按时间倒序；
最近 14 天保留详细信息；
超出 14 天归档为月度 summary。
```

### 7.3 Prompt / Skill 文件

```text
main-agent-system-prompt.md
meal-recommender.prompt.md
skills/meal-recommender/skill-meal-recommender.md
skills/meal-recommender/examples-meal-recommender.md
```

规则：

```text
Prompt 文件直接可复制到 WeKnora；
Skill 文件记录职责、输入、输出、工具和边界；
示例放 examples-<module>.md。
```

## 8. 状态文件写入边界

第一版允许 Agent 建议更新；稳定知识写入 Markdown/Wiki 需要确认，动态状态写入 Postgres 也必须通过 MCP 确认工具。

```text
可读：全部 Markdown 稳定知识 + MCP 动态状态只读工具
可建议更新：family、recipes、agent-rules、Prompt、Skill、Postgres 动态状态
可扣减：仅在用户确认执行且饭后无负面反馈后，通过 MCP 更新 Postgres
必须确认：新增菜谱、修改家庭偏好、修改饮食规则、修改推荐规则、写入动态状态
禁止自动：删除菜谱、重命名菜谱、覆盖整份规则文件、执行任意 SQL
```

## 9. 与 WeKnora 平台的关系

```text
nutrition-agent-pov/：源文件和配置版本库
WeKnora 知识库：索引和检索层
WeKnora Wiki：可视化知识页面和人工编辑层
WeKnora Agent：对话入口和工具调用层
Family Nutrition MCP：动态状态读写边界
独立 Docker Postgres：库存、菜单、反馈等动态状态源
微信入口：低摩擦日常使用入口
```

同步原则：

```text
稳定知识先改 nutrition-agent-pov/ 源文件，再同步到 WeKnora；
动态状态通过 MCP 写入 Postgres，再按需导出 Markdown 快照；
平台配置变更要回写到 weknora/ 和 prompts/；
不要让平台页面成为唯一真实版本。
```

## 10. 推荐执行顺序

```text
1. 明确稳定知识和动态状态边界。
2. 建 state/、app/、infra/ 文档，定义 Postgres + MCP 目标结构。
3. 更新 prompts/ 和 agent-rules/，让库存/菜单/反馈走 MCP。
4. 建 weknora/agent-config.md 和 tool-permissions.md 的 MCP 配置说明。
5. 后续实现 MCP 服务、数据库迁移和 Docker 部署。
6. 在 WeKnora 平台接入 MCP 工具。
7. 用 tests/prompt-cases/ 和 app/tests/ 记录端到端测试。
8. 增加导出 Markdown 快照、备份和恢复流程。
```
