# 腾讯 WeKnora 产品调研

> 调研日期：2026-09-23  
> 产品类型：Knowledge Base / Wiki / RAG / Agent Knowledge Backend  
> 调研口径：基于 WeKnora 当前项目实践、公开项目定位和家庭营养师 POV 中的配置经验整理。本文重点关注 WeKnora 在 Agent Workspace 语境下的角色，不展开底层源码细节。

---

## 0. 一句话定位

WeKnora 更像一个 **可私有化的知识库 / Wiki / RAG / Agent 问答底座**。

它解决的核心问题是：

```text
已有知识文档如何上传、索引、抽取、Wiki 化，并被 Agent 检索和引用。
```

它不是传统办公资料库，也不是企业数仓，而更适合作为：

```text
Knowledge backend for agents
= 文档知识库 + Wiki + RAG 检索 + Agent 问答 + 外部工具/MCP 接入
```

---

## 1. 产品定位

在我们的家庭营养师项目实践中，WeKnora 承担的是：

```text
稳定知识检索层 + Agent 对话入口
```

具体来说：

- 家庭画像、饮食规则、菜谱、Prompt、Skill 文档先在 Git Markdown 中维护；
- 同步到 WeKnora 后用于知识检索和 Wiki 展示；
- 用户通过 WeKnora Agent 进行对话；
- Agent 通过知识库理解规则、菜谱和上下文；
- 动态状态通过 MCP 访问独立 Postgres，而不是放在 WeKnora 知识库里。

当前我们采用的边界是：

```text
稳定知识：Git Markdown + WeKnora 知识库
动态状态：独立 Docker Postgres
状态读写：Family Nutrition MCP Service
对话入口：WeKnora Agent / 微信入口
```

这个边界很关键：WeKnora 负责“知道什么”，数据库负责“现在发生了什么”。

---

## 2. 核心能力

### 2.1 知识库索引

WeKnora 可以把文档作为知识源，进行索引、检索和问答。

适合进入知识库的内容包括：

- 稳定规则；
- 家庭画像；
- 菜谱；
- 操作规范；
- Prompt / Skill 说明；
- 外部来源整理；
- 由数据库导出的状态摘要快照。

不适合直接作为实时 source of truth 的内容包括：

- 当前库存；
- 采购事件；
- 实际做饭记录；
- 饭后反馈；
- 最近菜单去重；
- 任何需要事务、审计、幂等和实时查询的状态。

### 2.2 Wiki 展示和知识组织

WeKnora 支持 Wiki 化知识组织，适合把复杂知识整理为可读页面。

但项目实践中需要注意：

```text
Wiki 页面不等于知识库源文档。
```

我们遇到的现实边界是：

- Agent 可以修改 Wiki 页面；
- 但不一定能稳定直接编辑知识库源文档；
- 源文档通常仍需要在知识库管理界面手动更新，或重新上传替换；
- 因此 Git Markdown 仍应作为稳定知识 source of truth。

### 2.3 Agent 配置

WeKnora 自定义 Agent 支持多类配置，包括：

```text
agent_mode：quick-answer / smart-reasoning
agent_type：rag-qa / wiki-qa / hybrid-rag-wiki / data-analysis / custom
knowledge_bases：绑定知识库
allowed_tools：选择可用工具
web_search_enabled：是否启用外部搜索
skills_selection_mode：Skill 使用方式
selected_skills：绑定指定 Skill
memory_enabled：是否启用记忆
system_prompt：主提示词
```

在家庭营养师场景中，较合适的形态是：

```text
一个前台 Agent
+ 多个后台 Prompt / Skill 能力模块
+ MCP 动态状态工具
```

用户只面对一个入口，Agent 内部根据意图切换能力。

### 2.4 MCP / 工具接入

WeKnora 的价值不只在知识检索，还在于可以通过工具或 MCP 连接外部状态系统。

家庭营养师项目中，MCP 的职责是：

```text
只通过受控工具读写库存、采购、菜单、反馈等动态状态；
不暴露任意 SQL；
不让 Agent 直接操作数据库；
所有写入必须 schema 校验、用户确认、幂等和审计。
```

这使得 WeKnora 可以作为 Agent 入口，而不是把所有状态都塞进知识库。

---

## 3. 数据库与动态状态边界

WeKnora 自身可能有内部 PostgreSQL，但不应把业务表建在 WeKnora 内部数据库里。

原因：

```text
WeKnora 自带数据库属于平台内部数据，不作为业务系统数据库。
```

更重要的是，知识库不适合承担库存、菜单和反馈等事务状态：

```text
1. 知识库源文档不一定能被 Agent 稳定写回；
2. 上传/替换文档后需要重新索引，存在延迟；
3. RAG 可能召回旧版本库存；
4. 库存扣减需要事务、审计和幂等；
5. 多轮对话或未来微信入口可能重复触发写入；
6. 最近菜单、复吃频率、库存临期、采购历史需要结构化查询。
```

因此，正确架构是：

```text
WeKnora Agent
→ MCP 工具
→ 独立业务数据库 / Postgres
→ 定期导出 Markdown 快照
→ Git 归档 + 可选重新上传 WeKnora 知识库
```

而不是：

```text
WeKnora 知识库 Markdown
→ 直接作为库存 / 菜单 / 反馈的实时状态库
```

---

## 4. 优势

### 4.1 适合私有化知识检索

WeKnora 的突出价值是能作为自部署知识库和 RAG 平台使用。对于敏感数据场景，这比纯 SaaS 办公工具更可控。

### 4.2 适合垂直 Agent 的知识底座

如果目标是构建一个家庭营养师、企业知识助手、行业问答 Agent，WeKnora 的知识库 + Agent 配置模式比较直接。

### 4.3 可以通过 MCP 接入业务状态

相比把状态写进知识库，MCP 能给 Agent 提供更安全的受控工具边界。

### 4.4 与 Git Markdown 适配较好

稳定知识可以先在 Git 中维护，再同步到 WeKnora。这样知识源具有版本控制和可回滚能力。

---

## 5. 短板与风险

### 5.1 源文档编辑链路不够顺滑

当前实践中，Agent 修改 Wiki 页面不等于修改知识库源文档。源文档更新通常需要重新上传或手工替换。

这会影响“知识自动复利”：

```text
如果 Agent 只能更新 Wiki，而 Git Markdown / 知识库源文档没有同步，长期会出现版本分叉。
```

### 5.2 不适合作为协作文档工作区

WeKnora 更偏知识检索和问答，不如飞书云文档或 WorkBuddy 资料库那样天然适合日常多人协作、评论、修订、页面发布和办公流转。

### 5.3 动态状态不能放知识库

库存、采购、菜单、反馈等状态如果只放 Markdown 或 Wiki，会遇到延迟、旧版本召回、重复写入、缺少事务和审计等问题。

### 5.4 配置和部署门槛较高

相比 WorkBuddy 或飞书这类 SaaS 办公产品，WeKnora 更偏平台型，普通用户需要理解：

- 知识库；
- Wiki；
- Agent 类型；
- Skill；
- Prompt；
- MCP；
- 模型并发；
- Docker 部署；
- 数据库边界。

---

## 6. 适用场景

WeKnora 适合：

- 私有化知识库问答；
- 企业内部文档 RAG；
- 垂直领域知识 Agent；
- 需要绑定自有 MCP 工具的 Agent；
- 对知识源版本可控有要求的项目；
- 不希望把敏感知识完全托管到外部 SaaS 的场景。

不适合直接承担：

- 日常办公协作文档工作区；
- Agent 产物自动发布平台；
- 企业数仓；
- 事务业务数据库；
- 高体验低门槛的普通办公 AI 工作台。

---

## 7. 对我们项目的启示

对家庭营养师项目：

- WeKnora 适合作为知识检索和对话入口；
- Git Markdown 必须继续作为稳定知识源；
- Postgres 必须作为动态状态 source of truth；
- MCP 必须作为状态读写边界；
- Wiki 可作为可视化和临时编辑层，但不能成为唯一版本。

对连山产品分析：

- WeKnora 提供了“可私有化知识库 + Agent 问答”的参考；
- 但如果做工业 AI 平台，还必须补足资料协作、产物沉淀、审阅、运行时状态、HITL、EVI 和价值归因；
- 因此 WeKnora 更像知识底座，不是完整行业 Agent 工作台。

---

## 8. 后续需要验证的问题

1. WeKnora 对源文档的更新能力是否有 API 或自动同步机制；
2. Wiki 页面与源文档是否有可靠一致性策略；
3. Agent 写 Wiki 的审计、diff 和回滚能力；
4. 知识库标签、分类、目录和召回策略的具体影响；
5. 自定义 Agent 的工具权限粒度；
6. MCP 接入的鉴权、限流和审计能力；
7. 大规模文档索引、Wiki 抽取和模型并发控制能力；
8. 企业级多租户、权限隔离和私有部署能力；
9. 是否支持知识质量检查、冲突检测和过期内容识别；
10. 与 Git Markdown 的自动同步方案。

---

## 9. 参考资料

1. WeKnora GitHub：`https://github.com/Tencent/WeKnora`
2. 本项目 WeKnora Agent 配置方案：`docs/family-knowledge-compounding-pov/product/weknora-agent-configuration-plan.md`
3. 本项目 WeKnora 知识库配置：`docs/family-knowledge-compounding-pov/nutrition-agent-pov/weknora/knowledge-base-config.md`
4. 本项目家庭营养师动态状态架构：`docs/family-knowledge-compounding-pov/product/family-nutrition-state-architecture.md`
