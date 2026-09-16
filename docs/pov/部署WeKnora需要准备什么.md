# 部署 WeKnora 需要准备什么

> **一句话结论**：部署 WeKnora 不只是“装一个知识库软件”，而是搭一套小型的自托管知识 Agent 基础设施。对 8–10 人、多业务小组、需要知识隔离的团队，关键准备项是服务器、模型、权限、知识结构、备份导出机制，以及一个持续运营组织记忆的人。

---

## 1. 先明确：WeKnora 要承担什么角色

如果采用轻量半托管杠铃路径，WeKnora 更适合承担底层知识与 Agent 能力：

```text
WeKnora：
  - Raw 文档接入
  - Wiki Mode
  - RAG / hybrid search
  - Agent Chat
  - MCP / 工具调用
  - 知识库权限
  - 引用来源
  - 版本历史 / 回滚
  - 日志与可观测
  - 模型接入
```

它不应该只被当成一个“搜索框”，而应该被看作：

```text
组织记忆底座 + 知识 Agent Runtime + 权限边界 + 可导出的知识资产层
```

---

## 2. 服务器准备

### 2.1 最小试用配置

如果只是 8–10 人 PoC，先跑起来验证：

```text
CPU：4 核
内存：16 GB
磁盘：200 GB SSD
系统：Ubuntu 22.04 LTS
部署方式：Docker / Docker Compose
```

适合：

```text
几千篇以内文档
少量用户并发
验证 Wiki Mode / RAG / 权限 / Agent
```

### 2.2 推荐正式配置

如果要相对稳定地给团队使用：

```text
CPU：8 核
内存：32 GB
磁盘：500 GB - 1 TB SSD
系统：Ubuntu 22.04 LTS
网络：公网域名 + HTTPS，或内网 VPN
```

适合：

```text
多个业务小组
持续文档导入
多人问答
Wiki 生成任务
日志与备份
```

### 2.3 是否需要 GPU

早期不一定需要 GPU。

如果使用外部模型 API：

```text
Claude / GPT / Gemini / DeepSeek / Qwen API / 腾讯混元
```

WeKnora 服务器可以没有 GPU。

如果本地部署大模型、embedding 或 reranker，才需要 GPU，例如：

```text
Qwen
DeepSeek
Llama
BGE embedding
Reranker 模型
```

早期建议：

> **不要一开始自建大模型推理，先用 API 模型，把主要精力放在知识结构、权限隔离、Wiki 质量、业务使用和反馈闭环上。**

---

## 3. 基础软件环境

通常需要：

```text
Docker
Docker Compose
Git
Nginx / Caddy
HTTPS 证书
Linux 服务器
```

如果放公网，建议准备：

```text
域名
HTTPS
防火墙
访问白名单 / VPN
```

如果只给内部团队使用，可以优先选择：

```text
内网部署
VPN 访问
不暴露公网
```

---

## 4. 模型服务准备

WeKnora 这类知识 Agent 系统一般至少需要两类模型。

### 4.1 Chat LLM

用于：

```text
问答
总结
Wiki 生成
Agent 推理
多步任务执行
知识整理
```

可选：

```text
Claude
GPT
Gemini
DeepSeek
Qwen
Moonshot
腾讯混元
本地模型
```

早期建议选择一个中文能力、长上下文能力、工具调用能力和稳定性都较好的主模型。

### 4.2 Embedding 模型

用于：

```text
文档向量化
语义检索
RAG
相似问题召回
```

可选：

```text
OpenAI embedding
Qwen embedding
BGE 系列
Jina embedding
腾讯云 embedding
其他国产 embedding
```

如果主要是中文业务文档，应优先验证中文检索效果。

### 4.3 可选：Reranker 模型

用于：

```text
提高检索排序质量
减少召回噪音
```

早期可以不配。等出现“能搜到但排序不好”的问题，再增加 reranker。

---

## 5. 数据库、向量库与文件存储

部署 WeKnora 通常会涉及几类存储组件：

```text
关系数据库：
  存用户、权限、workspace、知识库、文档元数据、任务状态

向量库：
  存 embedding，用于 RAG 检索

对象存储 / 文件存储：
  存原始文档、附件、解析后的中间文件

搜索索引：
  做全文检索 / hybrid search

日志系统：
  存问答日志、Agent 调用日志、错误日志
```

具体组件应以 WeKnora 当前版本的 README、Docker Compose 和部署文档为准。

关键原则：

> **不要只备份数据库，也要备份原始文件、Wiki 页面、向量索引配置、Agent 配置和问答日志。**

---

## 6. 文档解析能力

知识库是否好用，很大程度取决于文档解析质量。

需要提前验证的文档类型包括：

```text
PDF
Word
Excel
PPT
Markdown
网页
飞书文档
钉钉文档
Notion
语雀
GitLab
RSS
图片 / 扫描件
会议纪要
聊天记录
客户记录
SOP
报价记录
复盘文档
```

部署前需要验证：

```text
1. PDF 表格能不能解析？
2. Word 格式是否保留标题层级？
3. Excel 是按 sheet 解析还是整表解析？
4. 图片和扫描件是否需要 OCR？
5. 飞书 / 钉钉 / Notion 是否能同步？
6. 同步后权限是否保留？
7. 文档更新后是否能增量同步？
```

如果这些没测，后续 RAG 效果会很不稳定。

---

## 7. 权限设计

这是 8–10 人、多业务小组场景里最重要的一部分。

不要只建一个大知识库，建议设计成：

```text
Workspace：公司级

Knowledge Base：
  public
  sales-a
  sales-b
  management
  ai-ops
```

权限示例：

```text
普通业务员 A：
  可访问 public + sales-a

普通业务员 B：
  可访问 public + sales-b

小组长 A：
  可访问 public + sales-a + 部分 management

小组长 B：
  可访问 public + sales-b + 部分 management

管理者：
  可访问 public + sales-a + sales-b + management

AI Ops：
  可管理全部知识库，但要有审计
```

关键原则：

> **权限隔离必须发生在检索前，不是生成后。**

错误方式：

```text
先检索全部文档，再让模型“不要告诉用户无权限内容”。
```

正确方式：

```text
根据用户权限，只检索用户可访问的知识库。
```

---

## 8. 原始资料准备

部署前不要急着把所有资料都倒进去。

建议先准备一批小而高质量的测试资料：

```text
公司介绍：2–3 篇
产品资料：5–10 篇
销售 SOP：5 篇
客户常见问题：20 条
成交案例：5 个
失败案例：5 个
A 组客户记录：10 条
B 组客户记录：10 条
管理复盘：3–5 篇
```

先用这些资料验证：

```text
能不能导入
能不能生成 Wiki
能不能正确引用
能不能权限隔离
能不能回答销售日常问题
能不能发现知识缺口
```

不要一开始导入几万篇文档，否则很难判断问题到底来自：

```text
系统能力
文档质量
权限配置
embedding 模型
prompt
业务问题本身
```

---

## 9. Wiki / Schema 规范

如果想走 LLM Wiki-first，而不是普通 RAG，需要提前定义知识组织规范。

建议至少定义这些页面类型：

```text
客户页面
产品页面
行业页面
竞品页面
销售 SOP 页面
客户异议页面
成交案例页面
失败案例页面
项目复盘页面
术语页面
```

### 9.1 客户页面模板

```markdown
# 客户名称

## 基本信息

## 业务背景

## 已沟通需求

## 决策链

## 关键异议

## 已承诺事项

## 历史报价

## 相关会议纪要

## 下一步建议

## 来源材料
```

### 9.2 销售 SOP 页面模板

```markdown
# SOP 名称

## 适用场景

## 前置条件

## 操作步骤

## 常见错误

## 推荐话术

## 风险提醒

## 相关案例

## 最近更新时间

## 来源材料
```

没有 Schema，LLM Wiki 很容易变成“看起来漂亮的自动摘要”，但难以长期治理。

---

## 10. 备份和导出机制

部署前就要设定：

```text
每天备份数据库
每天备份原始文件
每周导出 Wiki Markdown
每周导出问答日志
每周导出用户反馈
每月导出 Agent 配置
```

推荐落到：

```text
Git 仓库
对象存储
数据库 dump
离线压缩包
```

目标不是“系统还在就能用”，而是：

> **即使 WeKnora 将来不用了，组织记忆也能迁移。**

所以至少要能拿到：

```text
Raw 原始资料
Wiki Markdown
文档 metadata
问答日志
用户反馈
权限配置
Agent prompt / tool 配置
```

---

## 11. AI Ops 角色

WeKnora 部署本身不是最难的，难的是持续运营。

至少需要一个人兼职负责：

```text
知识库目录设计
文档导入规范
权限配置
Wiki 页面审核
错答样本收集
重复知识合并
过期知识清理
Agent 配置调整
每周效果复盘
备份检查
```

这个人不一定是程序员，但要懂业务，也愿意维护知识。

如果没人负责，WeKnora 最后会变成：

```text
又一个没人维护的知识库
```

---

## 12. 如果未来接 WorkBuddy，还要额外验证什么

如果后续采用：

```text
WorkBuddy 前台 + WeKnora 后台
```

还需要验证：

```text
1. WorkBuddy 能否调用 WeKnora API？
2. WorkBuddy 是否支持 MCP？
3. WorkBuddy 是否能传 user_id / group_id？
4. WorkBuddy 是否能按不同 Agent 配不同 WeKnora token？
5. WorkBuddy 是否能展示 WeKnora 返回的引用来源？
6. WorkBuddy 是否能把用户反馈写回 WeKnora？
7. WorkBuddy 对话日志能否导出？
8. WorkBuddy 是否允许不上传核心知识？
```

如果这些不成立，就不要急着接 WorkBuddy。先用 WeKnora 自己跑闭环。

---

## 13. 最小可行部署清单

### 13.1 服务器

```text
一台 Ubuntu 22.04 云主机
8 核 CPU
32 GB 内存
500 GB SSD
Docker + Docker Compose
域名 + HTTPS
```

短期 PoC 可以降低到：

```text
4 核 CPU
16 GB 内存
200 GB SSD
```

### 13.2 模型

```text
Chat LLM：
  先接一个稳定 API 模型

Embedding：
  选一个中文效果好的 embedding 模型

Reranker：
  第二阶段再加
```

### 13.3 知识库

```text
public
sales-a
sales-b
management
ai-ops
```

### 13.4 用户权限

```text
user_a → public + sales-a
user_b → public + sales-b
manager → public + sales-a + sales-b + management
ai_ops → 管理全部
```

---

## 14. 部署后的验收问题

部署完成后不要只问“页面能不能打开”，而要问：

```text
1. A 组用户能不能查到 A 组知识？
2. A 组用户能不能查到 B 组知识？如果能，失败。
3. 管理者能不能跨组查询？
4. 回答是否带引用？
5. 引用是否真的来自有权限文档？
6. Wiki 页面能否编辑？
7. Wiki 页面能否回滚？
8. Raw 文件能否导出？
9. Wiki Markdown 能否导出？
10. 问答日志和反馈能否导出？
11. Agent 能否调用外部工具 / MCP？
12. 模型能否切换？
```

---

## 15. 推荐实施路径

### 第一步：不要接 WorkBuddy，先部署 WeKnora

目标：

```text
验证知识底座是否可用
```

时间：

```text
1–2 周
```

验收：

```text
Raw → Wiki → RAG → 权限 → 引用 → 反馈 → 导出
```

### 第二步：用真实小组跑 20 个问题

不要让技术人员自己测，要让业务员问真实问题：

```text
这个客户以前有什么沟通记录？
这个行业客户最常见的异议是什么？
类似客户过去怎么成交的？
这个报价有什么风险？
这个需求之前有没有失败案例？
```

看它能不能真正帮业务员省时间。

### 第三步：再考虑接 WorkBuddy

如果 WeKnora 底座通过，再把 WorkBuddy 接上：

```text
WorkBuddy A 组销售助手 → WeKnora public + sales-a
WorkBuddy B 组销售助手 → WeKnora public + sales-b
WorkBuddy 管理者助手 → WeKnora public + sales-a + sales-b + management
```

这样风险最小。

---

## 16. 最简判断

如果想部署 WeKnora，最低需要：

```text
一台 Linux 服务器
Docker 环境
一个可用 Chat LLM
一个 embedding 模型
数据库 / 向量库 / 文件存储
域名或内网访问方式
知识库权限设计
一批高质量测试资料
备份与导出机制
一个 AI Ops / 知识运营负责人
```

最推荐路径：

```text
先用 4 核 16G 或 8 核 32G 云主机部署 PoC；
先不接 WorkBuddy；
先验证 WeKnora 的 Wiki Mode、RAG、权限隔离、引用和导出；
验证通过后，再把 WorkBuddy 接成统一入口。
```

最终原则：

> **WeKnora 的技术部署不是最难的，真正要准备的是：模型、权限、知识结构、备份机制，以及持续运营组织记忆的人。**
