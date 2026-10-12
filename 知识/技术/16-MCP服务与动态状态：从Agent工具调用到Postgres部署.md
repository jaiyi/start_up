# 16 · MCP 服务与动态状态：从 Agent 工具调用到 Postgres 部署

> 目标：用家庭营养师 Agent 的最小实现作为入口，理解一个 Agent 系统如何从“会回答问题”走向“能安全读写动态状态”。本文面向初学者，但会按照软件工程师视角展开：架构分层、运行链路、部署基础、数据库设计、工具治理、安全边界、测试与演进路线。

---

## 1. 一句话定义

MCP 服务不是知识库，也不是大模型本身。

它更像 Agent 和真实业务系统之间的一层“受控工具网关”：

```text
Agent 想办事
  ↓
通过 MCP 调用一个被注册、被鉴权、被 schema 约束的工具
  ↓
MCP 服务校验参数、权限、幂等和业务规则
  ↓
再去查询或写入 Postgres / 外部系统
  ↓
返回结构化结果给 Agent
```

一句话：

> MCP 把 Agent 的“想调用工具”变成后端可控制、可测试、可审计的工程接口。

在家庭营养师 Agent 里，它解决的是：

```text
知识库适合放稳定知识；
Postgres 适合放动态状态；
MCP 服务负责让 Agent 安全地读写这些动态状态。
```

---

## 2. 为什么 RAG / WeKnora 知识库不适合直接管理动态状态

家庭营养师 Agent 里有两类信息。

第一类是稳定知识：

```text
家庭成员画像；
饮食原则；
菜谱；
早餐习惯；
营养约束；
Prompt；
Agent 规则；
Skill 文档。
```

这些适合用 Markdown 管理，再上传或同步到 WeKnora 知识库，让 Agent 检索和引用。

第二类是动态状态：

```text
今天买了什么菜；
冰箱里还剩多少；
某道菜上次什么时候推荐；
某餐是否已经执行；
用户饭后有没有反馈；
最近两周哪些菜重复出现；
周末有哪些食材需要清库存。
```

这些信息有几个特点：

```text
变化频繁；
需要精确更新；
需要事务一致性；
需要历史记录；
需要去重和审计；
可能涉及家庭健康、老人、小孩等敏感信息。
```

如果把这些都放进知识库文档，会遇到问题：

```text
1. 每次变更都要重新上传或重建索引；
2. 文档版本和知识库索引可能不一致；
3. 很难表达“扣减库存”这种精确状态变化；
4. 很难处理并发、重复提交、失败回滚；
5. 很难记录谁在什么时候确认了什么；
6. 知识库更偏检索，不是业务数据库。
```

所以更稳妥的分工是：

```text
Markdown / Git = 稳定知识源；
WeKnora = 检索索引层和 Agent 对话入口；
MCP Service = Agent 与动态状态之间的安全边界；
Postgres = 动态状态 source of truth。
```

---

## 3. 当前最小实现处在什么阶段

当前家庭营养师状态服务已经完成 Milestone 0～2 的最小工程闭环：服务骨架可以跑通，Postgres 基础契约已经建立，MCP 服务也能用最小权限 runtime role 连接 Postgres 并返回数据库/schema readiness。

当前已经具备：

```text
1. TypeScript 项目骨架；
2. Vitest 测试；
3. 配置加载和环境变量校验；
4. Bearer Token 鉴权；
5. 统一 response envelope；
6. 错误信息脱敏；
7. 工具注册表；
8. DB-backed health_check MCP 工具；
9. /health、/tools、/mcp 三个 HTTP 入口；
10. Dockerfile；
11. Docker Compose 同时启动 Postgres 和 MCP 服务；
12. family_state schema 初始 migration；
13. runtime app role 的最小权限控制；
14. 测试覆盖率阈值。
```

当前还没有实现：

```text
1. 库存、菜单和反馈业务读写工具；
2. WeKnora Agent 真实工具调用；
3. 备份和 Markdown 快照导出；
4. 生产环境长期运行监控。
```

这很正常。

工程上正确的节奏不是一开始就把所有功能堆上去，而是先证明：

```text
服务能启动；
鉴权能挡住未授权请求；
工具能被注册；
服务能以最小权限连接 Postgres；
schema readiness 能被健康检查发现；
返回结构稳定；
错误不会泄露密钥；
测试能覆盖核心边界。
```

---

## 4. App 架构如何理解

当前 app 可以按五层理解。

```text
src/index.ts
  ↓
启动层

src/config/load-config.ts
  ↓
配置层

src/mcp/auth.ts
src/mcp/response.ts
src/mcp/tool-registry.ts
  ↓
工具治理与通用基础层

src/mcp/server.ts
  ↓
HTTP / MCP 运行时层

未来的 src/db、src/modules、src/tools
  ↓
业务状态与工具实现层
```

展开看：

| 层 | 主要文件 | 职责 |
|---|---|---|
| 启动层 | `index.ts` | 读取配置、启动 HTTP 服务、启动失败时退出 |
| 配置层 | `load-config.ts` | 校验环境变量，例如 `MCP_AUTH_TOKEN` 和 `PORT` |
| 鉴权层 | `auth.ts` | 检查请求是否带正确 Bearer Token |
| 响应层 | `response.ts` | 统一成功 / 失败返回格式，并做错误脱敏 |
| 工具注册层 | `tool-registry.ts` | 记录当前对外暴露哪些工具 |
| MCP 运行时层 | `server.ts` | 注册 MCP Server、处理 `/mcp`、`/health`、`/tools` 请求 |
| 测试层 | `tests/` | 用契约测试和单元测试锁住行为 |

这个分层的好处是：

```text
配置错误不会混到业务逻辑里；
鉴权逻辑可以单独测试；
响应格式可以统一演进；
工具注册可以被 contract test 保护；
当前已接入 Postgres 时，这种分层也能继续复用 HTTP / MCP 骨架，只是在底层替换或扩展数据库、repository 和业务工具。
```

---

## 5. MCP、HTTP endpoint 和 Tool 的关系

初学者容易把三个概念混在一起：

```text
HTTP endpoint；
MCP protocol；
Tool。
```

可以这样理解：

| 概念 | 类比 | 当前例子 |
|---|---|---|
| HTTP endpoint | 服务的门 | `/health`、`/tools`、`/mcp` |
| MCP protocol | 客户端和服务端说话的协议 | WeKnora / MCP Client 通过 `/mcp` 调工具 |
| Tool | 真正被 Agent 调用的能力 | `health_check`，未来的 `get_current_inventory` |

当前三个入口的定位：

```text
/health
  给人和部署系统检查：服务是否活着。

/tools
  给开发者调试：当前服务暴露了哪些工具。

/mcp
  给 MCP 客户端使用：按 MCP 协议列工具、调工具。
```

需要注意：

```text
/tools 不是标准 MCP 工具调用入口；
它是方便本地开发、部署排查和查看当前白名单工具的调试 endpoint。
```

真正接 WeKnora Agent 时，原则上应该让 WeKnora 作为 MCP Client 通过 `/mcp` 发现和调用工具。

---

## 6. 一次工具调用的完整生命周期

以未来的 `get_current_inventory` 为例，理想链路是：

```text
1. 用户问：今晚有什么快坏的菜要先吃？
2. WeKnora Agent 判断需要查库存；
3. Agent 选择 MCP 工具 get_current_inventory；
4. MCP Client 向 /mcp 发送 tool call；
5. MCP 服务先做鉴权；
6. MCP 服务校验工具名是否存在；
7. MCP 服务用 schema 校验参数；
8. 业务工具检查 family_id / actor_id / 权限；
9. 查询 Postgres；
10. 按统一 envelope 返回结构化库存；
11. Agent 基于真实库存和菜谱知识生成推荐；
12. 日志记录本次 tool call 和 trace id。
```

如果是写入工具，例如 `confirm_meal_execution`，还要多几步：

```text
1. 检查用户是否明确确认；
2. 检查 idempotency_key 是否重复；
3. 开启数据库事务；
4. 写 meal_events；
5. 扣减 inventory_items；
6. 写 inventory_events；
7. 写 audit_log；
8. 提交事务；
9. 返回执行结果。
```

这条链路体现一个核心原则：

> Agent 可以提出动作，但真正能不能执行，由 MCP 服务、数据库事务、权限和业务规则决定。

---

## 7. 部署基础：服务、端口、环境变量、Docker

### 7.1 服务是什么

服务就是一个长期运行的程序。

它不会像普通脚本那样执行完就退出，而是一直等待请求：

```text
启动服务
  ↓
监听端口
  ↓
等待请求
  ↓
处理请求
  ↓
返回响应
  ↓
继续等待下一次请求
```

家庭营养师 MCP 服务就是这样一个服务。

---

### 7.2 端口是什么

端口可以理解成服务器上的“门牌号”。

同一台机器可以有很多服务：

```text
22    SSH 登录；
80    HTTP 网站；
443   HTTPS 网站；
5432  Postgres；
3030  Family Nutrition MCP Service。
```

访问：

```text
http://127.0.0.1:3030/health
```

意思是：

```text
访问本机 3030 号门上的 /health 路径。
```

---

### 7.3 `.env` 是什么

`.env` 用来放不同环境的配置，例如：

```text
服务监听哪个端口；
数据库连接地址；
MCP 鉴权 token；
日志级别；
是否开启调试模式。
```

重要原则：

```text
.env.example 可以提交到 Git；
真实 .env 不可以提交到 Git；
真实密码、Token、API Key 不要写进 Markdown；
不要上传到 WeKnora；
不要贴给 Claude。
```

---

### 7.4 Docker 是什么

Docker 可以理解成“把程序和运行环境一起打包”。

没有 Docker 时，你需要在服务器上手动确认：

```text
Node.js 版本是否正确；
npm 依赖是否装好；
环境变量是否设置；
启动命令是否正确；
系统库是否兼容。
```

有 Docker 后，可以用镜像把这些约定固化下来：

```text
同一个 Dockerfile
  ↓
构建出同一个运行环境
  ↓
本地和服务器尽量一致
```

---

### 7.5 Docker Compose 是什么

Docker 管一个容器。

Docker Compose 管一组相关容器。

未来家庭营养师状态系统至少会有：

```text
family-nutrition-state-mcp  MCP 服务容器；
family-nutrition-postgres   Postgres 数据库容器。
```

用 Compose 可以一条命令启动它们：

```bash
sudo docker compose up -d
```

也可以查看状态：

```bash
sudo docker compose ps
```

---

## 8. 为什么需要 Postgres

Postgres 在这里不是为了“显得专业”，而是因为它正好适合动态状态。

家庭营养师需要管理的状态包括：

```text
库存；
采购记录；
计划消耗；
餐食执行；
饭后反馈；
偏好观察；
推荐历史；
审计日志；
状态导出记录。
```

这些数据需要：

```text
结构化查询；
约束；
事务；
索引；
历史事件；
备份；
迁移；
权限控制。
```

Postgres 适合做这些事情。

相比之下，Markdown 更适合：

```text
写给人读；
记录稳定规则；
做版本管理；
沉淀总结；
上传知识库检索。
```

所以不是 Markdown 和 Postgres 二选一，而是分工：

```text
Markdown 负责“知识可读、可复利”；
Postgres 负责“状态准确、可事务”；
MCP 负责“让 Agent 受控访问状态”。
```

---

## 9. 事务、幂等、审计为什么重要

### 9.1 事务

事务保证一组操作要么全部成功，要么全部失败。

例如确认一顿晚餐已经执行：

```text
写入 meal_events；
扣减库存；
写 inventory_events；
写 audit_log。
```

如果扣减库存成功了，但写审计失败了，系统就会不可信。

所以应该放在一个事务里：

```text
BEGIN;
  insert meal_event;
  update inventory;
  insert inventory_event;
  insert audit_log;
COMMIT;
```

如果中间失败：

```text
ROLLBACK;
```

状态恢复到执行前。

---

### 9.2 幂等

幂等解决重复提交问题。

真实系统里，重复请求很常见：

```text
用户点了两次确认；
网络超时后客户端重试；
Agent 误重复调用工具；
服务重启后消息重放。
```

如果没有幂等，可能会：

```text
重复扣库存；
重复记录一顿饭；
重复生成采购记录；
重复写偏好。
```

所以写入工具必须带：

```text
idempotency_key；
request_id；
confirmation_id 或明确确认文本。
```

服务端用唯一约束或幂等表判断：

```text
同一个 family_id + tool_name + idempotency_key
已经处理过，就直接返回上次结果；
没有处理过，才执行真正写入。
```

---

### 9.3 审计

审计回答四个问题：

```text
谁；
在什么时候；
通过什么工具；
基于什么确认；
改了什么状态。
```

家庭营养师虽然是个人 / 家庭场景，也应该保留审计意识。

原因是：

```text
涉及小孩、老人、健康偏好等敏感信息；
长期饮食偏好不应该被模型悄悄改写；
库存和反馈会影响后续推荐；
出错时要能回放和纠正。
```

---

## 10. 工具设计：读工具和写工具要分开

MCP 工具建议分成两类。

### 10.1 只读工具

只读工具不改变状态。家庭营养师第一版优先实现：

```text
get_current_inventory；
get_inventory_risks；
list_recent_meals。
```

后续可以再补充计划消耗查询和反馈统计。

只读工具也要鉴权和参数校验，但风险较低。

它们的重点是：

```text
返回准确；
过滤权限；
不要泄露不该暴露的数据；
结构适合 Agent 使用。
```

---

### 10.2 写入工具

写入工具会改变状态。家庭营养师第一版优先实现：

```text
record_inventory_event_after_confirmation；
confirm_meal_execution；
record_meal_feedback。
```

后续可以再补充采购专用工具、计划消耗专用工具、反馈后库存修正工具和 Markdown 导出工具。

写入工具必须更严格：

```text
必须 schema 校验；
必须鉴权；
必须用户确认；
必须带 idempotency_key；
必须记录 audit_log；
必须尽量用事务；
必须 fail closed。
```

所谓 fail closed，就是：

```text
不确定能不能写时，默认不写；
不确定用户是否确认时，默认要求确认；
不确定参数是否完整时，默认返回错误或追问。
```

---

## 11. 为什么不能让 Agent 直接连数据库

看起来让 Agent 直接执行 SQL 很方便：

```text
Agent → SQL → Postgres
```

但这是危险设计。

风险包括：

```text
1. Agent 可能生成错误 SQL；
2. 用户可能诱导 Agent 执行危险查询；
3. 权限边界很难控制；
4. 很难做业务级确认；
5. 很难保证幂等；
6. 很难统一审计；
7. SQL schema 一变，Prompt 和行为都可能坏掉。
```

正确做法是：

```text
Agent → MCP Tool → Service Code → Repository / SQL → Postgres
```

也就是：

```text
Agent 只知道工具；
工具知道业务意图；
服务代码知道如何查表；
数据库只暴露给后端服务。
```

例如 Agent 调用：

```text
confirm_meal_execution({ meal_plan_id, confirmation_id, idempotency_key })
```

而不是：

```sql
UPDATE inventory_items SET quantity = quantity - 1 WHERE ...;
```

这就是工具边界的价值。

---

## 12. 数据库表如何从业务语言长出来

数据库设计不应该从“我要建很多表”开始，而应该从业务事件开始。

家庭营养师的核心事件包括：

```text
采购了一批食材；
计划一顿饭；
确认做了一顿饭；
扣减库存；
记录饭后反馈；
形成偏好观察；
导出状态快照。
```

因此第一版表可以围绕这些对象设计：

```text
families
actors
family_members
inventory_items
inventory_events
purchase_records
purchase_items
meal_plans
meal_plan_items
planned_consumptions
meal_events
meal_event_items
meal_feedback
preference_observations
write_confirmations
mcp_tool_calls
audit_log
state_exports
```

其中：

```text
inventory_items 保存当前库存；
inventory_events 保存库存变化历史；
meal_events 保存实际吃了什么；
meal_feedback 保存饭后反馈；
preference_observations 保存从反馈中提炼出的偏好；
audit_log 保存关键写入动作；
mcp_tool_calls 保存工具调用 trace。
```

一个重要原则是：

> 当前状态和事件历史都要有。

只有当前状态，无法追溯；只有事件历史，查询当前状态又会很麻烦。第一版可以两者并存：

```text
当前库存表用于快速查询；
库存事件表用于追溯和修正。
```

---

## 13. 测试策略：为什么 Milestone 0 也要写测试

哪怕早期只有一个 `health_check`，测试也有价值；现在 DB-backed health check 和 Postgres 集成测试已经把这条测试策略延伸到数据库边界。

因为我们真正要保护的不是功能数量，而是系统边界：

```text
未授权请求必须被拒绝；
错误响应不能泄露密钥；
工具列表不能出现危险工具；
配置错误必须 fail fast；
返回 envelope 必须稳定；
测试必须覆盖未来扩展的安全底线。
```

第一版测试可以分成几类：

| 测试类型 | 目标 |
|---|---|
| 单元测试 | 校验配置、鉴权、响应封装等纯逻辑 |
| 契约测试 | 锁定工具名称、工具描述、返回结构和安全边界 |
| HTTP runtime 测试 | 验证真实请求能否通过服务处理 |
| 覆盖率测试 | 防止核心路径没有测试就上线 |
| Postgres 集成测试 | 验证 MCP 服务和 Postgres 真实交互、migration、runtime role 权限 |

当前已经做的是：

```text
先写测试；
看到测试失败；
实现最小代码；
运行测试通过；
补 typecheck / build / coverage；
补真实 Postgres 集成测试；
用 DB-backed health_check 验证 schema readiness 和最小权限 runtime role；
再让 code review 检查边界。
```

这对应 TDD 的节奏：

```text
RED → GREEN → IMPROVE
```

---

## 14. 安全边界清单

家庭营养师状态系统至少要守住这些底线。

### 14.1 秘密管理

```text
不要在文档中记录 SSH 密码；
不要在文档中记录 WeKnora 登录密码；
不要在文档中记录 LLM / Embedding API Key；
不要在文档中记录 Token、Cookie 或密钥；
不要把真实 .env 提交到 Git；
不要把真实 .env 上传到 WeKnora；
不要把真实密钥贴给 Claude。
```

### 14.2 数据库暴露

```text
Postgres 不应该暴露到公网；
只允许 MCP 服务在内网或 Docker 网络内访问；
数据库用户只给必要权限；
生产密码必须使用强密码；
备份文件也要按敏感数据管理。
```

### 14.3 工具调用

```text
不提供 raw_sql / execute_sql / shell_exec 工具；
不允许 Agent 任意写文件；
写入工具必须要求确认；
长期饮食偏好变化必须要求用户确认；
所有写入必须记录审计日志。
```

### 14.4 错误处理

```text
用户看到友好错误；
服务端日志记录足够上下文；
错误响应不要带数据库连接串、Token、密码或 API Key；
外部依赖失败时不要静默吞掉。
```

---

## 15. 从 Milestone 0 到生产可用的路线

### Milestone 0：服务骨架（已完成）

目标：证明 MCP 服务能跑起来。

```text
健康检查；
工具注册；
鉴权；
统一响应；
错误脱敏；
测试覆盖。
```

### Milestone 1：Postgres 能跑起来（已完成基础契约）

目标：本地和云服务器上有可用数据库。

```text
Docker Compose；
Postgres 容器；
.env 配置；
数据库初始化；
备份目录；
只允许内网访问。
```

### Milestone 2：MCP 连接 Postgres（已完成最小闭环）

目标：服务能安全连接数据库。

```text
pg 连接池；
健康检查包含数据库状态；
迁移脚本；
连接失败 fail fast；
集成测试。
```

### Milestone 3：只读工具

目标：Agent 可以查询状态，但不能改状态。

```text
get_current_inventory；
get_inventory_risks；
list_recent_meals。
```

### Milestone 4：写入工具

目标：在确认、幂等、审计保护下写状态。

```text
record_inventory_event_after_confirmation；
confirm_meal_execution；
record_meal_feedback。
```

### Milestone 5：接入 WeKnora Agent

目标：让前台家庭营养师 Agent 真正调用 MCP。

```text
配置 MCP endpoint；
配置认证；
配置工具权限；
用真实问题测试；
观察 tool call trace；
修正 Prompt 和工具描述。
```

### Milestone 6：备份、导出和上线检查

目标：让系统可以长期维护。

```text
Postgres 备份；
Markdown 快照导出；
异常恢复演练；
安全检查；
依赖审计；
运行日志；
最小监控。
```

---

## 16. 软件工程师视角下的扩展方向

当前家庭营养师 MCP 服务只是一个很小的实现，但它背后的模式可以扩展到很多场景。

### 16.1 从单个工具到工具模块

当前对外暴露的业务工具还只有：

```text
health_check
```

未来可以按领域拆分：

```text
inventory tools；
meal tools；
feedback tools；
preference tools；
export tools；
audit tools。
```

每个模块都应该有：

```text
schema；
service；
repository；
tests；
error codes；
permission policy。
```

---

### 16.2 从简单 HTTP 服务到可观测服务

未来应该增加：

```text
结构化日志；
request_id / trace_id；
tool call latency；
错误码统计；
慢查询记录；
健康检查分层；
告警。
```

这样出问题时能回答：

```text
是 Agent 没调用工具？
是工具参数错？
是 MCP 鉴权失败？
是数据库连接失败？
是 SQL 慢？
还是 WeKnora 没正确接入？
```

---

### 16.3 从数据库表到领域模型

不要让业务逻辑散落在 SQL 里。

更好的结构是：

```text
Tool Handler
  ↓
Domain Service
  ↓
Repository
  ↓
Postgres
```

例如：

```text
confirm_meal_execution tool
  ↓
MealExecutionService.confirmExecution
  ↓
InventoryRepository.decreaseItems
  ↓
MealEventRepository.create
  ↓
AuditRepository.record
```

这样以后如果数据库结构调整，工具契约不必跟着大改。

---

### 16.4 从手动操作到自动化部署

第一版可以手动 SSH 上服务器执行：

```bash
sudo docker compose up -d
```

后续可以演进到：

```text
Git 提交；
CI 运行 test / typecheck / build；
构建 Docker 镜像；
推送镜像；
服务器拉取新镜像；
滚动更新；
健康检查通过后完成发布。
```

但不要一开始就过度设计。

个人 / 家庭项目的合理节奏是：

```text
先手动部署跑通；
再把容易出错的命令写成脚本；
再引入最小 CI；
最后再考虑自动发布。
```

---

## 17. 与知识复利系统的关系

MCP + Postgres 动态状态层，让知识复利系统从“知识回答”升级到“状态闭环”。

没有它时，Agent 更像：

```text
会读文档的顾问。
```

有了它之后，Agent 才能逐步变成：

```text
能基于状态做建议；
能在用户确认后更新状态；
能从反馈中学习偏好；
能避免重复推荐；
能跟踪执行结果；
能把动态经验重新导出成稳定知识。
```

它和前面几个技术模块的关系是：

```text
知识工程：决定哪些内容进 Markdown，哪些内容进表；
RAG：决定如何检索菜谱、规则和家庭画像；
Prompt / 任务协议：决定 Agent 什么时候该查工具、什么时候该确认；
Harness：决定工具、权限、日志和运行边界；
Agent 记忆管理：决定哪些反馈变成长期偏好；
MCP + Postgres：承接动态状态和业务写入。
```

---

## 18. 最终原则

家庭营养师 Agent 的工程化路线可以总结为：

```text
文档管知识；
数据库管状态；
MCP 管工具边界；
Prompt 管任务理解；
测试管行为稳定；
审计管责任回放；
备份管长期可恢复。
```

最重要的判断是：

> 不要让知识库承担数据库职责，也不要让 Agent 绕过后端服务直接写状态。

好的 Agent 系统不是让模型拥有无限自由，而是：

```text
让模型在清晰工具、明确权限、结构化状态、人工确认和审计日志的边界内，低成本地帮助人完成真实任务。
```
