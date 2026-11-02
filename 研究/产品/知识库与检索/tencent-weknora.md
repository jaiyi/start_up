# 腾讯 WeKnora 产品调研

> 初次调研：2026-09-23；更新：2026-10-20；对照版本：v0.8.3（官方发布日期 2026-10-14）。
> 产品类型：Knowledge Base / Wiki / RAG / Agent Knowledge Backend
> 调研口径：以 [官方 v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)及对应功能/API 文档为产品能力依据，保留家庭营养师 POV 的历史实践与架构判断。**以下新增能力是官方文档确认，不代表家庭营养师实例已升级或逐项实测**；「v0.8.3 新增」与「截至 v0.8.3 可用、并非本版新增」分别标注。

---

## 0. 一句话定位

WeKnora 更像一个 **可私有化的知识库 / Wiki / RAG / Agent 问答底座**。

它解决的核心问题是：

```text
已有知识文档如何上传、索引、抽取、Wiki 化，并被 Agent 检索和引用。
```

它不是传统办公资料库，也不是企业数仓，而更适合作为：

```text
知识库 + Wiki/图谱 + 混合检索/多模态 RAG + Agent/技能沙箱 + 双向 MCP 接入
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

### 2.1 知识库索引、解析与检索

WeKnora 可以把文件、网页、手写 Markdown、FAQ 及同步的数据源作为知识条目，解析/分块后进行索引、检索和引用问答。官方文档列有 PDF/扫描件 OCR、Office、Markdown、HTML、EPUB、XMind、图片与音频（依赖相应 VLM/ASR 配置）等，支持向量 + BM25 混合检索、RRF 融合、重排，以及可选的 Wiki/知识图谱。**这些是当前产品能力，不应统称 v0.8.3 新增。**[产品介绍](https://weknora.weixin.qq.com/docs/01-getting-started/01-introduction) · [检索引擎](https://weknora.weixin.qq.com/docs/03-features/05-retrieval-engines)

v0.8.3 在此链路增补了图片画廊（集中浏览解析提取的图片、按来源筛选，搜索描述/OCR）和**可选**的多模态 Embedding 图片向量检索：文本可召回相关图片，命中后可用支持图片输入的重排/视觉模型处理。画廊本身无需打开图片向量；后者默认关闭，必须配置支持图片的 Embedding、开启多模态与知识库开关，旧文档重新解析后才能补建图片向量；扫描 PDF 的整页图片不生成图片向量，仍走 OCR 文本。官方举例 WeMM-Embedding、Qwen3-VL-Embedding，新增 WeMM 2B/4B/9B 预设及 Transformers 部署脚本；不能据此宣称任意 Embedding 都支持图片。[v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3) · [知识库与知识管理](https://weknora.weixin.qq.com/docs/03-features/02-knowledge-base)

v0.8.3 还允许**有原文件访问权限**的登录用户从回答引用打开 PDF、Office、Markdown、TXT、EPUB 等原件并定位/高亮相关片段；音频有分段时间时可跳转播放。旧文档需重新解析才能获得精确定位；手录/FAQ 等无原文件的条目、嵌入聊天访客仍用引用列表核查来源。[v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

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

### 2.2 Wiki 展示、版本与知识组织

Wiki 将知识库资料转为带来源的 Markdown 主题页面；人工和 Agent 可编辑 Wiki 页面，查看历史、比较差异并回滚（历史按策略裁剪，不能替代永久版本归档）。v0.8.3 的**Wiki 页面关系图**增加分组布局、主题说明、聚焦视图、减少标题重叠、隐藏孤立页面及来源文档摘要连接，Wiki 搜索 API 支持跨有权限的多个知识库；这个 Wiki 页面链接图**不同于**知识库设置中的实体关系知识图谱。以上是产品能力，不能据此推断生成页面会自动合并进源文件。[Wiki 能力](https://weknora.weixin.qq.com/docs/03-features/14-wiki) · [v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

需要区分四层可编辑对象：[知识库与知识管理](https://weknora.weixin.qq.com/docs/03-features/02-knowledge-base) · [知识 API](https://weknora.weixin.qq.com/docs/04-api/02-api-knowledge) · [分块 API](https://weknora.weixin.qq.com/docs/04-api/02-api-chunks)

| 对象 | 当前官方能力 | 不等于什么 |
|---|---|---|
| Wiki 派生页面 | 人工/Agent 编辑、版本比较与回滚 | 不自动回写上传文件或 Git Markdown |
| 手工创建的 Markdown 知识 | `PUT /api/v1/knowledge/manual/:id` 可更新内容并发布/保存草稿；须有写权限 | 不等于对任意上传文件原件直接修改 |
| 已解析的文本分块 | 可编辑、重建索引、有版本和回滚；仅文本分块可编辑，源内容仍保留 | 不等于修改原 PDF/Office/Markdown 文件；重新解析时需复核改动是否保留 |
| 上传文件及 Git 原稿 | 上传、重新解析与文档管理；Git 同步需另设流程 | 不能把 Wiki 编辑或索引修订视作 Git 双向同步 |

因此旧版「源文档只能手动替换」过于笼统：**手工 Markdown 与文本分块已有明确编辑 API**；但本项目的 Git Markdown 若作为主源，仍须自行建立带权限、冲突处理和版本审计的同步流程。

### 2.3 Agent 配置

在 v0.8.3 中，快速问答（`quick-answer`）偏单轮 RAG；智能推理（`smart-reasoning`）可用多轮工具、MCP、技能沙箱。类型预设与运行模式不是一回事。智能体可选择知识库范围、可用工具、模型、提示词、联网搜索、技能及长期记忆；实际访问仍受调用者、渠道及资源授权限制。[Agent 引擎](https://weknora.weixin.qq.com/docs/03-features/07-agent)

```text
agent_mode：quick-answer / smart-reasoning
agent_type：rag-qa / wiki-qa / hybrid-rag-wiki / data-analysis / custom（类型预设）
knowledge_bases / kb_selection_mode：知识范围
allowed_tools：内置工具白名单；null/省略取默认，显式 [] 表示不选内置工具
web_search_enabled：外部搜索开关
skills_selection_mode / selected_skills / sandbox_config_id：技能范围与运行沙箱
memory_enabled：是否使用跨会话长期记忆（省略则继承空间设置）
system_prompt：主提示词
```

v0.8.3 工具选择界面按知识库能力展示候选工具，并支持明确选择**不使用内置工具**；旧版依赖 `allowed_tools: []` 获取默认工具的 API 调用需要检查升级兼容。技能和 MCP 列表支持搜索。会话可按需分页读取附件、查看图片，**附件阅读无需沙箱**；`@` 资源菜单可搜索/选择有权访问的知识库、标签、技能、文件，`@技能` 仅提示优先使用，不能越权。共享空间使用智能体时可连接调用者自己的本机浏览器；会话增加未读回答标记，嵌入聊天可粘贴截图或只发送图片。[v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3) · [会话体验](https://weknora.weixin.qq.com/docs/03-features/18-chat-experience)

长期记忆保存调用者资料、偏好和长期关注，按空间及调用者隔离，空间默认关闭，个人或智能体还可关闭；支持显式记住或自动提取，推断项需确认后才生效。这是**截至 v0.8.3 的现有能力**，不是本版新增，也不是库存/菜单等业务事务数据库。[长期记忆](https://weknora.weixin.qq.com/docs/03-features/23-memory)

在家庭营养师场景中，较合适的形态是：

```text
一个前台 Agent
+ 多个后台 Prompt / Skill 能力模块
+ MCP 动态状态工具
```

用户只面对一个入口，Agent 内部根据意图切换能力。

### 2.4 MCP / 工具接入（两个方向）

1. **WeKnora 作为 MCP 客户端**：在「工具箱 → MCP 服务」接外部 SSE / Streamable HTTP 工具，可按工具启停与要求人工审批；支持 API Key、Bearer 或 OAuth。v0.8.3 改进 OAuth 审批后继续授权、预注册客户端/上游支持时无浏览器授权，以及协议协商、重连和结果传递；**MCP 客户端不支持 stdio**。审批机制适用于需审批的 MCP 工具，不要误写成所有技能脚本自动要求人工审批。[MCP 集成](https://weknora.weixin.qq.com/docs/03-features/08-mcp) · [v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)
2. **WeKnora 作为 MCP Server（v0.8.2 已有）**：每个空间创建独立端点，将知识库检索/阅读、问答、Wiki 与**默认关闭**的写入工具提供给 Claude Code/Cursor 等客户端；端点可限制知识库范围、工具、令牌及速率。写入仅在显式开放并满足授权时可用，不能据此说「所有 Agent 都可改源文件」。[v0.8.2 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.2) · [MCP 集成](https://weknora.weixin.qq.com/docs/03-features/08-mcp)

家庭营养师项目中，自建 MCP 的职责是：

```text
只通过受控工具读写库存、采购、菜单、反馈等动态状态；
不暴露任意 SQL；
不让 Agent 直接操作数据库；
所有写入必须 schema 校验、用户确认、幂等和审计。
```

这使得 WeKnora 可以作为 Agent 入口，而不是把所有状态都塞进知识库。

### 2.5 技能目录与沙箱执行

**技能沙箱不是仅在 v0.8.3 才出现**：空间管理员配置 Docker、CubeSandbox 或 E2B 沙箱；技能包以 `SKILL.md` 加脚本/模板/资料组成，来源可为 ZIP、ClawHub/SkillHub、GitHub/GitLab 或公开 URL。先添加到空间技能目录，再对指定沙箱**安装并验证就绪**，智能推理 Agent 才能选择沙箱并使用全部/指定/禁用技能；`@技能` 不越过授权边界。生成的远程沙箱交付文件写入 `/workspace/output`，可在会话中预览/下载。[技能目录与沙箱](https://weknora.weixin.qq.com/docs/03-features/22-skills-sandbox)

v0.8.3 新增 **Docker 对话侧交互终端**（断开即结束当前 Shell）、**macOS Lite 桌面版的本机技能安装**；Cube/E2B 终端、Lite 本机沙箱属于 v0.8.2 已有能力。Docker 后端默认关闭，若挂载 Docker socket 给 app，相当于授予宿主机 Docker 控制权；Cube/E2B 支持更细的出站网络策略，Docker 则按网络模式控制。远程沙箱执行默认 `root`，`/workspace` 只是工作目录而非安全边界；技能来源可匿名下载，但第三方代码/依赖必须审查和限制凭据/网络，尤其**共享 Agent 在来源空间执行技能且可能接触管理员配置的环境变量**。macOS Lite 本机沙箱采用系统隔离，项目文件修改不会随着会话回滚自动恢复，Windows/Linux 不提供同等本机能力。[技能目录与沙箱](https://weknora.weixin.qq.com/docs/03-features/22-skills-sandbox) · [Agent 引擎](https://weknora.weixin.qq.com/docs/03-features/07-agent) · [v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

### 2.6 数据源、模型与管理面

截至 v0.8.3，可接入飞书/Lark、Notion、Confluence、语雀、钉钉文档、腾讯 IMA、GitLab、RSS 等来源；**本版新增 Seafile**：在同一个未加密资料库选定目录/文件，同步层级、增量和可选删除，暂不支持 SeaDoc 在线文档；凭据/私网 fileserver 需按官方 SSRF 与权限配置，源端改名/移动可能重新导入且改变知识条目 ID。[数据源](https://weknora.weixin.qq.com/docs/03-features/10-datasource) · [Seafile 接入](https://weknora.weixin.qq.com/docs/03-features/25-seafile)

v0.8.3 对 Confluence/语雀同步保留目录层级，钉钉补充钉盘 Office/PDF 导入，改善多个连接器的分页/失败重试；解析更新 AnyDoc 0.2.4、可接自建 MinerU 4.0 V1 API，修复 EPUB、PPTX、Excel、Markdown 表格问题；图片 OCR 可按检测到的属性选择，重复/空白/截断结果不再作为有效内容入库；检索 API 与问答统一重排行为，增加检索方式、阈值、重排参数与诊断返回，并修复知识图谱实体关系方向/来源与查询截断提示。这些是**版本改进/修复**，不表示源端到索引零延迟。智能体排队追问、上下文压缩、调用超时，以及 IM、CLI、SDK 的同步/上传/流式体验亦有修复；具体能力以回归测试为准。[v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

管理面新增平台账号启停/密码重置与管理员身份管理、`invite_register` 仅邀请注册；模型目录可编辑/预览/发布/恢复，内置厂商由 v0.8.2 的 27 个扩至 30 个，并增补 Hugging Face TEI、Pinecone 和 Cohere 重排接入。具备工作空间角色、知识库共享与 API Key 权限，但仍需验证项目所需的文档级最小授权、审计保留策略与部署规模。v0.8.3 同时更新 ParadeDB 镜像、完善 Helm 配置、增加繁体中文界面，并修复部分共享知识库权限和渠道会话管理问题；这些是部署/管理改进，不是检索算法的新特性。[平台管理](https://weknora.weixin.qq.com/docs/03-features/20-platform-admin) · [模型管理](https://weknora.weixin.qq.com/docs/03-features/06-models) · [空间与权限](https://weknora.weixin.qq.com/docs/03-features/01-tenant-auth) · [版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

### 2.7 评估、审计与客户端（已有能力，不按 v0.8.3 新增统计）

产品文档提供检索/回答评估、知识库活动与空间/平台审计、后台任务队列及可选 Langfuse 全链路追踪；有 REST/API Key、CLI、SDK、桌面等接入形态。**提供这些工具不等于已验证特定行业知识质量、全量行为审计或成本收益闭环**；应以实际项目数据集和部署设置验证。[评估能力](https://weknora.weixin.qq.com/docs/03-features/15-evaluation) · [可观测性与审计](https://weknora.weixin.qq.com/docs/03-features/16-observability) · [产品介绍](https://weknora.weixin.qq.com/docs/01-getting-started/01-introduction)

---

## 3. 数据库与动态状态边界

WeKnora 自身使用平台数据库保存知识、会话、配置等信息（部署可以使用 PostgreSQL 或 Lite 所支持的存储方式），但**不能直接把业务表建在其内部数据模型里作为业务主库**。这里的「不能」是本项目的架构约束，并非软件阻止管理员连接同一数据库实例。

更重要的是，知识库及长期记忆不适合承担库存、菜单和反馈等事务状态：

```text
1. 手工 Markdown 和文本分块虽可经授权编辑，但不等于 Agent 对上传原件/Git 的受控事务写回；
2. 上传、更新或重新解析需要索引刷新，旧片段在更新期间可能影响召回；
3. 库存扣减需要事务、校验、幂等和审计；
4. 多轮对话或微信入口可能重复触发写入；
5. 最近菜单、复吃频率、库存临期、采购历史需要结构化查询。
```

因此，对家庭营养师项目更稳妥的架构是：

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

### 4.1 私有化、可配置的知识检索

WeKnora 支持自部署及可配置的解析、混合检索、重排和引用。画廊、多模态图片检索与原文定位增强了包含图表/截图资料的可用性；但要配模型、权限和存储，不能将演示效果视为零配置体验。

### 4.2 适合垂直 Agent 的知识底座

如果目标是构建一个家庭营养师、企业知识助手、行业问答 Agent，WeKnora 的知识库 + Agent 配置模式比较直接。

### 4.3 连接业务工具，也能对外提供知识服务

MCP 客户端让 Agent 在权限与审批约束下调用外部状态工具；内置 MCP Server 可让其他 Agent 消费本产品的检索/问答能力。技能沙箱支持文件产物和多步骤任务，但能力越强，对沙箱隔离、第三方代码审查和凭据授权要求越高。

### 4.4 与 Git Markdown 适配较好

稳定知识可以先在 Git 中维护，再同步到 WeKnora。这样知识源具有版本控制和可回滚能力。

---

## 5. 短板与风险

### 5.1 Wiki、索引与 Git 原稿的一致性

手工 Markdown 已有正文更新接口，文本分块支持编辑和版本回滚，Wiki 也有页面历史；原先「源文档通常只能重新上传」的说法已不准确。然而三套对象与上传文件原件、Git 原稿之间**没有据此可推定的双向同步保证**。在本项目中如 Agent 改 Wiki 而 Git/手工知识/分块未同步，仍会产生版本分叉；分块修订后再次解析也要回归验证。应约定知识主源、写入权限、冲突策略、回滚方式和重新索引的时点。

### 5.2 协作与产物已有进展，尚非通用办公工作台

Wiki 版本/回滚、Agent 文件产物、对话分叉/回滚和部分管理/审计能力比旧调研更丰富；不能再笼统说「不支持产物」。但跨团队资料审阅、评论与发布、文档到业务动作的审批、源文件/Git 双向同步是否满足日常协作，仍需按具体流程验收；不要把已有产物列表等同于完整协作工作台。

### 5.3 动态状态不能放知识库

库存、采购、菜单、反馈等状态如果只放 Markdown 或 Wiki，会遇到延迟、旧版本召回、重复写入、缺少事务和审计等问题。

### 5.4 配置、安全和升级门槛

普通用户与管理员需理解知识库/Wiki/分块、模型与检索配置、技能/MCP 权限、沙箱后端、存储与数据源同步。尤其注意：Docker socket 授予 app 宿主 Docker 控制权；共享 Agent 的来源空间技能可能暴露管理员配置的环境变量；第三方公开技能有代码和依赖风险。多模态图片检索会增加向量/视觉模型成本，保存的会话附件随有引用的历史会话延长保留并增加存储量。[技能目录与沙箱](https://weknora.weixin.qq.com/docs/03-features/22-skills-sandbox) · [v0.8.3 版本说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

**v0.8.2 → v0.8.3 升级检查**（依据官方版本说明，升级前应按自身数据库/部署形态复核）：

- 备份数据库、文件存储和配置；保留 `SYSTEM_AES_KEY`、JWT 与签名密钥，留出 PostgreSQL `000111–000118` / SQLite `000031–000036` 迁移时间（画廊回填、索引创建可能占用资源）；使用 ParadeDB 的存量库先核对镜像与扩展版本。
- `invite_only` 不再允许受邀用户自行注册，需要邀请注册的改为 `invite_register`；旧智能体 `allowed_tools: []` 的行为已变为**显式不用内置工具**，检查依赖默认工具或 Wiki 检索的配置。
- 图片向量检索默认关闭，开启时配套模型、多模态和旧文档重新解析；切换多模态模型编码时可能需重建旧向量。旧文档精确原文定位同样可能需重解析。
- 核对 MCP OAuth 时间戳时区迁移、附件存储增长以及 Docker 终端断开即结束 Shell 的行为；先在测试实例验证升级与回滚。[升级须知](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)

---

## 6. 适用场景

WeKnora 适合：

- 私有化知识库问答；
- 企业内部文档 RAG；
- 垂直领域知识 Agent；
- 需要绑定自有 MCP 工具的 Agent；
- 对知识源版本可控有要求的项目；
- 不希望把敏感知识完全托管到外部 SaaS 的场景。

不适合**不经设计就直接**承担：

- 需完整协作审批/发布的办公文档工作区（需单独验收）；
- Agent 产物未经审查的自动发布平台；
- 企业数仓；
- 事务业务数据库；
- 无部署管理与模型配置投入的开箱即用办公 AI 工作台。

---

## 7. 对我们项目的启示

对家庭营养师项目（**方案建议，非 v0.8.3 实例验收结论**）：

- WeKnora 可作为知识检索与对话入口；针对菜谱图片/营养表格先小样本验证画廊、图片召回和原文引用，再决定是否开多模态；
- Git Markdown 继续作为本项目稳定知识主源；评估手工 Markdown 更新接口或分块纠错能否融入受审阅的同步流程，避免 Wiki、知识条目与 Git 互相漂移；
- Postgres 承担动态状态 source of truth，受控 MCP 执行读写，长期记忆只存非事务性偏好；
- 优先核对实际部署版本、沙箱后端/技能权限、工具审批、数据库迁移及费用，再选用新版能力。

对连山产品分析：

- WeKnora 现在不只是「可私有化知识库 + Agent 问答」：还有双向 MCP、技能沙箱/可下载产物、个人长期记忆、管理审计及可选多模态图片检索；在竞品分析中需更新能力边界；
- 但「支持某项功能」不等于工业工作流的审阅、HITL、跨系统事务状态、EVI、价值归因已经按项目要求落地；应逐项验证而不是直接下「完整/不完整工作台」的绝对结论。

---

## 8. 后续需要验证的问题

1. 家庭营养师实际 WeKnora 运行版本是否已升 v0.8.3？现有 Agent、技能、MCP 配置升级迁移后是否仍按预期执行？
2. Git Markdown → 手工知识更新 API → 分块索引 → Wiki 的同步顺序、冲突、回滚与权限由谁负责？
3. 旧上传文件重解析后，分块人工修订与 Wiki 人工维护内容是否需要复核/重新合并？
4. 图片画廊、文字搜图、原文定位对菜谱/PDF/表格的增益、准确性和 VLM/Embedding 成本如何量化？
5. 技能来源审查、Docker/Cube/E2B 选择、网络/凭据隔离与共享 Agent 权限是否通过安全验收？
6. 业务 MCP 的审批、鉴权、限流、幂等、回执和审计如何落实？
7. Seafile 等数据源的变更/删除对账是否满足本项目要求，是否会产生来源重复或过期引用？
8. 多租户、文档级访问控制、审计保留期与大规模并发表现是否满足目标环境？
9. 评估数据集、过期内容识别与知识冲突检测能否覆盖营养规则变更？
10. 与 Git Markdown 自动同步和业务状态快照归档怎样组成一条可验收的闭环？

---

## 9. 参考资料

1. [WeKnora 官方 v0.8.3 发布说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.3)（2026-10-14；用于判定本版新增/改进及升级风险）与 [v0.8.2 发布说明](https://weknora.weixin.qq.com/docs/07-releases/v0.8.2)（用于区分前版已有能力）。
2. [产品介绍](https://weknora.weixin.qq.com/docs/01-getting-started/01-introduction) · [知识库与知识管理](https://weknora.weixin.qq.com/docs/03-features/02-knowledge-base) · [Wiki 能力](https://weknora.weixin.qq.com/docs/03-features/14-wiki) · [Agent 引擎](https://weknora.weixin.qq.com/docs/03-features/07-agent)。
3. [技能目录与沙箱](https://weknora.weixin.qq.com/docs/03-features/22-skills-sandbox) · [MCP 集成](https://weknora.weixin.qq.com/docs/03-features/08-mcp) · [Seafile 接入](https://weknora.weixin.qq.com/docs/03-features/25-seafile) · [长期记忆](https://weknora.weixin.qq.com/docs/03-features/23-memory)。
4. [知识 API](https://weknora.weixin.qq.com/docs/04-api/02-api-knowledge) · [分块 API](https://weknora.weixin.qq.com/docs/04-api/02-api-chunks) · [评估能力](https://weknora.weixin.qq.com/docs/03-features/15-evaluation) · [可观测性与审计](https://weknora.weixin.qq.com/docs/03-features/16-observability)。
5. [WeKnora GitHub](https://github.com/Tencent/WeKnora)；本次以可访问的官方文档站为主要证据，**未逐条审查 GitHub CHANGELOG/代码差异，也未升级并实测家庭营养师实例**。
6. 本项目 WeKnora Agent 配置方案：`项目/家庭营养师/设计/weknora-agent-configuration-plan.md`；知识库配置：`项目/家庭营养师/weknora/knowledge-base-config.md`；动态状态架构：`项目/家庭营养师/设计/family-nutrition-state-architecture.md`。
