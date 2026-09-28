# WeKnora 腾讯云部署信息

> 用于统一记录家庭知识复利 POV 相关的 WeKnora 部署、运维入口和已确认配置。本文只记录连接方式和运维信息，不记录密码、API Key、模型密钥等敏感凭证。

## 1. 服务器入口

```bash
ssh -p 36000 lijiayi@82.157.94.221
```

已知信息：

```text
云厂商：腾讯云
系统：TencentOS Server 3 x86_64
用户名：lijiayi
SSH 端口：36000
公网 IP：82.157.94.221
```

安全注意：

```text
不要在文档中记录 SSH 密码。
不要在文档中记录 WeKnora 登录密码。
不要在文档中记录 LLM / Embedding API Key。
如需共享凭证，应使用密码管理器或云厂商密钥管理能力。
```

## 2. WeKnora 部署目录

服务器上的部署目录：

```bash
/opt/WeKnora
```

当前目录结构里已看到：

```text
/opt/WeKnora/config
/opt/WeKnora/docker-compose.yml
/opt/WeKnora/.env
/opt/WeKnora/.env.example
/opt/WeKnora/skills
```

另有工具目录：

```bash
/opt/weknora-tools
```

## 3. Docker Compose 运维命令

进入部署目录：

```bash
cd /opt/WeKnora
```

停止服务：

```bash
sudo docker compose down
```

启动服务：

```bash
sudo docker compose up -d
```

查看服务状态：

```bash
sudo docker compose ps
```

查看容器列表：

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

注意：服务器上可用的是新版 `docker compose`，不是旧版 `docker-compose`。

## 4. 已配置的 Wiki 抽取限流

问题背景：Wiki 抽取时报错：

```text
combined extraction failed: LLM call failed: create chat completion: error, status code: 429, status: 429 Too Many Requests, message: 您的账户已达到速率限制，请您控制请求频率
```

判断原因：Wiki 抽取阶段 LLM Chat Completion 请求并发过高，触发上游模型账号速率限制。

已在 `/opt/WeKnora/.env` 追加限流配置：

```env
WEKNORA_MODEL_MAX_CONCURRENCY=5
WEKNORA_WIKI_ASYNQ_CONCURRENCY=1
```

含义：

```text
WEKNORA_MODEL_MAX_CONCURRENCY：对应系统设置 model.max_concurrency，用来约束单模型在后台任务中的最大并发量。适用于 Wiki 模式、实体抽取、图谱构建等频繁调用大模型的后台任务。
WEKNORA_WIKI_ASYNQ_CONCURRENCY：对应系统设置 asynq.wiki_concurrency，用来限制 Wiki 异步任务 worker 并发。
```

排查要点：

```text
如果 trace 中同时出现多个 postprocess.graph.chunk[*]、postprocess.summary、postprocess.wiki.extract，说明后处理阶段仍在并发调用大模型。
当前经验值先把 model.max_concurrency / WEKNORA_MODEL_MAX_CONCURRENCY 调到 5，通常可以兼顾处理速度和 429 风险。
如果仍触发 429，再临时降到 1；稳定后可小步调回 5。
```

确认命令：

```bash
cd /opt/WeKnora
grep -nE '^(WEKNORA_MODEL_MAX_CONCURRENCY|WEKNORA_WIKI_ASYNQ_CONCURRENCY)=' .env
```

预期输出应包含：

```text
WEKNORA_MODEL_MAX_CONCURRENCY=5
WEKNORA_WIKI_ASYNQ_CONCURRENCY=1
```

重启后可确认容器环境变量：

```bash
sudo docker exec WeKnora-app printenv | grep -E 'WEKNORA_MODEL_MAX_CONCURRENCY|WEKNORA_WIKI_ASYNQ_CONCURRENCY'
```

## 5. Wiki 抽取调参建议

如果继续 429：

```text
保持 WEKNORA_MODEL_MAX_CONCURRENCY=5。
保持 WEKNORA_WIKI_ASYNQ_CONCURRENCY=1。
每次只导入或抽取少量文件。
优先用单个小文件验证。
如果仍出现 429，再把 WEKNORA_MODEL_MAX_CONCURRENCY 临时降到 1。
```

如果稳定但太慢，可以在确认模型账号额度允许后，再逐步尝试：

```env
WEKNORA_MODEL_MAX_CONCURRENCY=8
WEKNORA_WIKI_ASYNQ_CONCURRENCY=1
```

不建议一开始把 Wiki worker 并发调高。

如果能编辑知识库级别 `wiki_config`，建议低速稳定配置：

```json
{
  "ingest_batch_size": 1,
  "ingest_map_parallel": 1,
  "ingest_reduce_parallel": 1,
  "ingest_max_inflight": 1
}
```

## 6. 变更 `.env` 的安全做法

修改前先备份：

```bash
cd /opt/WeKnora
sudo cp .env ".env.bak.$(date +%Y%m%d-%H%M%S)"
```

追加配置时使用 `sudo tee`，因为 `/opt/WeKnora/.env` 属于 root：

```bash
printf '\nWEKNORA_MODEL_MAX_CONCURRENCY=5\nWEKNORA_WIKI_ASYNQ_CONCURRENCY=1\n' | sudo tee -a .env >/dev/null
```

不要用 `cat .env` 直接查看完整文件，避免把密钥打印到终端记录里。只用 `grep` 查看必要配置项。

## 7. 后续待确认

```text
1. 重启后确认 WeKnora-app 容器拿到了限流环境变量。
2. 用单个小文件重新测试 Wiki 抽取。
3. 如果仍出现 429，再考虑修改 WeKnora 源码里的 429 retry/backoff 识别逻辑。
4. 如需要长期稳定运行，后续补充备份脚本、日志位置、版本升级流程和回滚流程。
```

## 8. Family Nutrition State MCP 部署状态

> 更新日期：2026-09-28。本文只记录非敏感运维事实，不记录 token、数据库密码、完整 DATABASE_URL 或 `.env` 内容。

### 8.1 部署目录

家庭营养动态状态服务部署在独立目录：

```bash
/opt/family-nutrition-state
```

该目录与 WeKnora 主服务目录分离：

```text
/opt/WeKnora                  # WeKnora 主服务
/opt/family-nutrition-state   # 家庭营养师动态状态 Postgres + MCP 服务
```

### 8.2 当前容器

已确认运行中的家庭营养状态服务容器：

```text
family-nutrition-postgres      postgres:16，healthy
family-nutrition-mcp-server    family-nutrition-state-family-nutrition-mcp-server，healthy
```

网络与端口边界：

```text
family-nutrition-postgres：仅暴露容器内 5432/tcp，不开放公网端口。
family-nutrition-mcp-server：绑定 127.0.0.1:3030->3030/tcp，不开放公网端口。
```

### 8.3 已完成验证

已在服务器本机完成以下验证：

```text
1. docker compose 已识别服务：
   - family-nutrition-postgres
   - family-nutrition-mcp-server

2. Postgres 容器 healthy。

3. MCP server 容器 healthy。

4. app/runtime 数据库用户可以执行健康检查函数：
   schema_exists = t
   existing_table_count = 15

5. app/runtime 数据库用户不能直接读取业务表：
   select count(*) from family_state.families;
   返回 permission denied，符合最小权限预期。

6. MCP HTTP 健康检查通过：
   GET http://127.0.0.1:3030/health
   返回 status=ok，database.schema=ready。

7. MCP 工具清单通过：
   GET http://127.0.0.1:3030/tools
   已部署版本当前只暴露 health_check；Milestone 3 代码会在后续部署后扩展为 health_check + 5 个只读业务工具。

8. MCP 协议入口通过：
   POST http://127.0.0.1:3030/mcp initialize
   返回 serverInfo.name=family-nutrition-state-mcp。

9. MCP tool 调用通过：
   tools/call health_check
   返回 status=ok，database.schema=ready。
```

### 8.4 已处理的问题

部署 MCP 服务时已处理以下问题：

```text
1. 服务器初始 docker-compose.yml 只有 family-nutrition-postgres，缺少 MCP 服务定义。
2. 服务器初始缺少 app/、0002_runtime_permissions.sql 和 create-runtime-app-role.sql。
3. 旧 Postgres 容器未挂载 /postgres-admin，需要按新 compose 重建容器以加载新只读挂载。
4. FAMILY_NUTRITION_DATABASE_URL 和 FAMILY_NUTRITION_MIGRATION_DATABASE_URL 初始仍为 set-on-server-only 占位符。
5. 数据库密码含特殊字符，连接串必须对用户名和密码做 URL encode，避免 psql 把密码片段误解析为 port。
```

所有修复均未在文档或聊天中记录真实密码、token 或完整连接串。

### 8.5 WeKnora 与 MCP 网络状态

已确认当前 Docker 网络归属初始状态：

```text
WeKnora-app                  -> weknora_WeKnora-network
family-nutrition-mcp-server  -> family-nutrition-state_family-nutrition-state
```

由于 WeKnora MCP 页面可以填写 Bearer Token，但实际保存与调用链路采用了更稳妥的内网 proxy 方案：WeKnora 只配置无鉴权内网 URL，由 proxy 自动注入服务端 token。

已创建并验证：

```text
family-nutrition-mcp-proxy：nginx:1.27-alpine，不开放公网端口。
```

当前调用链路：

```text
WeKnora-app
  -> http://family-nutrition-mcp-proxy:3030/mcp
  -> family-nutrition-mcp-server:3030/mcp
  -> family-nutrition-postgres
```

WeKnora Agent 中 MCP 服务配置：

```text
MCP 服务名：agent_pg
传输类型：HTTP Streamable
服务 URL：http://family-nutrition-mcp-proxy:3030/mcp
API Key：留空
Bearer Token：留空
```

已完成容器内验证：

```text
1. WeKnora-app 无 Authorization header 访问 proxy /tools 成功。
2. WeKnora-app 通过 proxy 调用 /mcp initialize 成功。
3. WeKnora-app 通过 proxy 调用 tools/call health_check 成功。
4. WeKnora Agent 已绑定 agent_pg，并在对话中成功调用 health_check。
```

注意：proxy 的 token 只来自服务器 `/opt/family-nutrition-state/.env`，不写入 WeKnora 页面或本文档。

### 8.6 安全边界

继续保持以下边界：

```text
1. 不开放 Postgres 5432 公网端口。
2. 不开放 MCP 3030 公网端口。
3. 不让 Agent 直接连接 Postgres。
4. Agent 只调用 MCP 白名单工具。
5. 已部署版本当前 MCP 只暴露 health_check；部署 Milestone 3 后也只允许白名单内的 5 个只读业务工具。
6. `.env` 只保存在服务器，权限保持 600。
7. MCP 只读工具需要配置 `FAMILY_NUTRITION_ALLOWED_FAMILY_IDS` 白名单，只允许读取明确授权的家庭 ID。
8. 不在 Git、Markdown、聊天记录或 WeKnora 页面中记录 token、数据库密码、完整连接串。
```
