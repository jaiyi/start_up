# WeKnora 部署关联说明

> 具体服务器部署信息统一记录在上级目录：

```text
../deployment/weknora-tencent-cloud.md
```

本目录只记录家庭营养师 Agent 与 WeKnora 平台配置相关的信息。

## 当前相关配置

```env
WEKNORA_MODEL_MAX_CONCURRENCY=5
WEKNORA_WIKI_ASYNQ_CONCURRENCY=1
```

## 日常调整顺序

```text
1. 修改 nutrition-agent-pov/ 下的 Prompt、Skill 或配置文档。
2. 在 WeKnora 平台同步 Agent 配置。
3. 用典型问题测试。
4. 如果涉及服务端并发或模型配置，再按 deployment 文档操作服务器。
```
