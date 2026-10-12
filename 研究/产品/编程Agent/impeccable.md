# 产品调研：Impeccable

> 调研日期：2026-10-10
> 调研对象：`pbakaus/impeccable`（面向 AI coding agents 的设计指导 skill）
> 资料来源：官方仓库 README；未在真实前端项目运行 live、detector 或 CI。
> 分类：agent-runtime-harnesses（设计治理与确定性质量门）

---

## 1. 一句话定位

**Impeccable 不是 UI 组件库，而是一套给 coding Agent 使用的设计工作流：用 PRODUCT.md / DESIGN.md 固化项目真相，用 24 个命令指导构思、塑形、审查和迭代，再用 59 条确定性 detector 规则检查常见视觉与可访问性问题。**

## 2. 核心能力拆解

### 2.1 Durable product/design contract

`PRODUCT.md` 保存产品真相，`DESIGN.md` 保存设计系统和项目设计指导。Agent 在后续任务中读取这些上下文，减少每次从零猜测用户、品牌、交互和视觉边界。

### 2.2 24 个工作流命令

包含 `init`、`craft`、`document`、`extract`、`shape`、`critique`、`audit`、`polish`、`bolder`、`quieter`、`distill`、`harden`、`onboard`、`animate`、`colorize`、`typeset`、`layout`、`delight`、`overdrive`、`clarify`、`adapt`、`optimize`、`live`、`generate`。命令将“塑形、构建、检查、优化”拆开，避免 Agent 一上来只生成代码。

### 2.3 Deterministic detector

Detector 不需要 LLM/API key，可识别过度使用字体、紫色渐变、嵌套卡片、彩色背景上的灰字、不合适 easing、可访问性、触控目标、标题结构、布局和 spacing 等问题，可输出适合 CI 的 JSON。

### 2.4 Live browser iteration

`live` 支持在真实浏览器中迭代和验证页面，配合 provider-native hooks 安装到不同 Agent harness。该模式应只用于可信本地项目，因为验证脚本可能以用户权限执行项目命令。

### 2.5 配置与团队适配

支持 provider/harness 多种集成、项目级与本地配置分离、安装 hooks，并把静态规则和 LLM 审查组合起来：确定性规则负责可重复的底线，Agent 负责语义和审美判断。

## 3. 与相邻产品的差异

| 维度 | Impeccable | ESLint/axe | 普通 UI 生成 Agent | TeamAI | DSH |
|---|---|---|---|---|---|
| 对象 | 设计决策与前端实现 | 代码/无障碍规则 | 页面代码 | 团队 Harness 资产 | 诊断 UI 与报告 |
| 方法 | 命令化设计流程+detector | 静态规则 | prompt 生成 | Git 分发 | 计划/证据/人审门 |
| 持久上下文 | PRODUCT/DESIGN.md | 配置文件 | 常缺失 | skills/rules/docs | Pack/profile/FMEA |
| 反馈 | browser/live + JSON | lint/test | 人工挑错 | session friction | 工单反馈/专家确认 |

## 4. 优势

1. **先定义产品和设计真相，再写代码**：将隐性审美和交互约束变成可复用资产。
2. **detector 确定性强**：不依赖模型、不受 prompt 波动影响，可在 CI 作为质量门。
3. **命令按阶段组织**：shape/craft/critique/polish 等阶段化流程比“一次生成完整页面”更容易控制。
4. **静态检查与 LLM 互补**：规则检查硬问题，Agent 处理意图、层次和体验。
5. **对多 harness 友好**：不把工作流锁死在单一 coding Agent。

## 5. 短板 / 未验证点

1. 设计 detector 不能证明产品业务正确、数据真实或交互逻辑安全。
2. live 模式的项目脚本权限很高，必须限制在可信本地仓库，生产站点应只检查不直接修改。
3. 规则覆盖偏前端设计，工业工作台还需补充数据密度、告警优先级、长时序可读性和人因安全规则。
4. 本次未运行 detector、browser iteration、hooks 和 CI JSON 输出。

## 6. 适用场景

AI 辅助前端开发、设计系统落地、已有项目视觉审查、可访问性和响应式回归、需要将设计质量纳入 CI 的团队。

## 7. 对我们当前项目的启发

1. **建立诊断产品真相文件**：类似 PRODUCT.md/DESIGN.md，维护工厂角色、告警等级、证据展示原则、术语、颜色语义、审批交互和不可违反的安全规则。
2. **先 shape 再 build**：工作台新增诊断视图前先定义对象、状态、证据、动作、空/错/超时状态和人审路径，再让 Agent 生成实现。
3. **为工业 UI 建确定性 detector**：检测告警颜色语义冲突、危险动作缺确认、关键证据无来源、趋势图缺单位、表格无法定位时间、触控目标过小、状态层级混乱等问题。
4. **把 UI 检查接入发布门**：detector JSON 与 Playwright/Storybook 结果一起进入 Pack/UI 发布门；LLM critique 只能补充，不得替代硬规则。
5. **trusted live 边界**：浏览器自动化和项目脚本执行必须在本地可信工程、隔离 workspace 和明确权限下进行，不能让生产 Agent 直接改现场系统。

## 8. 后续需要实测的问题

1. detector 规则能否稳定解析 React/Vue/Canvas/图表等工业工作台技术栈。
2. 设计真相文件在多 profile、多租户主题和白标交付中的继承/覆盖规则。
3. 将 detector findings 与工作台组件、Pack 版本和审批记录关联的 schema。
4. live 验证在无头浏览器、远程计算节点和受限网络下的安全边界。
5. 视觉质量门与业务安全门发生冲突时，如何定义 fail-closed 优先级。
