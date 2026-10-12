# 产品调研：Docker Agent（docker/docker-agent）

> 调研日期：2026-10-10
> 调研对象：github.com/docker/docker-agent（Docker 官方 AI Agent CLI 插件）
> 资料来源：raw README + `examples/README.md`（339 行示例全目录）。**未实测产品**；docker.github.io 文档站因当前会话网络抓取受限未读取，能力拆解以仓库内 README + 示例目录为准——示例目录本身就是一份相当完整的能力清单。
> 分类：agent-runtime-harnesses（Agent 运行时/工具接入/权限边界——与 DeepSeek Harness 同类）

---

## 1. 一句话定位

**Docker Agent 是 Docker 官方的 CLI 插件形态 AI Agent 运行时**：用一份声明式 YAML 定义 agent（模型、指令、工具集），`docker agent run` 即可运行；核心卖点是"零代码建 agent + 富工具生态 + 多 agent 编排 + OCI 注册表分发"。它和 DeepSeek Harness 站在同一生态位——**everything-as-config 的 agent 运行时**——但选择把分发建立在 Docker 自己的资产上（CLI 插件、Model Runner、MCP Toolkit、OCI registry）。

## 2. 核心能力拆解（按示例目录归纳，机制级）

### 2.1 声明式 Agent 定义

```yaml
agents:
  root:
    model: openai/gpt-5-mini
    description: ...
    instruction: |
      You are ...
    toolsets:
      - type: mcp
        ref: docker:duckduckgo
```

- YAML 推荐、HCL 同样支持（同一 agent 双格式示例并存）；
- **`agent-schema.json` 随仓库发布**——编辑器自动补全 + 校验，把"配置正确性"前移到编写时（DSH 的 cordis.yml 可直接借鉴）；
- 配置版本化：`pkg/config/v0, v1, ...` 旧版冻结，新特性只上最新版——配置 schema 的版本纪律与我们的 contract_schema_version 同构；
- `${file(...)}` 外置指令、`${env.VAR}` 环境变量替换、Compose secrets 读密钥（密钥不进 YAML）。

### 2.2 工具体系（toolsets）

内置 toolset 家族：`filesystem` / `shell` / `background_jobs`（长命令+recall）/ `todo` / `think` / `memory`（SQLite 持久）/ `fetch` / `script`（自定义命名命令）/ `user_prompt` / `api`（单 REST 端点声明为类型化工具）/ `openapi`（从 OpenAPI spec 每端点生成一工具）/ `rag` / `model_picker`。

值得注意的细节：
- **`readonly: true`** 一个开关把 toolset 降级为只读工具集（mutating 工具被过滤）——按意图分级而非按工具白名单；
- `filesystem.post_edit`：每次文件编辑后自动跑 `gofmt`——编辑钩子；
- **RAG 是 pluggable 策略**：BM25 / embeddings / hybrid / reranking / 自定义 provider，示例目录各配一份 YAML；
- MCP 原生：本地/远程/`docker:` 目录引用、`mcps:` 顶层块"定义一次多 agent 引用"、OAuth 2.1 DCR、streamable HTTP / WebSocket 传输、elicitation（工具调用中途向用户要结构化输入）。

### 2.3 权限、安全与沙箱（对我们最有参照价值的一节）

| 机制 | 形态 |
|---|---|
| 声明式权限 | 顶层 `permissions` 块，`allow`/`deny` 模式匹配工具调用 |
| 路径级管控 | filesystem 工具的 allow/deny 路径清单 |
| 域名过滤 | fetch 工具的域名白名单 |
| **四级安全模式** | strict / balanced / restricted / autonomous，config 级 `runtime.safety` + per-agent `safety` 覆盖；**用户 CLI 选择永远压过 YAML 默认** |
| LLM-as-judge | `pre_tool_use` 钩子挂裁判模型，分层防御：确定性权限 → LLM 判断 → 用户提示 |
| 秘密脱敏 | `redact_secrets: true` 单开关，args/对话/工具输出三处脱敏（也可手工挂三个 hook） |
| 沙箱 | `docker agent run --sandbox`，工具在 Docker 容器内执行 |
| deferred 运行 | `runtime: deferred` 包进延迟执行容器 |

### 2.4 多 agent 与互操作

- 进程内 coordinator + sub-agents（researcher→writer→reviewer 等）；后台并行 sub-agent；严格 handoff（`type: handoff`）；
- sub-agent 可来自 **OCI 注册表**（`myorg/agent:tag`）与本地定义混编；
- **A2A 与 MCP 两种 inter-agent 协议**各有一个井字棋双 agent 示例；
- 调外部编码 harness（Claude Code 等）作为 sub-agent 的示例（`coding_harnesses.yaml`）。

### 2.5 分发与复用（OCI 注册表是差异化）

- `docker agent run myorg/agent:tag`——**agent 即 OCI 工件**：push 到任意 registry、pull 即运行。版本、签名、镜像分发基础设施全部白得；
- Go 库嵌入：`golibrary/` 示例展示直接 import 运行时包、注册自定义 Go 工具、消费 `RunStream` 流式事件；
- `docker agent serve chat` 暴露 **OpenAI 兼容 chat 接口**——任意 OpenAI SDK 客户端可以直接对话 docker-agent（把 agent 变成标准模型端点的用法很妙）。

### 2.6 模型路由

per-tool 模型路由（便宜模型解释工具结果、主模型推理）、`model_picker`（agent 中途自主换强模型）、fallback 模型、rule-based 路由（廉价 router 分发消息到快/强模型）、thinking budget、Anthropic `task_budget`（多步任务总 token 上限）。

### 2.7 评测

`docker agent eval demo.yaml ./evals`——**保存的会话 + 被测 agent 配置**即可回放评测。评测目录就是"历史会话 + 断言"，与我们 Pack 发布流水线里的"历史事件回放对比"是同一件事的两种表述。

### 2.8 运行时纪律

hooks 全家（`pre_tool_use`/`post_tool_use`/`before_llm_call`/`after_llm_call`/`transform`/`notification`/`session_*`）；toolset 生命周期策略（strict/resilient/best-effort + 退避重启）；`on_agent_switch` 卸载前一 agent 的本地模型让两个重模型共享一块 GPU；`code_mode_tools`（模型用代码脚本编排多步工具调用而非单发）；skills 过滤。

## 3. 技术栈与工程形态

Go 实现（`docker agent` CLI 插件二进制，Docker Desktop 4.63+ 预装，Homebrew/GitHub Releases 分发）；配置双格式 YAML/HCL + JSON Schema；SQLite 做 memory 后端；RAG 内置 BM25/embeddings/hybrid/rerank。**用 docker-agent 自己开发 docker-agent**（contributing 指南第一条就是 `docker agent run ./golang_developer.yaml`）——自举。

## 4. 与相邻产品的差异

| 维度 | DeepSeek Harness | Docker Agent | PraisonAI |
|---|---|---|---|
| 定位切口 | 个人深度工作流宿主，插件即一切 | 零代码 agent 运行时 + 分发 | Python 多 agent 框架全家桶 |
| 配置 | cordis.yml profile | agent YAML + schema 校验 | Python 代码为主 / YAML 可选 |
| 工具接入 | 插件体系 + defineTool | toolsets + MCP 原生 | MCP + @tool 装饰器 |
| 分发 | 本地 profile | **OCI registry（独有）** | pip 包 |
| 审批/安全 | waterfall + approval | 四级 safety mode + LLM judge | approval=True + guardrails |
| 嵌入宿主 | DSH 宿主进程 | Go 库 / OpenAI 兼容 serve | Python 库 |

## 5. 优势

1. **OCI 分发**：agent 配置工件复用容器生态的版本/签名/镜像分发基础设施，"share" 从功能变成架构能力；
2. 安全分层完整：确定性权限 → 路径/域名过滤 → LLM judge → 沙箱 → 脱敏，且用户选择永远优先于配置默认；
3. JSON Schema 随配置发布，编写期校验；
4. 配置版本冻结纪律明确；
5. 示例目录即文档（339 行按特性分组的可运行配置目录）。

## 6. 短板 / 未验证点

1. 文档站未读取（会话网络限制），hooks/安全模式等机制仅有示例级描述，生命周期细节未验证；
2. 模型路由/评测等能力是"示例存在"级别，深度与稳定性未知；
3. A2A/MCP inter-agent 仅有玩具示例（井字棋）；
4. 与 DSH 不同，未见会话事件流的 append-only 语义、审计持久化纪律——企业级审计面可能薄弱；
5. 无多租户/服务化形态描述（是终端工具，不是平台）。

## 7. 适用场景

个人/团队终端 agent 化、把内部工具快速包装成 agent 工具（openapi→工具）、CI 中跑 agent 评测、作为 Go 库嵌入自有产品。

## 8. 对我们当前项目的启发（重点）

1. **Pack/Pipeline 的分发可以走 OCI 工件**：spc_dsh 的"管理时发布"目前落 PG（`knowledge_pack_release`）。docker-agent 证明了 agent 配置工件可以就是 OCI 镜像/工件——发布流水线的"版本化、digest、回滚"可用 registry 原语承接，离线工厂环境可用私有 registry。值得作为 Q16（流水线定义契约）的候选形态登记，不是现在做；
2. **JSON Schema 随工件发布**：Pack YAML / cordis.yml 都该配一份 schema 文件进仓库，编辑器校验前移——低成本高收益；
3. **四级 safety mode 的"用户选择压过配置默认"原则**：spc_dsh 的 gate 体系是硬闸（必须人批），docker-agent 的经验提示可以在 profile 声明默认档位、由工作台运营角色覆盖——与"gate 级 owner_role/sla_hours 运营配置"（05 §1）互相印证；
4. **`readonly: true` 语义降级**：比逐工具白名单更粗但更好用的意图级开关，适合 spc_dsh 诊断会话的读侧工具（查证据只读、写侧走 gate）；
5. **eval = 保存会话 + 被测配置**：与 Pack 发布流水线的"历史事件回放对比"完全同构，互相印证这条路线的业界形态；
6. **OpenAI 兼容 serve**：DSH 若对外暴露推理能力，OpenAI 兼容端点是最低成本接入方式（连山遗产 dsClaw 时代已经这么做过）。

## 9. 后续需要实测的问题

1. `docker agent serve chat` 的 OpenAI 兼容端点语义（多 agent 路由？流式？）；
2. safety mode 四档的实际拦截差异；
3. OCI 分发工件的内部结构（纯配置还是含运行时）；
4. 与 MCP Toolkit 的 `docker:` 前缀引用生态（预置了多少服务器）；
5. eval 的断言形态（确定性还是模型判定）。
