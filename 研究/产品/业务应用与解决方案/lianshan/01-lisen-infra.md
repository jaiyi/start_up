# 产品仓库分析 01：lisen-infra（连山 Monday 部署/运维底座）

> 分析日期：2026-09-14
> 分析对象：`/Users/lijiayi/lianshan/agent/lisen-infra`
> 方法：实读 README.md / AGENTS.md(59KB) / CLAUDE.md / docs 下核心 .md + ansible/、dokku-apps/、dokku-plugins/、group_vars、app.json、flow.yaml、bundle-manifest.json 等真实配置与脚本
> 重要说明：**本仓大量子模块（dokku-apps/* 与 dokku-plugins/* 的绝大多数）在当前 checkout 中未初始化（空目录）**，本仓自身只保留 Ansible 编排层 + 两个有实体的 app.json（workstation-inference / workstation-storage）+ 脚本 + 测试。因此"应用本身"的领域逻辑不在本仓，本仓是**编排/装配层**。凡涉及子仓内部实现的结论标注为"待深挖"。

---

## 1. 一句话定位 + 技术栈

**一句话定位**：lisen-infra 是连山 Monday 工业 AI 平台的**单节点/多环境部署与运维自动化底座**——用 Ansible 把一台裸机（workstation / server / edge 三类节点）装配成一个以 Dokku 为应用运行时、以定制 PostgreSQL 为唯一后端数据平面、以 dokku-admin HTTP API 为唯一部署控制面的"开箱即用工作站"。它不是业务应用本身，而是**把业务应用（多为 Git submodule 子仓）声明式地发现、部署、连线、备份的装配与编排仓**。

**技术栈**：
- 编排：Ansible（`ansible-core`，53 个 role，40+ playbook），control-node 模型（macOS 运维机 → SSH → 目标机）
- 应用运行时：Dokku `v0.38.25`（`ansible/inventories/group_vars/all.yml:9`），Docker/BuildKit
- 数据平面：定制 PostgreSQL 16.13 镜像 `dokku/postgres-lisen:16.13-pap`，内置 11 个扩展（AGE 1.6.0 图 / pgvector 0.8.2 向量 / pgmq 消息队列 / pg_cron / pg_net / pg_trgm / zhparser+SCWS 中文分词 / pg_partman / pgcrypto / pg_search / pg_ipush）
- 对象存储：RustFS（S3 兼容，替代 MinIO，见 `docs/MINIO_TO_RUSTFS_MIGRATION.md`）
- 控制面：dokku-admin（独立子仓，FastAPI，Dokku CLI 的 HTTP 封装 + PG-backed RBAC）
- 认证库：`libs/lisen-auth`（本仓内的共享 Python 库，SSO handoff JWT + per-app session cookie 中间件）
- 边缘/训练：k3s（trainer 部署、GPU lease sidecar，`k8s/`）、Ollama（edge 本地 LLM）、vLLM（workstation LLM，plugin 形态）
- 发布：阿里云 Flow 流水线（`flow.yaml`）→ 打包 init bundle 上传 OSS（`bundle-manifest.json` 当前 `v0.0.91`）
- 中国特化：全链路阿里云/Artifactory 镜像源，禁清华/中科大源作前二优先级

---

## 2. 核心模块与数据流

### 2.1 节点三分与身份派发链

三类节点由 `lisen_env` 区分：`server` / `workstation` / `edge`（`docs/OPS_ARCHITECTURE.md § 二`）。单向派发链：

```
inventory (lisen_site_id, host groups: admin / edge)
   → group_vars/{admin,edge}.yml (lisen_env)
   → os_site_bootstrap role: assert site_id + 派生 device_id
       edge = Tegra UID (/sys/module/fuse_burn/parameters/tegra_chip_uid)
       workstation = /etc/machine-id
     固化到 /etc/lisen-site.conf + /etc/profile.d/lisen-site.sh
   → sre_dokku_global_vars role: combine(common, server_workstation, edge)
       dokku config:set --global LISEN_*=...
   → 所有 Dokku app 容器启动时自动继承 LISEN_* 节点级共享配置
```

**运行时 env 两层模型（AGENTS.md 硬规则 §7）**：节点级共享配置（`dokku config:show --global`，dokku-admin「共享配置」页）**优先**，app 自身 `app.json.env` 兜底。设备身份/IP/site/customer/node role 是 node facts，**硬禁止**写进任意 app.json（否则 registry/heartbeat/app env 三处 IP 打架）。

### 2.2 四层部署编排（`site.yml`）

`ansible/playbooks/site.yml` 用 `import_playbook` 串起四层：
- **Layer 0（os_*）**：系统基线——Docker、containerd、本地 registry seed、网络、防火墙、NVIDIA containerd、apt 弹性（`0-os.yml`）
- **Layer 2（dokku_*）**：Dokku 应用面——dokku_install / dokku_admin / dokku_plugins / dokku_postgres / dokku_apps（`2-dokku.yml`）
- **Layer 1（sre_*）**：就绪平台上的 SRE 操作——secrets 生成+应用、全局变量注入（`1-sre.yml`；备份/恢复/PITR 不自动跑，走 `1-sre.yml sre_action=backup`）
- **Layer 3（deploy）**：应用发现 → push → start → 健康检查（`3-deploy.yml`）
- 首尾还夹了对 `dsinfra-apt-update.timer` 的挂起/激活，防止 apt 自动更新与初始化竞争。

### 2.3 应用发现与部署链路（本仓最核心的真实机制）

- **声明式真相源**：每个 Dokku app 一份 `app.json`（`app.env` 已废弃）。`env` 节里 `LISEN_INFRA_*` 系列键（`LISEN_INFRA_POSTGRES_LINKS` / `_STORAGE_MOUNTS` / `_ATTACH_NETWORK` / `_PROXY_MODE` / `_REQUIRES_GPU` / `_REQUIRED_SECRETS` 等）由 Ansible 解析落到 Dokku 配置。实体证据：`dokku-apps/workstation-inference/app.json`、`dokku-apps/workstation-storage/app.json`。
- **发现**：`dokku_deploy/tasks/discover_app.yml` 在**远端** `/opt/lisen-infra/dokku-apps/*/app.json` 上 `find`+`slurp`+`from_json`，按 `lisen_env`(TARGET_ENVS) 和 GPU 可用性过滤，写入 `discovered_apps`。
- **部署唯一合法链路（层 2 铁律）**：ops 账号（`ops_engineer` 角色）→ `POST /@api/tokens` 换 JWT → `POST /@api/apps` 建 app → `git push --force http://127.0.0.1:3001/@git/<app>.git`，HTTP Basic `ops:<JWT>`。**禁 SSH 部署**。workstation 与 edge 走**同一条** `/@git/` HTTP 通道，差异仅在推送内容（源码树 vs 单行 `FROM <image>` Dockerfile）。
- **Cold/Hot path**：workstation=本地 build（`dokku_deploy`）；edge=镜像拉取（`dokku_deploy_image`，从 ACR 拉预构建镜像）。分叉点在 `site.yml` 按 `lisen_env`。

### 2.4 数据平面拓扑（一切归 PG）

**"一实例一业务库"铁律（F18）**：每个 Dokku PG 实例只服务 1 个业务库，本地装全套 11 扩展。`pg_net.database_name` / `cron.database_name` 两个实例级 GUC 必须同指业务库。这是 `lads.postgres.facade` 的 `t.ipush()` same-tx 原子语义的物理前提。

一台 workstation 上，PG 同时承担（历史上分散在 Kafka/etcd/ES/Redis 的能力全部收进 PG）：
- **消息队列**：pgmq（替代 Kafka）。app 通过 `USE_PGMQ=1 + DATABASE_URL` 收发。
- **配置中心**：config_store 表（替代 etcd）。
- **全文检索**：pg_trgm + zhparser 中文分词 + pgvector（替代 Elasticsearch，AGENTS.md 明确不再部署 ES/OpenSearch/Solr）。
- **知识图谱**：Apache AGE，图名 `lisen_knowledge`（`scripts/age_bootstrap.sql`）。
- **IM 推送**：pg_ipush 扩展，`SELECT ipush.send()`，是企业微信/飞书/钉钉 webhook 的唯一合规入口（F17，禁业务代码直调 `net.http_post`）。
- **控制面存储**：dokku-admin 的 `dokku_admin` 库（workstation）或嵌入式 SQLite（edge，F8/F15 按 `lisen_env` 硬分流，不可交叉）。

对外暴露面铁律：只暴露 dokku-admin(HTTP 3001) / Dokku PG(TCP 5432 + 控制面 API) / RustFS(S3 9000)；禁暴露 Docker daemon TCP、Kafka、Redis、ES、任意 app container port。

### 2.5 边缘设备 PGMQ 心跳合同（本仓离领域最近的运行时约定）

- topic `edge.operations.heartbeat`（队列 `edge_operations_heartbeat`），强类型 `HeartbeatPayload`（定义在 `lads` 仓，非本仓）。
- Producer interval 300s，Freshness SLO = 3×interval = 900s。时钟偏差 >900s 会误判 offline，故 F13 要求全节点 chrony 同步阿里云 NTP ≤1s。
- 首次 heartbeat 即注册（V2）：workstation-runtime consumer 遇未知 device_id 时 upsert 到 `ops_device` 表；`site_id/ip/device_type` 随包带上。
- DLQ 队列保留 7 天，pg_cron 每日 02:00 archive。

### 2.6 发布流水线

`flow.yaml`：向 `lisen-core` 分支 push 触发 → 跑 pytest 门禁 → `publish_lisen_infra_init_bundle.py` 把 `ansible/`+`dokku-apps/`+`scripts/`+`bundle-manifest.json` 打成 tarball 上传 OSS（不可变版本路径 + sha256 + latest.json + git tag）。plugin 与 dokku-admin 的 .deb 由各自子仓独立发布，本 bundle 刻意排除它们（apt 安装）。

---

## 3. 横向 vs 纵向归属

尺子："换掉整个横向框架/云厂商，这仓里的东西还留得下来吗？"

### 横向（通用工程能力，会被云厂商/开源抹平）——本仓绝大部分属于此列

| 内容 | 为什么是横向 |
|------|------------|
| Ansible role 编排（install/deploy/backup/restore/secrets） | 通用 IaC。换成 k8s Operator / Terraform / Helm 即被替代 |
| Dokku + dokku-admin 部署控制面 | 通用 PaaS 抽象。云上等价物 = ECS+ACK / Cloud Run / App Runner，一键抹平 |
| PG 生态大一统（pgmq/pgvector/AGE/pg_trgm 替代 Kafka/向量库/图库/ES） | 工程选型上的"省钱/降复杂度"决策，不是领域资产。RDS + 各托管服务可替代 |
| RustFS 对象存储 | 通用 S3 兼容层。换 OSS/S3 即替代 |
| init bundle 发布、镜像 ACR 同步契约、中国镜像源配置 | 纯交付工程 + 本地化运维，与工业 AI 领域无关 |
| lisen-auth SSO handoff JWT 库 | 通用认证工程 |
| k3s trainer / GPU lease sidecar | 通用 GPU 调度工程 |

**判据**：若把整套换成"阿里云 ACK + RDS PG + OSS + ACR + 云上 CI"，这仓 90% 的代码会被云托管服务吸收掉。它的价值是"在客户现场裸机/边缘盒子上，无云、弱网、国产化约束下把这套跑起来"——这是**交付/私有化部署的工程壁垒，不是产品护城河**。

### 纵向（承载不可迁移领域资产）——本仓只有薄薄几处痕迹，且真身多在子仓

| 内容 | 领域含量 | 备注 |
|------|---------|------|
| edge-collector OpenPLC/Modbus 采集规则（`scripts/edge-collector-openplc-snapshot.py`，规则文件 `rules-openplc-point-weld.yaml`「点焊」physics） | **中** | 出现了工业现场语义（Modbus 保持寄存器、点焊物理量注入），但规则实体在 edge-collector 子仓（未初始化） |
| 制造业 5 级层级链（`LISEN_FACTORY_KEY/WORKSHOP_KEY/PRODUCTION_LINE_KEY/STATION_KEY/DEVICE_CODE`，group_vars/all.yml:341-345） | **中** | 工厂→车间→产线→工位→设备的领域建模，edge-operations 启动强依赖 |
| `manufacturing_ops_role` + `muyuan` schema（`edge_intake_promotion`/`saga_failure`/`external_dead_letter`/`edge_inference_occurrence`/`manufacturing_backfill_progress` 表） | **中高** | `muyuan`(牧原) 指向真实客户现场 schema，含"边缘推理发生记录""制造回填进度"等领域表 |
| AGE 知识图谱 `lisen_knowledge` + 中文分词 zhparser | **低-中** | 领域知识资产化的**容器**已就位，但本仓只建空图/装扩展，图里装什么在业务仓 |
| edge 热路径"置信度递减链"最后兜底 = edge-ollama 本地 LLM（AGENTS.md app 表） | **中** | 暗示存在"多级推理+置信度降级"的领域推理管线，但实现不在本仓 |

**结论**：本仓是**横向为主、纵向痕迹极薄**的装配层。真正的纵向领域资产（采集规则、推理管线、制造层级、图谱内容）都被 submodule 化到业务子仓（edge-collector / edge-inference / edge-operations / workstation-runtime / dsclaw 等），本仓只负责"把它们连线部署"。**换掉横向框架后，本仓能留下来的只有：制造 5 级层级 env 约定、muyuan 现场表结构契约、edge 心跳/置信度链的运行时合同——这些是"接口/契约"层面的领域资产，本身不含算法/数据。**

---

## 4. 反馈闭环 / 数据资产痕迹

问："有没有沉淀 输入→推理→输出→实际结果→人工修正 这类反馈轨迹？有没有领域知识/评价/样本的资产化？"

**在本仓层面：基本没有闭环，只有闭环的"管道"和"痕迹"。** 逐项如实说明：

### 有痕迹的部分（管道级，非资产级）
1. **推理发生记录**：`muyuan.edge_inference_occurrence` 表（manufacturing_ops_role defaults 可写表清单）——说明系统会落"边缘推理发生"事件，这是"输出"的持久化痕迹。但表 schema 归 muyuan 现场，本仓只授权 CLI 读写，看不到字段与是否含 ground-truth/人工修正。
2. **死信与 Saga 失败**：`muyuan.saga_failure` / `external_dead_letter` / DLQ 队列（心跳 DLQ 保留 7 天）——错误轨迹的沉淀，属运维反馈而非领域反馈。
3. **回填进度**：`muyuan.manufacturing_backfill_progress`（只读）——暗示存在历史数据回填/补算流程。
4. **lads publish 10 阶段 pipeline（F16）**：bundle→released→agent_instance 落库 + RustFS 存 DAG/edge artifacts + `NOTIFY bundle_invalidate`——这是**模型/agent 发布**的资产化轨迹（DAG、edge model package、vector_index、age_graph、bpmn_workflow 等 10 类 RuntimeArtifact 白名单），最接近"资产化"的部分，但发布态资产不是"实际结果→人工修正"的评价闭环。
5. **RustFS bucket 布局**：workstation-{bundles,models,artifacts,dsclaw,inbox}——沉淀训练输出/模型包/DAG/边缘包。是**产物仓**，非反馈样本仓。

### 明确缺失的部分
- **没有** "推理输出 → 现场实际结果比对 → 人工标注修正 → 回流训练样本" 这一完整评价闭环的实现（至少在本仓不可见；`quick_annotation_workflow` 只在测试名 `test_quick_annotation_workflow_structure.py` 出现，实体在子仓）。
- **没有** 领域知识的评价/打分/样本资产表结构（AGE 图是空壳，向量库是能力不是内容）。
- 数据的"源头"（OpenPLC/Modbus 采集）和"归宿"（PG/RustFS）都在，中间的"推理质量→反馈→改进"链条在本仓**看不到闭合**。

**判断**：本仓提供了做反馈闭环所需的**全部基础设施插槽**（pgmq 事件流、inference_occurrence 落库、RustFS 样本存储、AGE 图谱、annotation workflow 钩子），但闭环本身的领域逻辑与数据资产**不在本仓沉淀**。作为"底座"这是合理的分层，但也意味着：单看这个仓，无法证明产品已经跑通"数据飞轮"。

---

## 5. 亮点 & 疑点

### 工程亮点
1. **PG 大一统的架构决断**：把 Kafka/etcd/ES/Redis/独立向量库/独立图库/IM sidecar 全部收敛进一个定制 PG 镜像（11 扩展）。对边缘单机盒子和私有化交付，这是极大的"依赖曲面收缩"——`t.ipush()` 的 same-tx 原子推送、跨事务联表查图+向量+事实表，是这个决断的红利。对工业现场弱运维环境非常务实。
2. **声明式 app.json 单一真相源 + 三层权威源冗余**（`APP_OWNERSHIP_CLASSIFICATION.md`）：`LISEN_APP_TYPE` 在 git(app.json) / dokku-admin DB / dokku config 三处锚定，丢库可从 git 重建。这种"意图与运行时事实分离 + 可重建"的设计成熟度高。
3. **统一 HTTP `/@git/` 部署通道**：workstation 与 edge 对称，弃 SSH per-user trust，全链路走 dokku-admin PG RBAC 可审计 ACL。对边缘盒子（无 SSH trust 基础设施）尤其合理。
4. **文档密度惊人**：AGENTS.md 把每个踩坑（F8-F18）连同 root cause、修复 commit、验证命令都记下来了（如 F13 时钟漂移、单架构 manifest 静默 amd64 落地陷阱、假成功陷阱 deploy-branch）。这是真实运维沉淀，不是 demo 文档。
5. **测试契约化**：`ansible/tests/` 有 60+ 个 contract test（如 `test_public_image_registry_variable_contract.py` 强制 registry host 只有单一变更点），把架构约束写成可执行断言。

### 疑点 / 风险
1. **凭据明文裸奔（P0，作者自陈）**：`docs/OPS_ARCHITECTURE.md § 七` 明说 8 份 inventory 中 7 份含明文 `ansible_ssh_pass: ubuntu2025`、`auth_token` 跨 site 硬编码、`dokku_admin_default_password: "lisen"`（group_vars/all.yml:348-349 印证 default 为 `lisen`）。凭据层成熟度自评仅 ⭐。这是私有化多现场交付的真实安全债。
2. **幂等性纪律缺失（P0）**：多处 `changed_when: false` 反模式，CI 无 `changed=0` gate，作者自评 ⭐⭐。
3. **Edge 离线能力名不副实（P1）**：有 fallback 但非真 air-gap，假设 admin registry 持续可达。工业边缘现场恰恰最需要真离线，这里"两头不到岸"。
4. **过度工程/复杂度爆炸的观感**：53 个 Ansible role、40+ playbook、11 个 PG 扩展、多层 env 优先级、submodule 多仓协作铁律、init bundle 发布链……对"单节点工作站+几个边缘盒子"的目标场景，编排复杂度偏高，强依赖 AGENTS.md 这本"运维圣经"才能不踩坑（F 系列债务本身就是复杂度的代价）。
5. **submodule 大面积未初始化**：当前 checkout 里 dokku-apps/dokku-plugins 绝大多数是空目录。虽是 submodule 正常现象，但意味着"整仓可复现部署"强依赖多个私有子仓同时可拉取 + `lisen-core` 分支对齐，任何一个子仓死指针（`reference is not a tree`）就断链。
6. **"假成功陷阱"被写进文档但未根治**：deploy-branch 非 master 会不 build 跑旧镜像却报 Deploy OK（README 部署链路小节）——靠人工核对 git_sha/镜像时间，无自动化护栏。
7. **领域绑定客户名进代码**：`muyuan`(牧原) schema 名直接进 role defaults。对多客户产品化，这种把单一现场 schema 硬编进底座的做法会累积耦合。
8. **`workstation-runtime` 名实分离**：本仓 `dokku-apps/workstation-runtime` 是历史 stub（无 app.json），真身在 `dsruntime` 仓——文档已注明，但目录留空易误导。

---

## 附：关键文件路径索引（本次实读证据）

- 主文档：`/Users/lijiayi/lianshan/agent/lisen-infra/AGENTS.md`（59KB，F8-F18 技术债 + 四层部署 + 层 0.5/1/2 铁律）
- 部署编排：`ansible/playbooks/site.yml`、`ansible/playbooks/{0-os,2-dokku,1-sre,3-deploy}.yml`
- 全局变量/端口/密钥：`ansible/inventories/group_vars/all.yml`（deploy_order、lisen_ports、secret_generators、制造 5 级 key）
- 应用声明实例：`dokku-apps/workstation-inference/app.json`、`dokku-apps/workstation-storage/app.json`
- 部署链路：`ansible/roles/dokku_deploy/`（discover_app.yml / deploy_app_via_api.yml）、`ansible/roles/dokku_deploy_image/`
- 数据平面：`docs/PG_IPUSH_DESIGN.md`、`scripts/age_bootstrap.sql`、`dokku-apps/migrations/README.md`
- 领域痕迹：`ansible/roles/manufacturing_ops_role/`（muyuan schema）、`scripts/edge-collector-openplc-snapshot.py`（OpenPLC/Modbus 点焊）
- 发布：`flow.yaml`、`bundle-manifest.json`、`scripts/publish_lisen_infra_init_bundle.py`
- 运维架构与债务：`docs/OPS_ARCHITECTURE.md`、`docs/APP_OWNERSHIP_CLASSIFICATION.md`
- 认证库：`libs/lisen-auth/README.md`

> 待深挖（子仓未初始化，本仓不可见）：edge-collector 采集规则实体、edge-inference 推理/规则引擎与置信度递减链、workstation-runtime(dsruntime) 的 lads publish 10 阶段实现、dokku-admin RBAC 细节、各 dokku-plugin 内部（postgres 镜像 Dockerfile、rustfs、vllm）、muyuan schema 完整表结构与是否含人工修正/ground-truth 字段。
</content>
</invoke>
