# 家庭营养师项目入口治理实施计划

## 目标

将 `项目/家庭营养师/` 作为唯一当前项目根入口，清理运行、部署和设计文档中的过时 `nutrition-agent-pov/` 操作路径，同时保留必要的历史迁移说明。

## README 与 STRUCTURE 职责

- `README.md`：项目边界、当前状态、唯一根入口、权威入口、设计/实现/测试/运行证据分工和下一步动作。
- `STRUCTURE.md`：目录树、目录职责、文件命名、稳定知识与动态状态边界、平台/代码/部署边界；不承担进度真相。
- `nutrition-agent-pov` 只在 README 的历史目录说明或迁移注释中出现，不再作为当前命令、路径或源文件根目录。

## 实施步骤

1. 更新 `STRUCTURE.md` 的适用范围、目录树和 WeKnora 同步说明，全部改为当前项目根路径及实际子目录。
2. 更新 `weknora/agent-config.md`、`weknora/deployment-notes.md`，把知识库上传和配置修改路径改为 `项目/家庭营养师/` 下的实际目录。
3. 更新设计和执行文档中的旧路径：
   - `设计/01-家庭营养师Agent最小POV.md` 中的历史/概念路径保留为设计名称说明，不写成现有目录；
   - `设计/family-nutrition-phase-4-execution-plan.md` 的本地测试命令改为当前 `项目/家庭营养师/app`；
   - `设计/weknora-agent-configuration-plan.md` 的知识库目录和上传说明改为当前项目根目录。
4. 更新 `README.md`，明确其记录项目当前状态，`STRUCTURE.md` 不承担进度真相，并补充当前实现验证入口（若已有内容不重复扩写）。
5. 全项目搜索旧路径，确认只剩历史说明；检查相对链接和 Markdown 格式。
6. 运行家庭营养师 app 测试、`git diff --check`，审阅 diff，确保没有改动业务逻辑或删除文件。

## 约束

- 不创建新的兼容目录，不移动当前文件。
- 不删除 `nutrition-agent-pov` 字样；仅在确有历史语境的地方保留。
- 不改数据库、MCP 工具、Prompt 语义或部署机密。
- 不处理理想汽车案例和长期自动维护机制。
