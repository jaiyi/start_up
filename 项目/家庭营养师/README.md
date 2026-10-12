# 家庭营养师

家庭营养师 Agent 是一个以 Markdown 稳定知识、WeKnora 检索、Postgres 动态状态和 MCP 服务为核心的家庭饮食执行系统。

## 项目边界

本目录是项目的唯一根入口。`nutrition-agent-pov/` 是历史目录名，现已并入本目录的 `family/`、`recipes/`、`sources/`、`agent-rules/`、`prompts/`、`skills/`、`app/`、`infra/` 等实际目录；旧文档中的路径按本 README 和迁移记录解释。

## 目录

- `设计/`：MVP、用户故事、状态架构和 Agent 配置设计
- `计划/`：项目实施计划
- `部署/`：WeKnora 和运行环境部署说明
- `想法/`：已经进入本项目范围的产品想法
- `family/`、`recipes/`、`sources/`：稳定家庭饮食知识
- `inventory/`、`meals/`、`state/`：动态状态快照、数据模型和迁移
- `agent-rules/`、`prompts/`、`skills/`：Agent 规则和能力资产
- `app/`、`infra/`：MCP 服务代码与基础设施
- `STRUCTURE.md`：目录结构和职责说明，不承担项目进度真相

## 状态与职责边界

- 本 README 是项目范围、当前状态和下一步动作的唯一入口。
- `STRUCTURE.md` 只维护目录职责、文件归属和命名规则，不复制进度、测试结果或部署状态。
- 设计文档记录方案和未决决策；`app/` 记录实现与测试；`部署/` 和 `infra/` 记录运行与运维证据。
- `nutrition-agent-pov/` 只作为历史目录名保留，不作为当前命令、文件路径或同步根目录。

## 权威入口

- 项目范围、当前状态和回流规则：本文档
- 目录职责和文件归属：[`STRUCTURE.md`](./STRUCTURE.md)
- 设计基线：[`设计/`](./设计/)
- 运行状态和数据模型：[`state/`](./state/)
- 部署与运维：[`部署/`](./部署/)、[`infra/`](./infra/)
- 实现与测试：[`app/`](./app/)

设计、实现、测试和运行证据必须分别记录；设计推演不能代替实现或运行验证。
