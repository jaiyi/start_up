# DeepSeek Bot 集成评估与团队知识工程文档更新计划

## 目标
基于 `/tmp/DeepSeek-Bot` 已克隆源码，完成事实核验，明确其与 DeepSeek Harness、WeKnora、SkillHub、Git/CI 和运行观测层的边界；将结论沉淀到 `项目/团队知识工程/`，避免把未验证的外部能力写成架构事实。

## 已核验范围
- 插件入口与模块加载：`ds-bot/index.js`、`cordis.patch.yml`
- Bot、Main Bot、Session、群聊和消息路由：`src/host/roster.js`、`agents.js`、`groups.js`、`tools.js`、`store.js`
- Memory、审计和自动复核：`src/host/memory.js`
- Bot 权限、Secret、连接器、定时任务、使用统计：`permissions.js`、`secrets.js`、`connectors.js`、`schedules.js`、`usage.js`
- 仓库关键词检索和测试可用性；如依赖未安装，明确记录测试未运行

## 实施步骤
1. 新增 `设计/09-DeepSeek-Bot集成评估.md`：记录产品定位、源码证据、数据模型、权限/记忆/协作模型、能力矩阵、集成方案、限制和 PoC 清单。
2. 更新 `README.md`：将 DeepSeek Bot 标为可选的 DSH Agent 协作插件，并明确不是知识库、SkillHub 或企业 RBAC；增加评估文档入口。
3. 更新 `设计/00-总体概览.md`：在架构图和分层中加入“Agent 协作层”，并标注本地状态、长生命周期 Session、群聊和记忆的边界。
4. 更新 `设计/01-系统边界与职责分层.md`：补充 DeepSeek Bot 的职责、不负责事项和单一事实来源关系。
5. 更新 `设计/02-上下游数据流与状态机.md`：补充 Bot 协作、Memory 候选和运行反馈的事件流，明确 Memory 不等于正式知识。
6. 更新 `设计/03-知识与Skill资产模型.md`：区分 DS Bot Memory、WeKnora Knowledge、SkillHub Skill；补充候选晋升约束。
7. 更新 `设计/05-自动化治理与人工控制点.md`：补充 Main Bot/Group Admin 不是企业级审批，群聊和 Memory 只能生成候选。
8. 更新 `设计/06-运行反馈与知识闭环.md`：补充 Bot、group、memory、session 关联字段和外部遥测仍需适配器验证。
9. 更新 `设计/07-安全权限与审计.md`：补充本地 `state.json`、`secrets.json`、Memory journal、文件锁、Secret 脱敏和 Bot 权限不等于组织 RBAC。
10. 更新 `设计/08-MVP实施路线与验证矩阵.md`：加入 DS Bot 集成验证项，覆盖安装、固定 Skill/知识适配、trace 归因、Memory 晋升、多人/服务端部署和权限映射。
11. 运行 Markdown 链接、格式和 `git diff --check` 检查；不修改 `/tmp/DeepSeek-Bot`。

## 约束
- 不声称 DeepSeek Bot 已原生支持 WeKnora、SkillHub、OTel、Phoenix、Langfuse 或企业多租户，除非源码提供证据。
- 不把 DS Bot 的本地 Memory 自动发布为 WeKnora 知识。
- 不提交或推送，除非用户另行明确要求；若后续推送，目标只能是 `main`。
