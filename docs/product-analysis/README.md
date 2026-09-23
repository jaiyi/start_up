# 产品分析

本目录用于持续沉淀 AI 产品、知识库、Agent 工作台、行业智能化平台与相关商业化方案的调研。

## 分类原则

这里优先按照“产品类型 / 能力形态”分类，而不是按照厂家分类。

原因：

1. 同一家公司通常会有多个产品线，按厂家分类容易把不同类型产品混在一起。
2. 我们更关心产品在“知识复利、Agent 工作流、行业落地、数据闭环”中的位置。
3. 按产品类型分类更方便横向比较，例如 WorkBuddy、飞书知识问答、ima、Dify Knowledge 等不一定属于同一厂家，但可能都在争夺“知识工作台”位置。
4. 后续做产品策略分析时，更容易看清每类产品的共性能力、差异化壁垒和可借鉴设计。

## 当前目录

```text
product-analysis/
├── README.md
├── agent-workspaces/          # Agent 工作台、人机协作资料库、任务空间、产物沉淀层
├── industrial-ai-platforms/   # 工业 AI 平台、行业 Agent 平台、制造质量/工艺类产品
├── knowledge-bases/           # 知识库、RAG、Wiki、企业知识管理产品
├── coding-agents/             # 编程 Agent、AI IDE、代码协作产品
├── office-ai/                 # 办公 AI、文档/表格/PPT/会议助手
└── references/                # 横向对比、评估框架、调研模板、方法论
```

## 分类说明

### `agent-workspaces/`

用于分析 Agent 工作台、人机协作空间、资料库、任务空间、产物沉淀层。

典型问题：

- Agent 产物如何沉淀？
- 人和 Agent 如何共同编辑资料？
- 权限是否同时约束人和 Agent？
- 是否支持任务上下文复用？
- 是否能从文档走向页面、轻应用或业务工作流？

当前样例：

- 腾讯 WorkBuddy 资料库

### `industrial-ai-platforms/`

用于分析工业 AI 平台、行业 Agent 平台、制造质量/工艺/设备等场景产品。

典型问题：

- 是否有私有化部署能力？
- 是否有工业数据接入和状态管理能力？
- 是否能沉淀行业知识、工艺经验和诊断流程？
- 是否有 HITL、人审、EVI、价值归因、反馈闭环？
- 是否能从 demo 走向生产系统？

当前样例：

- 连山 / Lianshan

### `knowledge-bases/`

用于分析知识库、RAG、Wiki、企业知识管理、知识问答产品。

典型问题：

- 文档如何上传、切片、索引和召回？
- Wiki 与源文档是否一致？
- Agent 是否能更新源文档？
- 是否支持权限、引用溯源、版本管理和知识质量治理？
- 是否适合作为动态状态 source of truth？

潜在对象：

- WeKnora
- ima 知识库
- Dify Knowledge
- AnythingLLM
- FastGPT

### `coding-agents/`

用于分析编程 Agent、AI IDE、代码协作产品。

典型问题：

- Agent 如何理解代码仓？
- 是否支持计划、编辑、测试、提交、代码审查？
- 是否支持多 Agent 协作？
- 是否能沉淀项目记忆和工程规范？
- 安全边界和权限控制如何设计？

潜在对象：

- Claude Code
- Cursor
- Windsurf
- Trae
- GitHub Copilot Coding Agent

### `office-ai/`

用于分析办公 AI、文档/表格/PPT/会议助手。

典型问题：

- 是否嵌入原有办公套件？
- 是否能处理文档、表格、PPT、会议纪要？
- 是否支持组织权限和团队协作？
- 是否有可复用模板、专家、Skill 或工作流？

潜在对象：

- Microsoft 365 Copilot
- 飞书智能伙伴
- 腾讯文档 AI
- WPS AI

### `references/`

用于存放跨产品横向比较和调研方法论。

建议内容：

- 产品分析模板
- 能力评估矩阵
- Agent 工作台横向对比
- 知识库产品横向对比
- 行业 AI 平台落地评价标准

## 文档命名建议

单产品分析：

```text
<vendor>-<product>-<topic>.md
```

例如：

```text
tencent-workbuddy-library-vs-weknora.md
```

横向对比：

```text
<category>-comparison-<topic>.md
```

例如：

```text
agent-workspaces-comparison-artifact-layer.md
knowledge-bases-comparison-source-doc-lifecycle.md
```

同一产品有多篇深度分析时，可以建立子目录：

```text
industrial-ai-platforms/lianshan/
agent-workspaces/workbuddy/
knowledge-bases/weknora/
```

## 推荐调研结构

每篇产品分析尽量包含：

1. 调研对象与资料来源；
2. 一句话定位；
3. 核心能力拆解；
4. 与相邻产品的差异；
5. 优势；
6. 短板 / 未验证点；
7. 适用场景；
8. 对我们当前项目的启发；
9. 后续需要实测的问题。
