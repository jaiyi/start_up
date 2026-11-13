# 产品调研：MemoryBear（红熊 AI 记忆系统）

> 调研日期：2026-11-13
> 调研对象：[SuanmoSuanyangTechnology/MemoryBear](https://github.com/SuanmoSuanyangTechnology/MemoryBear)，参考仓库 `main` 提交 [`2477d94`](https://github.com/SuanmoSuanyangTechnology/MemoryBear/tree/2477d94bcc11baa47856dc88c19170ea41882c57)。
> 主要资料：[中文 README](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md)、[后端依赖](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/pyproject.toml)、[Compose 编排](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/docker-compose.yml)、[API 路由](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/main.py#L272-L282)与下文所引请求模型；抽样查看了后端服务目录及遗忘、反思相关服务文件。未部署系统、运行测试或复现指标。
> 分类：Agent记忆与学习（偏用户／业务知识的长期记忆服务，兼具知识图谱与检索；并非专门的 Agent 执行轨迹学习产品）。仓库标注 Apache-2.0；使用前仍需核对具体代码、依赖及部署素材的授权。

---

## 1. 一句话定位

**MemoryBear 把对话、文档等内容加工为可检索、可关联、可衰减的长期记忆，组合图谱、混合搜索、反思与遗忘，并以 API 和 Web 管理界面提供服务。**“如人类一样记忆”是项目叙事，不是已经验证的认知能力结论。[来源：项目简介、核心特性](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#项目简介)

## 2. 产品与系统拆解

| 环节 | 项目描述的做法 | 本次核查边界 |
|---|---|---|
| 写入／提炼 | 从对话、文档抽取摘要、实体关系、三元组和时间信息；写入图谱 | README 描述；仓库能看到相关后端服务，不等于抽取质量已验证 |
| 存储／关联 | Neo4j 图谱承载实体关系；PostgreSQL 承载业务数据 | README 与部署依赖可对照；知识图谱规模和关系类型仍是官方口径 |
| 召回 | Elasticsearch 关键词与语义检索结合；面向 Agent 回填上下文 | README 描述，未实测召回相关性、精确率、时延或权限过滤 |
| 演化 | 记忆强度、时效、使用频率驱动遗忘；反思处理一致性和关系调整 | 仓库可见 `memory_forget_service.py`、`memory_reflection_service.py` 等入口；未验证完整的休眠—清除、人工审核与恢复链路 |
| 服务与运营 | FastAPI 的 `/api`（管理 JWT）及 `/v1`（服务 API Key）、React Web、Celery 多队列 | README 描述；[Compose](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/docker-compose.yml)可见 API、Workers、Beat／任务调度器和 sandbox 服务 |

来源：[README 核心特性、架构总览和技术栈](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#核心特性)、[API 后端服务目录](https://github.com/SuanmoSuanyangTechnology/MemoryBear/tree/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/services)。源码抽样只能证明存在相关实现入口，不能证明全链路正确、启用或已生产落地。

## 3. 部署与集成判断

- **不是单一嵌入式记忆库**：README 要求 Python 3.12（明确不支持 3.13+）、Node.js、PostgreSQL、Neo4j（需 APOC）、Redis、Elasticsearch；`api/pyproject.toml` 的 `requires-python = ">=3.12,<3.13"` 可印证 Python 约束。[安装说明](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#安装教程)、[依赖文件](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/pyproject.toml)
- **Compose 非完整基础设施一键部署**：README 特别注明 PostgreSQL、Neo4j、Redis、Elasticsearch 需单独启动；`api/docker-compose.yml` 侧重应用、Worker、调度和 sandbox。PoC 需要预留基础服务运维与数据备份成本。[快速开始说明](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#docker-compose-一键启动推荐)
- **集成面较宽，但边界待试**：项目声称支持 LLM 集成和 MCP，并提供管理／服务 API；须逐项核查具体端点、租户隔离、权限回传、并发写入、供应商调用时数据外发范围。不能由“有 MCP 依赖”推断已具备通用、可安全接入的 Agent 记忆协议。[技术栈及 API 描述](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#技术栈)
- **安全起步**：README 列出的示例管理员账号／密码及简化配置仅适用于本地演示；试用时必须替换凭据、限定网络访问，并核对 Elasticsearch 等基础服务的认证及 Neo4j 数据边界。README 提到前端企业内网可选私有组件，需分清公开版与企业版功能。[安装教程](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#安装教程)

### 3.1 源码核对的 HTTP API（`2477d94`，未实测）

README 只概述 `/api` 管理端（JWT）和 `/v1` 服务端（API Key）；仓库[应用路由注册](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/main.py#L272-L282)及控制器可进一步确认以下调用链。示例 JSON 只列必要的主要字段，UUID 均为占位符，不能代替部署实例的联调验证。

| 步骤 | 方法与路径 | 请求重点与返回 | 源码依据 |
|---|---|---|---|
| 取得管理令牌 | `POST /api/token` | JSON `{"email":"...","password":"..."}`；成功后从 `data.access_token` 取得 JWT | [认证控制器](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/auth_controller.py#L126-L155)、[请求模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/token_schema.py#L27-L31) |
| 创建服务 Key | `POST /api/apikeys` | 携带管理端 JWT；JSON `{"name":"memory-client","type":"service","scopes":["memory"]}`；返回 `data.api_key`，创建时妥善保存 | [控制器](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/api_key_controller.py#L24-L60)、[模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/api_key_schema.py#L12-L23) |
| 创建／取得终端用户 | `POST /v1/end_user/create` | JSON `{"other_id":"customer-123"}`；响应 `data.id` 是后续使用的 end-user UUID，不能把外部 `other_id` 直接当 UUID | [服务路由](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/end_user_api_controller.py#L27-L55)、[请求模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/memory_api_schema.py#L22-L59) |
| 写入对话记忆 | `POST /v1/memory/write` | JSON `{"end_user_id":"<UUID>","messages":[{"role":"user","content":"偏好喝茶"}]}`；可能返回 `data.task_ids`。Neo4j 写入通过 Celery 任务异步处理，接口响应不等于已完成持久化 | [服务路由](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/memory_api_controller.py#L210-L241)、[请求模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/memory_agent_schema.py#L87-L111)、[异步实现](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/memory_controller.py#L125-L150) |
| 读取／搜索记忆 | `POST /v1/memory/read/sync` | JSON `{"end_user_id":"<UUID>","message":"我喜欢喝什么？","search_switch":"1"}`；成功响应 `data` 含 `answer`、`intermediate_outputs`；`"1"` 是普通搜索模式 | [服务路由](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/memory_api_controller.py#L55-L75)、[请求模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/memory_agent_schema.py#L45-L63)、[搜索模式](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/core/memory/enums.py#L15-L35) |

`/v1` 记忆接口要求有 `memory` scope 的服务 API Key，且校验工作区／终端用户关联；可使用 `X-API-Key: <API_KEY>` 或 `Authorization: Bearer <API_KEY>`。[鉴权实现](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/core/api_key_auth.py#L402-L433)、[记忆服务控制器](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/memory_api_controller.py#L55-L83)。一般成功响应为 `{"code":0,"msg":"...","data":...,"error":"","time":...}`；具体 `data` 随接口而变。[响应封装](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/core/response_utils.py#L5-L12)。管理端同名 `POST /api/memory/read/sync` 使用 SSE，不应与返回 JSON 的 `/v1/memory/read/sync` 混淆。[管理端路由](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/memory_controller.py#L161-L186)

**遗忘接口的边界**：手动触发一轮遗忘的是管理端 `POST /api/memory/forget-memory/trigger`（JWT），请求体 `{"end_user_id":"<UUID>"}`，可另设合并批量和距上次访问天数；它执行衰减／合并周期，**不是指定单条记忆的删除接口**。[控制器](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/memory_forget_controller.py#L47-L76)、[请求模型](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/schemas/memory_storage_schema.py#L432-L438)。`/v1` 提供遗忘**配置**的读取／更新，例如 `GET /v1/memory_config/read_config_forgetting?config_id=<UUID>` 和 `PUT /v1/memory_config/update_config_forgetting`；当前注册的服务路由中没有上述管理端遗忘周期控制器，不能据 README 的“遗忘控制”杜撰 `/v1/memory/forget`。[配置控制器](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/memory_config_api_controller.py#L401-L415)、[服务路由注册](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/app/controllers/service/__init__.py#L34-L54)

**文档与验证限制**：仓库的 [`api/openapi-baseline.json`](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/api/openapi-baseline.json) 包含上述 `/v1` 路由，但未收录 `/api` 管理端；部分控制器直接读取 `request.json()` 并以占位字段声明请求体，因此不能只凭基线文件判断实际 JSON 字段或断言管理端路由不存在。实际部署后以运行中的 `/docs` 和联调结果再核对鉴权、参数、任务完成状态及权限隔离。

### 3.2 对 Claude Code、Codex 与 DeepSeek Harness 的接入判断

把上述 `/v1` 能力封装为项目受控工具：用业务身份映射 `other_id`／`end_user_id`，读取时传问题并返回答案与必要证据，写入时设审核、幂等和异步状态追踪；API Key 由适配层保管，不直接交给模型。Claude Code／Codex 可通过各自可用的工具接入方式调用适配层，DSH 可在确认其工具或插件机制后调用；**HTTP API 存在不代表三者已现成集成、会自动调用，或本地 SPC-DeepSeek-Harness 已接通 MemoryBear**。沉淀后经过确认的经验即使具有知识属性，也可以继续留在长期记忆系统；是否另行发布到知识库，取决于版本治理、共享范围和正式规范要求，而非“知识只能在知识库”。

## 4. 与相邻产品比较

| 维度 | MemoryBear | Hindsight | MemPalace |
|---|---|---|---|
| 主张 | 提炼、图谱关联、搜索、遗忘／反思的一体化服务 | retain / recall / reflect 与证据型记忆 | 原文优先、本地记忆与多 Agent 协作 |
| 对原文的依赖 | README 强调抽取和知识加工；原文保留与回指语义需核查 | 注重 supporting evidence 与引文 | drawer 原文优先，不强制改写 |
| 部署印象 | 多基础服务与异步队列，运维相对重 | memory bank 可服务化；具体配置另评估 | 本地优先、可演进到共享 hub |
| 本次适配关注 | 可控遗忘、反思与图谱的治理闭环 | 检索证据及 belief 更新 | 私有原文、协同交接与边界 |

这是根据各自公开资料对**设计侧重点**的对照，不是同一数据集、同一部署条件下的性能或成熟度排名；参见本目录 [Hindsight](./hindsight.md)、[MemPalace](./mempalace.md)。

## 5. 对连山场景的启发（分析推断，不是集成现状）

1. **长期记忆分层**：把对话／工单／现场事件等原始证据，与抽取的实体关系、摘要、向量索引分开保存；派生记忆保留来源、抽取版本、观察时间与有效期。
2. **遗忘不能等于静默删除**：设备安全约束、质量历史与审计证据不得单凭低使用频率降权或清除；先定义租户／工厂／工单隔离、保留期、法律留存、撤回与人工恢复机制。
3. **反思应产出候选而非权威事实**：冲突检测、关系强化可生成待审核的诊断线索；进入工艺规则、FMEA 或共享知识包前需要证据与责任人确认。
4. **跨 Agent 共享要同时传权限**：售后、质量、生产 Agent 复用记忆时，应传递来源 ACL、业务用途、可见范围与版本，不能只同步三元组或相似度结果。

## 6. 未验证声明与 PoC 清单

- README 所称“检索准确率 92%、较单一方式提升 35%”“百万实体／千万关联”“单实例 1000 QPS、平均延迟 <50ms”“遗忘后冗余 <8%”“图谱版本总体准确性 75.00 ± 0.20%”均为项目方展示；缺少本次可复核的统一任务定义、测试数据、环境与完整复现实验，不作为选型实测结论。README 中关于主流模型上下文长度的概括也不宜当成当前产品规格。[实验室指标及核心特性](https://github.com/SuanmoSuanyangTechnology/MemoryBear/blob/2477d94bcc11baa47856dc88c19170ea41882c57/README_CN.md#实验室指标)
- 按用户／租户／工厂隔离测试写入、搜索、反思和遗忘；检查 API Key 权限是否覆盖所有数据通路。
- 用同一批含冲突与时间变化的业务记录评估：抽取准确率、原文可追溯率、检索召回／误召、权限越界、更新／撤回传播与恢复能力。
- 检查“忘记”的真实语义：只降权／隐藏，还是同步删除 PostgreSQL、Neo4j、Elasticsearch、缓存、备份及派生摘要；抽样测删除后查询。
- 建立对照基线：普通文档检索、Hindsight、MemPalace 在相同样本和授权范围下的准确性、时延、LLM 成本、运维复杂度，而不是直接横比 README 数字。

**结论**：值得作为“动态记忆生命周期＋图谱关系治理”的研究参照；已按固定提交核对主要 HTTP 路由、认证和请求模型，但仍仅属公开资料与源码的桌面调研，未部署或联调，也未建立可用于采购、生产部署或质量承诺的验证证据。
