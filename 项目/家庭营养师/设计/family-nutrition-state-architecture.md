# 家庭营养师动态状态架构：Docker Postgres + MCP

> 目标：明确家庭营养师 Agent 的动态状态不再依赖 WeKnora 知识库源文档实时写回，而是由独立 Postgres 作为 source of truth，并通过 MCP 服务提供受控读写工具。

## 1. 核心结论

```text
稳定知识：Git Markdown + WeKnora 知识库
动态状态：独立 Docker Postgres
状态读写：Family Nutrition MCP Service
对话入口：WeKnora Agent / 微信入口
```

不要把家庭营养业务表建在 WeKnora 内部 PostgreSQL 里。WeKnora 自带数据库属于平台内部数据，不作为本项目业务库。

## 2. 为什么不把知识库当库存数据库

知识库适合做语义检索，不适合承担库存、菜单和反馈的事务状态。

主要原因：

```text
1. 知识库源文档不一定能被 Agent 稳定写回；
2. 上传/替换文档后需要重新索引，存在延迟；
3. RAG 可能召回旧版本库存；
4. 库存扣减需要事务、审计和幂等；
5. 多轮对话或未来微信入口可能重复触发写入；
6. 最近菜单、复吃频率、库存临期、采购历史需要结构化查询。
```

因此，知识库继续负责“知道什么”，数据库负责“现在发生了什么”。

## 3. 数据源职责边界

| 数据类型 | Source of truth | 说明 |
|---|---|---|
| 菜谱 | Git Markdown | 上传到 WeKnora 后用于检索 |
| 家庭画像 | Git Markdown | 稳定事实，变更需确认 |
| 饮食规则 | Git Markdown | 安全边界和长期规则 |
| 推荐规则 | Git Markdown | Prompt / Agent 规则来源 |
| Prompt / Skill 文档 | Git Markdown | 平台配置的可版本化副本 |
| 当前库存 | Postgres | 由 MCP 工具读写 |
| 采购记录 | Postgres | 由 MCP 工具写入采购事件 |
| 计划消耗 | Postgres | 推荐后生成，不等于实际扣减 |
| 实际做饭记录 | Postgres | 用户确认执行后写入 |
| 饭后反馈 | Postgres | 先作为事件记录，长期偏好需确认后沉淀到 Markdown |
| 近期菜单去重 | Postgres | 基于实际执行和推荐记录查询 |
| 状态 Markdown 文件 | 由 Postgres 导出 | 供 Git 归档、人工审阅、WeKnora 索引摘要使用 |
| WeKnora Wiki | 可视化/临时编辑层 | 不作为动态状态主库 |

## 4. 目标架构

```text
用户 / 微信 / WeKnora 对话
  ↓
WeKnora Agent
  ├── search_knowledge / read_document：检索菜谱、规则、家庭画像
  ├── wiki_read_page / wiki_write_page：读写可视化知识页面或人工说明
  └── MCP tools：读写库存、菜单、反馈等动态状态
        ↓
Family Nutrition MCP Service
        ↓
独立 Docker Postgres
        ↓
定期导出 Markdown 快照 / 周月总结
        ↓
Git 归档 + 可选重新上传 WeKnora 知识库
```

## 5. 同机部署原则

服务器已有 WeKnora：

```bash
/opt/WeKnora
```

家庭营养状态服务单独部署：

```bash
/opt/family-nutrition-state
```

建议结构：

```text
/opt/family-nutrition-state/
├── docker-compose.yml
├── .env
├── backups/
├── postgres-data/
└── mcp-server/
```

原则：

```text
1. 不修改 /opt/WeKnora/docker-compose.yml；
2. 不复用 WeKnora 内部 PostgreSQL；
3. Postgres 不暴露公网端口；
4. MCP 服务必须鉴权；
5. 所有密码和密钥只放服务器 .env，不进入 Git；
6. 每天做 pg_dump 备份，并保存到服务器外部位置。
```

## 6. MCP 工具边界

### 6.1 只读工具

```text
get_current_inventory
get_inventory_risks
list_recent_meals
list_pending_planned_consumptions
get_meal_feedback_summary
```

### 6.2 写入工具

```text
record_purchase_after_confirmation
create_planned_consumption
confirm_meal_execution
record_meal_feedback
adjust_inventory_after_feedback
export_state_snapshot_to_markdown
```

### 6.3 写入约束

每个写入工具必须满足：

```text
1. 用户已明确确认；
2. 输入经过 schema 校验；
3. 包含 family_id；
4. 包含 actor_id 或来源说明；
5. 包含 idempotency_key，防止重复扣减；
6. 写入 audit_log；
7. 不允许 Agent 传入任意 SQL；
8. 不允许越权修改其他家庭数据。
```

## 7. 数据表第一版草案

```text
families
family_members

inventory_items
inventory_events
purchase_records
purchase_items

meal_plans
meal_plan_items
planned_consumptions
meal_events

meal_feedback
preference_observations

write_confirmations
mcp_tool_calls
audit_log
```

设计原则：

```text
inventory_events 是库存变化流水；
inventory_items 是当前库存快照；
planned_consumptions 不等于 actual consumption；
confirm_meal_execution 才能扣库存；
record_meal_feedback 记录反馈事实，不直接永久改偏好；
preference_observations 可汇总为偏好建议，用户确认后再沉淀进 Markdown。
```

## 8. Markdown 文件的新定位

`inventory/` 和 `meals/` 目录继续保留，但不再作为实时状态主库。

它们的新用途是：

```text
1. 数据库导出的人工可读快照；
2. Git 归档；
3. WeKnora 可索引摘要；
4. 状态模板和字段说明；
5. 故障时的人工恢复参考。
```

例如：

```text
inventory/current-inventory.md：由 Postgres 导出的当前库存摘要；
inventory/purchase-log.md：由 Postgres 导出的采购记录摘要；
meals/recent-menu-log.md：由 Postgres 导出的近期菜单摘要；
meals/meal-feedback-log.md：由 Postgres 导出的反馈摘要。
```

## 9. 安全和备份要求

```text
1. Postgres 不开放公网；
2. MCP 服务必须鉴权；
3. 数据库账号最小权限；
4. 迁移账号和运行账号分离；
5. 每个写工具都要审计；
6. 每天自动 pg_dump；
7. 备份至少保留一份在服务器外；
8. 每月做一次恢复演练；
9. 不把 API Key、DB 密码、SSH 密码写入 Git；
10. 涉及宝宝、老人、健康约束的长期规则必须人工确认。
```

## 10. 后续落地顺序

```text
1. 更新文档和 Prompt 口径；
2. 定义 state/data-dictionary.md；
3. 编写数据库迁移；
4. 实现 MCP 服务最小工具集；
5. 在腾讯云同机 Docker 部署 Postgres + MCP；
6. 在 WeKnora Agent 中接入 MCP；
7. 用采购、推荐、确认执行、饭后反馈四条路径做端到端测试；
8. 增加导出 Markdown 快照和备份脚本。
```
