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

## 2. 当前维护结构

本文件只记录当前已经维护的目录和下一步明确会扩展的增量，避免把大量尚未创建或尚未使用的脚手架提前固化成“目标结构”。

当前目录按四类组织：

```text
nutrition-agent-pov/
├── README.md
├── STRUCTURE.md
├── family/        # 家庭画像、成员偏好、饮食规则
├── recipes/       # 扁平菜谱库，每道菜一个 Markdown
├── sources/       # 菜谱来源和来源评价规则
├── inventory/     # Postgres 导出的库存/采购/计划消耗快照
├── meals/         # Postgres 导出的近期菜单和饭后反馈快照
├── agent-rules/   # 推荐、库存、反馈、知识写入等规则
├── prompts/       # 可复制到 WeKnora 的 Prompt
├── skills/        # 后台 Skill 的 Markdown 定义和示例
├── weknora/       # WeKnora 配置说明、工具权限和知识库绑定
├── state/         # 动态状态数据字典、迁移、seed、fixture
├── app/           # Family Nutrition MCP Service 代码和测试
└── infra/         # Docker Compose、env 示例和部署说明
```

下一步只在已有目录内按真实需求补齐：

- `state/migrations/`：按测试驱动增加 SQL migration。
- `state/fixtures/`：补充库存、菜单和反馈测试数据。
- `app/src/`：继续实现 MCP 工具、schema、Postgres adapter 和领域规则。
- `app/tests/`：补齐 contract、unit、integration 和 e2e 用例。
- `infra/`：只保存示例配置和非敏感部署说明，真实凭据只放服务器 `.env`。

原则：没有真实使用路径和测试牵引的目录，不提前创建；WeKnora 页面配置、Prompt、Skill、数据库结构和部署说明都以本目录中的文件为可复现来源。

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
推荐菜单通过 MCP 生成或记录计划消耗；
用户明确确认餐食已执行后，通过 MCP 转成实际库存扣减；
已确认执行且饭后在约定时间内无反馈时，可按默认正常规则记录反馈并扣减；
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

## 4. 已有增量目录如何使用

下面这些目录已经存在，先按当前真实用途维护，不再额外创建 `scripts/`、`tests/`、`ops/` 等空目录；相关脚本、测试和运维说明先分别收敛在 `app/`、`state/`、`infra/` 和 `weknora/` 下。

### 4.1 `prompts/`

职责：保存所有可复制到 WeKnora 平台的 Prompt。平台上的 Prompt 不能成为唯一副本；每次调整 Prompt 先改本目录，再同步到 WeKnora。

### 4.2 `skills/`

职责：保存后台 Skill 的 Markdown 定义、输入输出边界和典型示例。这里使用带模块名的文件名，是为了上传到 WeKnora 知识库时避免多个 `skill.md` / `examples.md` 在文档列表里难以区分。

### 4.3 `weknora/`

职责：保存 WeKnora 平台配置、工具权限、知识库绑定和部署备注。这里只放可公开的配置项和操作步骤，不放 API Key、密码、Token。

### 4.4 `state/`

职责：保存动态状态的数据模型、迁移、seed、fixture 和 Markdown 导出规范。第一版围绕库存、菜单执行和反馈补齐，不提前扩展偏好观察、复杂统计或导出平台。

### 4.5 `app/`

职责：实现 Family Nutrition MCP Service。代码、单元测试、集成测试、契约测试和 e2e 用例都先收敛在 `app/` 内，避免在项目根目录再创建一套独立测试树。

### 4.6 `infra/`

职责：保存同机 Docker Postgres + MCP 服务的示例配置和非敏感部署说明。真实主机、端口、目录、密码和 token 以部署 runbook 与服务器 `.env` 为准，不在结构规划里复制。

## 5. 文件命名规范

### 5.1 菜谱文件

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

### 5.2 日志文件

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

### 5.3 Prompt / Skill 文件

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

## 6. 状态文件写入边界

第一版允许 Agent 建议更新；稳定知识写入 Markdown/Wiki 需要确认，动态状态写入 Postgres 也必须通过 MCP 确认工具。

```text
可读：全部 Markdown 稳定知识 + MCP 动态状态只读工具
可建议更新：family、recipes、agent-rules、Prompt、Skill、Postgres 动态状态
可扣减：仅在用户明确确认餐食已执行，或已确认执行且超时无反馈按默认正常规则处理后，通过 MCP 更新 Postgres
必须确认：新增菜谱、修改家庭偏好、修改饮食规则、修改推荐规则、写入动态状态
禁止自动：删除菜谱、重命名菜谱、覆盖整份规则文件、执行任意 SQL
```

## 7. 与 WeKnora 平台的关系

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

## 8. 推荐执行顺序

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
