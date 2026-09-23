# 04 · workstation-iclaw（连山 Monday 平台助手 / 数字员工工作站）代码仓分析

> 分析对象：`/Users/lijiayi/lianshan/agent/workstation-iclaw`
> 分析方法：实际读代码 + 大写产品文档 + git 历史 + `lisen_*` 增量文件
> 结论一句话：**这是一个 fork 的开源多智能体平台（上游品牌 dsClaw / "Clawith"），连山在其上做了深度定制，把它改造成"嵌入连山工业数据平台的数字员工运行前端"。**

---

## 1. 一句话定位 + 技术栈 + fork 判断（重点）

### 一句话定位
一个**面向工业企业的"数字员工"对话工作站**：给每个 AI Agent 持久身份（`soul.md`）、长期记忆（`memory.md`）、自主触发器（cron/interval/webhook…）和多渠道 IM 集成（飞书/钉钉），让业务人员用**对话**的方式完成"看数据、盯指标、收工单、做决策"。在连山体系里，它是**用户直接面对的那层交互前端 + Agent 运行时**，背后接连山数据平台（Frappe）和 workstation-runtime（编排/语义/检索服务）。

### 技术栈（README.md:184-204, CLAUDE.md:140-147 实证）
- **后端**：Python 3.11+ · FastAPI · SQLAlchemy 2.0（async）· PostgreSQL 15+ / SQLite · Redis · Alembic · JWT/RBAC · MCP Client（Streamable HTTP）。后端 47 个 API 模块（`backend/app/api/`）、478 个 py 文件。
- **前端**：React 19 · TypeScript · Vite 6 · Zustand 5 · TanStack Query 5 · React Router 7 · i18next · 自定义 CSS（Linear 风格暗色主题）。99 个 ts/tsx 文件。
- **LLM 抽象层**：`services/llm/` 统一支持 OpenAI / Anthropic Claude / DeepSeek / Ollama 等。
- **核心执行引擎**：`api/websocket.py` 的工具调用循环（最多 50 轮：LLM→工具→上下文重组）。

### 是否 fork、fork 自谁、连山增量（关键结论）

**是 fork，但不是 fork 自 open-webui/librechat/chatbot-ui**。证据链：

1. **首个 commit 就是完整平台**（`git log --reverse` 头部）：
   - `0945dccc 🦞 Clawith: Initial commit — multi-agent collaboration platform`
   - `967eb709 Add MIT License` → 随后 `f31ea97f v1.0.0` 一次性带来"首用户即管理员、demo agent、心跳协议"等成套功能。
   这说明仓库是从一个**已成型的开源项目 "Clawith / dsClaw"** 落地的，而非连山从零写。

2. **上游品牌是 "dsClaw"（原 Clawith）**：README/CLAUDE.md 全篇自称 "dsClaw is an open-source multi-agent collaboration platform"，前端仍有 `DsclawWordmark.tsx` 品牌组件（`frontend/src/components/atlas/DsclawWordmark.tsx:47` 渲染 "dsClaw" 字样），LICENSE 从 MIT 换成了 Apache 2.0。这些是典型的**上游开源身份残留**。dsClaw 本身并非头部知名项目，属于国内小众/自研系开源多智能体平台，功能对标 "digital employee / 数字员工" 概念（Plaza 广场、Aware 自主意识引擎、A2A 协作、Smithery/ModelScope 运行时装工具）。

3. **仓库名 iclaw / 目录名 dsclaw / 分支 lisen-core 三重身份**：
   - git remote 指向阿里云 codeup `Personal/workstation-iclaw`；
   - README 里 clone 目标叫 `workstation-dsclaw`；
   - 代码里 runtime 身份是 `workstation-dsclaw`（`git log` 里 `preserve workstation-dsclaw runtime identity`）。
   即：**上游=dsClaw，连山内部代号=workstation-dsclaw/iclaw**。

4. **连山的增量 = 一整套 `lisen_*` / workorder / discovery 层**（见 `git ls-files | grep lisen`）。这些是**连山自研、上游没有**的部分，也是本仓真正的价值所在：

   | 增量模块 | 文件 | 作用 |
   |---|---|---|
   | 连山 SSO 认证门 | `backend/app/core/lisen_auth_gate.py`(399行)、`lisen_session.py`(176)、`lisen_provision.py`(394) | 把 dsClaw 自带登录体系与连山 Frappe OAuth / dokku-admin handoff JWT 打通，自动创建影子用户 |
   | 连山发现连接器 | `backend/app/services/lisen_discovery_client.py`(218)、`lisen_discovery_tools.py`(290) | fail-closed 地调用 workstation-runtime 的 discovery MCP：capability（能力目录）/ semantic（语义实体）/ experience（相似案例）8 个内置工具 |
   | 工单桥接 | `backend/app/models/workorder_event.py`、`api/workorders.py`(413)、`services/workorder_service.py` | 工业工单从 workstation-runtime 经 PGMQ 流入，Agent 诊断→人工评审→结果回写 runtime |
   | 数字员工同步 | `api/_internal_employees.py`(339)、`services/phase11_employee_sync.py` | 由平台侧（lads）声明式下发"数字员工"清单，事务化 upsert agent/技能/触发器/capability 工具 |
   | 连山数据库 schema | `backend/alembic/versions/lisen_dsclaw_schema_v1.py` | 连山定制表结构 |
   | 前端 SSO 跳转 | `frontend/src/pages/LisenSsoRedirect.tsx` | `/oauth2/lianshan` 免点击登录入口 |
   | 部署 | `helm/dsclaw/`、`DOKKU_DEPLOYMENT.md`、`Dockerfile`（vendored `lisen-auth`） | Dokku/K8s 部署，vendored `vendor/lisen-auth`（从 lisen-infra monorepo 镜像而来，见 `vendor/lisen-auth/VENDORED_FROM.md`） |

   git 历史里约 **285/2348 条 commit**（约 12%）触及 lisen/workorder/discovery/sso/runtime/capability 关键字——即近 1/8 的迭代量都花在连山定制层，且集中在 2026-06 之后的近期。

> **规模说明**：任务描述提到"约 1.7 万文件"，但 `git ls-files` 只有 **817 个受版本控制文件**（node_modules/构建产物未提交）。真正的代码体量在后端 478 py + 前端 99 ts/tsx 量级。所谓"代码量最大"更多是上游 dsClaw 平台自带的宽功能面（47 个 API 模块覆盖 Slack/Discord/Teams/WhatsApp/AgentBay/Plaza 等），连山实际只用其中一小块。

---

## 2. 核心模块与数据流：给谁用、干什么

### 面向的两类用户 + 两个旗舰"数字员工"产品
连山没有把 dsClaw 当通用聊天工具卖，而是用它承载**两个具体的行业化数字员工**（均以文档形式定义，实现走 dsClaw 的"技能"机制）：

1. **连山平台助手**（`PLATFORM_ASSISTANT_PRODUCT.md`）——给运营/产品/业务同学
   - 预装两项技能：**连山数据查询** + **连山推卡**
   - 核心价值：一句话把任意指标按任意节奏推到任意飞书群（日报/阈值告警/webhook 事件/预览）
   - 强护栏：数据**只读**、表白名单、15 秒超时、不允许改 SQL（换数据源必须新建推卡）、新建默认禁用+私聊预览防刷屏、每卡每小时最多触发 5 次、静默时段。

2. **副总裁数字员工**（`VP_DIGITAL_EMPLOYEE_PRODUCT.md`）——给 CEO/CFO/采购/生产副总
   - 预装三项技能：**宏微观关联** + **供应链影响** + **高管简报**
   - 核心价值：外部信号（"丁腈橡胶涨 5%"）→ 经 **Ontology 业务图谱**锚定内部物料/供应商/产品/分厂 → 加权成本测算 → 输出"A 分厂成本 +3.1%"级别的量化影响 + 完整数据链路（trace）。
   - 强承诺：**"无 trace 不报数"**（soul 中明文规定），取数必经 Ontology 再路由到连山只读库，未命中的实体明确说"不在业务图谱中"，绝不编数字。

### 端到端数据流（多来源实证拼合）

```
连山数据平台(Frappe)                     workstation-runtime（编排/语义/检索）
   │  ①OAuth SSO                              │  ③discovery MCP(capability/semantic/experience)
   │  (LIANSHAN_OAUTH_GUIDE.md)               │  ④case-context 检索(AGE子图+pgvector)
   ▼                                          ▼
┌──────────────────────────────────────────────────────────┐
│  workstation-iclaw (本仓 = dsClaw fork)                    │
│  ┌ lisen_auth_gate → 影子用户 provision                    │
│  ┌ websocket.py 工具循环(≤50轮) ← agent_context(soul/memory)│
│  ┌ lisen_discovery_tools（8个只读发现工具，fail-closed）    │
│  ┌ workorder_listener(PGMQ) → workorder_event 表           │
│  ┌ trigger_daemon（Aware 引擎：cron/interval/poll/webhook） │
│  └ 飞书/钉钉 push                                          │
└──────────────────────────────────────────────────────────┘
   │ ②嵌入方式：iframe + postMessage（PRODUCT_DESIGN.md）       │ ⑤诊断/评审结果回写
   ▼                                                          ▼
   业务人员浏览器（连山平台内嵌 Agent 面板）          workstation-runtime workorder-updates
```

关键链路证据：
- **认证**：`lisen_auth_gate.py:33-42` 接受三种凭证——LISEN_SSO 服务 token / lisen_session cookie / dsClaw 原生 JWT；`lisen_provision.py` 在 `lisen-federated` dsproject 里自动建影子 Identity+User。
- **发现工具**：`lisen_discovery_client.py` 是"fail-closed fixed connector"，用严格 Pydantic 信封（`_DiscoveryEnvelope`，`extra=forbid`）校验 workstation-runtime 返回，校验 request_id/tenant 一致性，超响应体大小即拒。8 个工具见 `LISEN_DISCOVERY_TOOL_NAME_MAP`（capability.list/get/resolve_deployment、semantic.resolve_terms/get_entity/explore_neighborhood、experience.find_similar_cases/find_similar_flows）。
- **工单桥**：`workorder_event.py` 注释明确"Lisen-runtime → dsClaw on_message bridge"，工单经 PGMQ `dsclaw_workorder_assigned` 流入，listener 调 runtime `/api/v1/retrieval/case-context` 拿 AGE 子图+相似案例缓存进表。
- **数字员工下发**：`phase11_employee_sync.py` 由平台侧声明式 upsert，事务内校验目录（models/skills/templates）后再改 agent/技能/触发器/capability 工具，fail-closed。

---

## 3. 横向 vs 纵向归属（尺子：换掉横向框架还留得下吗）

**结论：这个仓库本体是横向工具（dsClaw 通用多智能体平台），但连山在它上面挂载的增量层是"承载纵向领域资产的接口/管道"，纵向资产本身不在这个仓里。**

用"换掉横向框架还留得下吗"这把尺子逐项过：

| 组件 | 换掉 dsClaw 后 | 归属判定 |
|---|---|---|
| Agent 运行时、websocket 工具循环、triggers、Plaza、A2A、IM 集成 | 消失（这就是 dsClaw 本身） | **纯横向**，上游代码，可被 open-webui/dify/coze 等替代 |
| `lisen_auth_gate` / `lisen_provision` / SSO | 需重写，但逻辑（Frappe OAuth 对接、影子用户）可移植 | 横向偏胶水（连接管道） |
| `lisen_discovery_client` 8 个发现工具 | 工具壳会消失，但它**只是客户端**——真正的能力目录/语义图谱/案例库在 **workstation-runtime**，不在本仓 | 管道/接口层；纵向资产在别的仓 |
| 工单桥 + 评审回写 | 桥会消失，但工单业务语义（fault_category_iri、classification、诊断→评审→回写闭环）是**连山工业领域独有** | 承载纵向流程，但数据主权在 runtime/平台 |
| 两个数字员工产品（平台助手 / 副总裁） | Agent 定义、技能提示词、Ontology 别名、卡片模板会消失 | **纵向领域资产**，但目前主要以**文档 + soul/skill 提示词**形式存在 |

**核心判断**：本仓更像 05 篇里说的"**薄顶部平台团队的标准工具**"的**交互/编排前端**——它是通用的 Agent 工作站，连山的护城河（Ontology 业务图谱、能力契约目录、案例经验库、工单诊断知识）**大部分沉淀在 workstation-runtime 而非这里**。本仓的纵向价值集中在两处轻资产：① 两个行业数字员工的**提示词/技能/护栏设计**（如"无 trace 不报数"、推卡防刷屏规则、Ontology 锚定优先），② 工单诊断→人工评审→回写的**闭环流程编排**。这些"换框架后会痛但能重建"，属于纵向偏薄的一端。

---

## 4. 反馈闭环 / 数据资产痕迹

**有明确且设计良好的反馈闭环，但决策理由的沉淀偏工程化、尚未形成显式的"决策知识资产"。**

已实证的闭环：
1. **工单诊断闭环**（`workorder_service.py` + `workorder_event.py`）：一个工单从 `accept → diagnosis（Agent 产出诊断）→ awaiting_review → review（人工 approved/rejected/needs_followup/cancelled + false_positive 标记 + note）→ 回写 workstation-runtime`。`WorkorderEvent` 表持久化 `diagnosis_payload`、`review_payload`、`review_round`、`pending_update_intent`——**人工评审结论（含"是否误报"、评审备注、评审轮次）被结构化留存并回流到 runtime**。这是最强的反馈资产痕迹。
2. **审计可追溯**：`phase11_employee_sync` 每次同步写 AuditLog（含 platform subject/jti）；推卡产品文档 6.3 明确"每张推卡每次执行记录触发时间/查到数据/推给谁/成败"。
3. **相似案例检索**：workorder_event 缓存 `similar_cases`（pgvector top-K）+ `age_subgraph`，即**历史案例被当作检索资产复用**——但案例库本体在 runtime。
4. **三层记忆隔离设计**（`PRODUCT_DESIGN.md`）：Agent 公共记忆 / 用户私有记忆 / 会话记忆，Reflections 按来源（用户对话 vs trigger 任务）分别写入私有/公共记忆。

**缺口 / 待深挖**：
- 记忆隔离目前**文档标注"当前只做了对话隔离"**，`(agent_id, user_id)` 复合索引改造是否落地未在本次阅读中确认（待深挖 `services/agent_context.py` 与记忆存储模型）。
- 反馈主要沉淀为"工单评审结论 + 审计日志"，**"为什么这么判"的决策理由**除了 review note 之外没有更结构化的载体；副总裁的"数据链路 trace"是即时生成的展示，不确定是否落库复用。

---

## 5. 亮点 & 疑点（尤其：fork 开源改造这条路的战略含义）

### 亮点
1. **fail-closed 安全工程做得扎实**：`lisen_discovery_client` 用严格信封+request_id/tenant 校验+响应体限流+超时；capability 工具按 `(agent_id, tool)` 精确绑定校验（`agent_tools.py:2851` 注释明确"stale prompt/其他员工/跨 dsproject 都 fail closed"）；数据只读+表白名单+15s 超时+不许改 SQL。对"让 LLM 碰生产数据"这件高危事，护栏意识到位。
2. **"无 trace 不报数"是极好的产品原则**：副总裁强制每个数字背后有完整数据链路，从根上治理 LLM 幻觉编数字——这是把工业场景对"可信"的要求翻译成了工程约束。
3. **清晰的仓库职责边界**：本仓专注"交互前端 + Agent 运行时 + 桥接"，把语义图谱/案例库/编排下沉到 workstation-runtime，符合 AGENTS.md 里"架构复用优先、不过度 fork"的准则。
4. **对上游可持续性有自觉**：`PRODUCT_DESIGN.md` 约束4明确写"需兼顾 dsClaw 开源版本的上游迭代，不能过度 fork"；砍功能用 **Feature Flag 禁用而非删代码**（Plaza/AgentBay/OpenClaw/Slack/Discord/企微/多租户 RBAC 全部 flag 关闭），保留 merge 上游的能力。git 历史里有专门的 `dsclaw-merge` 设计文档，说明团队认真在做双仓合并管理。

### 疑点 / 战略风险
1. **fork 一个小众开源项目（dsClaw），而非头部项目——双刃**：
   - 好处：dsClaw 的"数字员工"抽象（soul/memory/Aware/A2A/技能运行时）恰好贴合连山"数字员工"叙事，省了从零搭多智能体框架的功夫。
   - 风险：dsClaw 不是 open-webui/dify 那种有活跃社区和厂商背书的项目，**上游迭代速度/存活性存疑**。一旦上游停更或方向分叉，"兼顾上游迭代"的克制就失去意义，连山等于全量接盘一个 2000+ commit 的大平台的维护成本（47 个 API 模块里绝大多数功能连山根本不用，却要跟着升级/修 CVE）。
2. **"镀金"风险中等偏低，但存在**：本仓承载的通用能力（对话式 BI、指标推送、告警）**正是云厂商 Agent 平台（Coze/Dify/百炼/Copilot Studio）最容易抹平的一层**。连山真正难被抹平的是 Ontology 业务图谱 + 工业案例库 + 工单诊断知识——而这些**不在本仓**。因此本仓本身的战略价值更多是"把连山纵向资产暴露给用户的皮肤/管道"，替换成本不高。**如果哪天云厂商 Agent 平台足够好，本仓被替换、纵向资产（在 runtime）迁移过去，是完全可能的路径。**
3. **两个旗舰产品目前偏"文档 + 提示词"**：平台助手/副总裁的核心定义在 `.md` 产品文档和 soul/skill 提示词里，本次阅读**未在代码中确认这两个内置 Agent 的技能实现已完整落地**（待深挖：`agent_template/` 内置技能、推卡定义存储/调度引擎、飞书卡片渲染器、Ontology 表）。产品文档写得很细，但"文档 → 落地代码"的完成度需要进一步验证。
4. **身份三重命名（iclaw / dsclaw / lisen-core）**易造成认知与运维混乱，git 历史里有多条"re-enforce/preserve canonical runtime identity"的修复 commit，说明身份对齐本身就踩过坑。

### 待深挖清单
- `services/agent_context.py`：三层记忆隔离是否真的按 `(agent_id, user_id)` 落地。
- `agent_template/` + skill 实现：平台助手"推卡"、副总裁"Ontology 锚定/供应链测算"的实际代码完成度。
- Ontology 表结构与"由 Ontology 路由到连山只读库取数"的落地实现（文档描述清晰，代码位置未定位）。
- 飞书卡片 4 模板渲染器代码位置。

---

## 附：与连山其他仓的关系（本仓视角推断）
- **连山数据平台（Frappe）**：本仓的 SSO IdP + 只读数据源（经 discovery/查询工具间接访问，不直连业务库）。
- **workstation-runtime**：本仓的上游服务——语义图谱（capability/semantic/experience MCP）、工单生产者、案例检索、编排结果生产者。**连山的纵向数据资产主体在这里，不在本仓。**
- **workstation-pg**：PGMQ 队列宿主（`ds_agent_result`、`dsclaw_workorder_assigned`），本仓通过 `LISEN_PG_DSN` 消费。
- **lisen-infra monorepo**：`lisen-auth` 库的真正源头，本仓 `vendor/lisen-auth` 是其镜像。
