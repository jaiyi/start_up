# 家庭营养师 Agent POV 知识库

> 用于 Weknora 知识库索引和微信交互验证的最小知识库目录。

## 目录说明

```text
family/：家庭成员画像、偏好和饮食规则
recipes/：扁平 Markdown 菜谱库，每道菜一个文件
sources/：做菜博主、菜谱来源和来源评价规则
inventory/：由 Postgres 导出的当前库存、采购记录和计划消耗快照
meals/：由 Postgres 导出的近期菜单、每餐反馈和菜单历史
agent-rules/：推荐、反馈、库存更新和微信交互规则
prompts/：可复制到 WeKnora 平台的主 Agent / Skill Prompt
skills/：后台能力模块定义、示例和后续可执行逻辑
weknora/：WeKnora 平台配置、工具权限和知识库绑定说明
state/：动态状态数据模型、数据库迁移和导出规范
app/：后续 MCP 服务和状态业务代码
infra/：同机 Docker Postgres + MCP 服务部署说明
```

详细结构规划见：[`STRUCTURE.md`](./STRUCTURE.md)。

## 核心原则

1. `recipes/` 不按子文件夹细分，分类写入菜谱文件内部标签。
2. 每道菜默认拆成 `宝宝版` 和 `成人/老人共用版`，老人控糖控盐提醒写在共用版内部。
3. Markdown 文件是家庭饮食稳定知识、Prompt、规则、Skill、模板和导出快照的 source of truth。
4. Weknora 是检索索引，不是唯一状态数据库。
5. 当前库存、采购、计划消耗、近期菜单和饭后反馈等动态强状态以独立 Postgres 为准，由 MCP 工具读写。
6. 微信是日常低摩擦交互入口。

## 最小闭环

```text
家庭建档
  ↓
菜谱库和博主库
  ↓
库存录入 / MCP 入库
  ↓
微信推荐下一餐
  ↓
饭后反馈
  ↓
通过 MCP 更新库存、菜单、反馈，并按需导出 Markdown 快照
```
