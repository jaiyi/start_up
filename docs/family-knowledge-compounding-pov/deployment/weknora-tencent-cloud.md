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
