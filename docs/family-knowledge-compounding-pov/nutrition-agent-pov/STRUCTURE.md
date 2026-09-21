# 家庭营养师 Agent 项目结构规划

> 适用范围：`nutrition-agent-pov/` 既是 WeKnora 知识库目录，也是后续家庭营养师 Agent 的代码、Prompt、Skill、状态文件和运维配置的维护根目录。

## 1. 设计原则

```text
一个目录维护完整项目：知识 + Prompt + Skill + 状态 + 配置 + 测试 + 运维说明。
```

结构设计遵循：

```text
1. 知识库内容和代码分层，但放在同一个项目根目录下。
2. Markdown 仍然是第一版家庭饮食知识和强状态的 source of truth。
3. Prompt / Skill 要版本化，不能只存在于 WeKnora 平台页面里。
4. WeKnora 平台配置要可复现，避免只靠手工记忆。
5. 后续如果接微信机器人、MCP 或轻量后端服务，也放在本目录下逐步扩展。
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
├── app/
│   ├── README.md
│   ├── src/
│   │   ├── domain/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── adapters/
│   │   ├── schemas/
│   │   └── utils/
│   └── tests/
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

职责：库存强状态和采购记录。

建议补齐：

```text
current-inventory.md：当前真实库存
purchase-log.md：每周/每次采购记录
planned-consumption-log.md：推荐后生成的计划消耗
ingredient-inventory-profile.md：家庭常备食材画像
fish-seafood-purchase-guide.md：鱼虾海鲜采购规则
```

关键规则：

```text
推荐菜单只生成 planned consumption；
确认执行且饭后无反馈，才把 planned consumption 转成实际库存扣减；
饭后有反馈时，以反馈修正实际消耗。
```

### 3.5 `meals/`

职责：近期菜单、饭后反馈、一周菜单和历史归档。

建议补齐：

```text
recent-menu-log.md：最近 14 天滚动菜单记录
meal-feedback-log.md：饭后反馈记录
weekly-menu-log.md：周菜单计划
monthly-menu-summary.md：超过 14 天后的简要归档
```

`recent-menu-log.md` 是第一版避免重复推荐的主索引。

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

### 4.4 `app/`

职责：后续如果要把家庭营养师做成微信 Bot、MCP 服务或轻量 API，代码放在这里。

建议分层：

```text
app/src/domain/：核心领域模型，例如 Recipe、InventoryItem、MealEvent
app/src/services/：业务服务，例如推荐编排、库存扣减、反馈学习
app/src/repositories/：文件/数据库访问接口
app/src/adapters/：WeKnora、微信、MCP、文件系统适配器
app/src/schemas/：输入输出 schema 和校验
app/src/utils/：通用工具
app/tests/：代码级单元测试和集成测试
```

第一版如果没有代码，可以只保留规划，不急着创建空目录。

### 4.5 `scripts/`

职责：保存维护脚本说明或脚本。

可逐步增加：

```text
validate-recipes：检查菜谱格式是否完整
sync-to-weknora：同步 Markdown 到 WeKnora
export-knowledge：导出知识库快照
archive-menu-log：把超过 14 天菜单归档
```

### 4.6 `tests/`

职责：保存 Prompt / Skill / 回归测试样例。

建议结构：

```text
tests/fixtures/：测试用家庭画像、库存、菜单记录
tests/prompt-cases/：Prompt 输入输出用例
tests/skill-cases/：Skill 行为用例
tests/regression-cases/：历史失败案例，防止回归
```

第一版测试可以先用 Markdown 表格，不一定马上写自动化测试。

### 4.7 `ops/`

职责：运维、备份、发布和故障处理。

建议文件：

```text
runbook.md：日常操作手册
backup-restore.md：备份与恢复
release-checklist.md：每次更新 WeKnora 配置前的检查清单
```

## 5. 第一阶段最小落地结构

不建议一次性创建所有目录。第一阶段先补齐和当前 MVP 强相关的目录：

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
└── weknora/
    ├── agent-config.md
    └── tool-permissions.md
```

## 6. 第二阶段扩展结构

当 WeKnora 平台配置跑通、微信入口开始接入后，再补：

```text
app/
scripts/
tests/
ops/
```

第二阶段重点：

```text
1. 自动校验菜谱格式；
2. 自动归档 recent-menu-log；
3. 自动同步 Markdown 到 WeKnora；
4. 接微信 Bot 或 MCP 工具；
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

第一版允许 Agent 建议更新，但写入需要确认。

```text
可读：全部 Markdown 文件
可建议更新：family、recipes、inventory、meals、agent-rules
可自动扣减：仅在用户确认执行且饭后无负面反馈后，更新 inventory 和 meals
必须确认：新增菜谱、修改家庭偏好、修改饮食规则、修改推荐规则
禁止自动：删除菜谱、重命名菜谱、覆盖整份规则文件
```

## 9. 与 WeKnora 平台的关系

```text
nutrition-agent-pov/：源文件和配置版本库
WeKnora 知识库：索引和检索层
WeKnora Wiki：可视化知识页面和人工编辑层
WeKnora Agent：对话入口和工具调用层
微信入口：低摩擦日常使用入口
```

同步原则：

```text
先改 nutrition-agent-pov/ 源文件；
再同步到 WeKnora；
平台配置变更要回写到 weknora/ 和 prompts/；
不要让平台页面成为唯一真实版本。
```

## 10. 推荐执行顺序

```text
1. 先补齐 inventory/current-inventory.md、purchase-log.md、planned-consumption-log.md。
2. 补齐 meals/recent-menu-log.md、meal-feedback-log.md。
3. 把主 Agent Prompt 从配置方案中拆到 prompts/main-agent-system-prompt.md。
4. 为 5 个后台能力模块各建 `skill-<module>.md` 和 `examples-<module>.md`。
5. 建 weknora/agent-config.md 和 tool-permissions.md。
6. 在 WeKnora 平台按文档配置 Agent。
7. 用 tests/prompt-cases/ 记录典型问题和理想回答。
8. 稳定后再考虑 app/、scripts/、自动同步和微信入口。
```
