# 产品研究分类与理想汽车案例归档调整计划

## 目标

根据已完成的产品能力 review，修正产品主分类、清理过期占位文档、明确 Agent Runtime 邻接边界，并将设备维修全生命周期案例归入理想汽车案例集合。

## 调整范围

### 1. 产品分类

- 将 `研究/产品/Agent工作台/tencent-weknora.md` 移动到 `研究/产品/知识库/tencent-weknora.md`。
- 将 `研究/产品/Agent运行时/impeccable.md` 移动到 `研究/产品/编程Agent/impeccable.md`。
- 删除已失效的 `研究/产品/Agent运行时/helix-agent-fleet.md` 重定向占位文件，并从 Agent Runtime 索引移除。
- 新建 `研究/产品/Agent资产与团队治理/`，将以下产品从 Agent Runtime / Agent Learning Systems 中迁移：
  - `teamai-cli.md`
  - `paperclip.md`
  - `skillhub-vs-skills-manager-and-a2a-skill-design.md`
- 更新 `Agent运行时/README.md`，将目录定位扩展为 `Agent Runtime / Harness / Control Plane`，并明确 Laya 是运行时决策支撑组件、REA 是证据型 MCP 工具运行时；移除已迁移产品和 Helix 占位条目。
- 更新 `Agent学习系统/README.md`，移除已迁移的 SkillHub 文档，并增加其“Agent 资产与团队治理”归属说明。
- 更新 `Agent工作台/README.md`，移除 WeKnora 主条目，并说明它属于知识库但可作为 Agent Workspace 的知识后端。
- 更新 `知识库/README.md`，加入 WeKnora 的产品索引和定位说明。
- 新建 `Agent资产与团队治理/README.md`，定义 Skill 注册、团队 Harness 分发、Agent 组织控制面和资产治理边界，并索引三份产品文档。
- 更新 `编程Agent/README.md`，加入 Impeccable 产品索引，说明其是 coding agent 的设计工作流与质量门，而非 Agent Runtime。

### 2. AI Native 工程架构归档

- 将 `研究/产品/工业AI/ai-native/` 移动到 `项目/AI-Native任务闭环平台/设计/`，因为其 README 和正文明确这是面向后续实现的工程架构设计，不是外部产品调研。
- 新建 `项目/AI-Native任务闭环平台/README.md`，说明项目边界、设计目录和与 `洞察` / `研究/产品/工业AI` / `项目/SPC-DeepSeek-Harness` 的关系。
- 将设计目录 README 中的来源链接更新为新路径下可用的相对链接，并保留其内部文档链接。
- 更新 `研究/产品/工业AI/README.md`，明确 `lattice/` 是外部工业 AI 产品，`lianshan/` 是内部连山产品与代码仓分析，并将 AI Native 任务闭环架构设计指向新项目路径。

### 3. 理想汽车案例归档

- 将 `研究/案例/设备维修全生命周期/` 移动到 `研究/案例/理想汽车/设备维修全生命周期/`，保留截图与正文相对关系。
- 将正文文件重命名为 `理想汽车-设备维修全生命周期管理系统.md`，并把一级标题和案例元信息明确为理想汽车 / 理想 AI FOR ME 社区案例。
- 更新该案例子目录 README 的链接和说明。
- 更新 `研究/案例/理想汽车/README.md`，加入设备维修全生命周期案例索引和一句话摘要。
- 检查全仓库旧路径、旧文件名和旧分类引用，修复所有 Markdown 相对链接。

## 验证

1. 使用 `find` 检查新旧目录结构和文件是否完整。
2. 使用 `rg` 检查旧路径、旧文件名、`helix-agent-fleet` 和旧分类索引是否残留。
3. 执行 Markdown 相对链接检查，确保无缺失链接。
4. 执行 `git diff --check`。
5. 检查 `git status` 和变更摘要，确认全部迁移被识别为重命名或预期新增/删除。

## 不在本次范围

- 不修改产品文档的事实内容和能力判断。
- 不把 Open Ontologies 移动到数据治理平台；本次保留在 AI 原生数据平台并通过索引标注其为语义治理组件。
- 不新建独立的 Agent 工具与协议分类；REA 暂留 Agent Runtime，作为邻接的证据型 MCP 工具运行时。
- 不提交或推送 Git，除非用户后续明确要求。
