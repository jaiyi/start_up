# 05 · edge-inference（连山 Monday 边缘推理应用）结构分析

> 仓库：`/Users/lijiayi/lianshan/agent/dokku-edge-inference-app`
> 阅读方式：全仓通读（约 42 文件，核心 `edge_inference/` 15 个模块全部实读），结论均给出文件与代码证据。

---

## 1. 一句话定位 + 技术栈

**一句话定位**：这是「连山 Monday」edge 三件套（collector 感知 / **inference 计算** / executer 执行）中的**计算节点**——一个跑在边缘设备（含 Jetson）上的**工业视觉 AOI 推理服务**，固定职责就是「**接推理请求 → 跑 pipeline（预处理 letterbox → 模型推理 → YOLO 后处理/NMS → 良否判定）→ 返回或落库结果**」，本身不发业务消息、不做 portal sync（`README.md:6-11`、`AGENTS.md:3-5`）。

**技术栈**（`AGENTS.md:5`、`requirements.txt`、`Dockerfile*`）：
- 语言/运行时：Python ≥ 3.11，`uvicorn edge_inference.app:app` 启动，FastAPI HTTP 层。
- Web：`fastapi>=0.111` + `uvicorn>=0.30`。
- 推理运行时：`torch==2.7.1`（**CPU wheel**）+ `onnxruntime`（CPU EP，amd64/arm64 通用）+ `joblib`（sklearn）；`.pt/.pth` 经 lads `TorchModelLoader` 加载、`.onnx` 走 onnxruntime。
- 领域框架：**`lads`**（连山自研，vendored/私有 PyPI wheel，`lads==3.38.1`，`--no-deps` 安装）——提供 `EdgeInferenceEngine`、`EdgePipelineRunner`、`PipelineDefinition`、`VisionOutputSchema` 等（`engine.py:19-24`、`core.py:528`、`base.py:83-98`）。
- 视觉计算：`numpy`（手写 NMS）、`Pillow`（letterbox 预处理）、`opencv-python-headless`（lads postprocess 包 `__init__` 强制 import cv2，`Dockerfile:54-57`）。
- 存储/总线：**共享 SQLite**（`/shared/db/edge-data.db`，WAL），经私有 wheel `lisen-edge-shared` 的 `client` 读写；**本仓是 NON-OWNER**——schema 由 edge-operation 拥有，本仓只 `check_head` 校验后读写（`shared_db.py`、`requirements.txt:5-11`）。
- 日志：`loguru`（非 stdlib logging，`AGENTS.md:21`）。
- 部署：Dokku + Ansible（`app.json`），双层 Docker 镜像——`Dockerfile.base`(amd64)/`Dockerfile.base.jetson`(arm64) 烘焙重依赖，`Dockerfile` 只叠 lads wheel + 源码（~15MB，秒级部署）；CI 走阿里云效 Flow（`flow.yaml`）。

---

## 2. 核心模块与数据流

### 2.1 双 ingress 单核心架构（设计核心）

一个 `InferenceCore` + 两条入口 adapter（`README.md:13-59`、`app.py`、`core.py`）：

```
                        ┌─────────── edge-inference 进程 ───────────┐
 同步 RPC（CI/调试/重放）  │  FastAPI  POST /api/v1/infer              │
 ───────────────────────▶ │      │  (不写 inference_results/不入下游) │──▶ 完整 payload 返回调用方
                        │      ▼                                   │
                        │   InferenceCore.run_pipeline ──────────┼──▶ EdgePipelineRunner（lads）──▶ 模型
                        │      ▲                                   │
 异步批处理（生产主链路）   │  sqlite_bus 消费者线程                    │
 collector ─insert────▶ │  claim_jobs → run_pipeline → record_result │──▶ 落 inference_results
 inference_jobs 表        │  (唯一落库路径)                           │      ▲ reporter 读表发 pgmq
                        └────────────────────────────────────────┘
```

**严格出口分离**（`README.md:38-52`、`app.py:503-644`）：
- HTTP `/api/v1/infer` 是**同步调试/CI/手工重放通道**——不写 `inference_results`、不发 pgmq、不入 executer/workstation 管道，只在 response body 返回**完整** `run_pipeline` payload（含 `step_results`/`context`/v2 discriminator）。业务错误映射 4xx/5xx（rejected→400，error→500，warmup 未完成→503）。
- **sqlite_bus 消费者是进程内唯一落 `inference_results` 的代码路径**（`app.py:333-359` `_shape_result_for_sqlite`，v2 精简为 4 键、v1 verbatim），避免「幽灵结果」双发布。reporter（在别的仓）再读表发 `edge.inference.results`。
- 历史注：早期用 pgmq 双 topic，现已被 sqlite_bus 取代，`app.json` 里那批 `INFERENCE_PGMQ_*` env 仅留占位、运行期不读（`README.md:174-184`）。

### 2.2 边缘侧跑什么（真实业务：工业视觉 AOI）

实读 `vision_ops/`，这不是抽象「通用推理」，而是**具体的 YOLO 目标检测 AOI（自动光学检测）质检流水线**：

1. **预处理 `preprocess_handler`**（`detect.py:65-77` → `base.py:36-75`）：`letterbox_preprocess` 把图片等比缩放 + 灰边填充 `(114,114,114)` 到 `imgsz×imgsz`（默认 1280），归一化到 NCHW float32 tensor，记录 `scale/pad_x/pad_y` 供反算坐标。
2. **推理 `_default` handler**（`app.py:100-119`）：从 step config 取 `project_id`/`model_ref`，调 `engine.run_inference` → lads `EdgeInferenceEngine.infer`，输出 raw tensor（`output0`）。
3. **后处理 `postprocess_handler`**（`detect.py:80-136` → `_legacy_v1.py`）：**手写 numpy YOLO NMS**（`_nms_indices` 贪心 NMS + 类间偏移 `classes_l*10000` 做 class-aware，`_legacy_v1.py:24-148`），把 letterbox 坐标反算回原图坐标，产出 detections。这里明确**不用 lads 官方 postprocess**，因为那条路径要 ultralytics `Results` 对象，而边缘的 ONNX/.pt loader 只返回裸 numpy（`detect.py:1-8` 注释）。
4. **良否判定 `default_ng_rule`**（`base.py:101-118`）：**至少一个检出 confidence ≥ 阈值 → OK；否则 → NG，`result_detail='无检出'`, `ng_reason='no_detection'`**。这是明确的工业质检语义（中文 result_detail）。
5. **组装成 lads `VisionOutputSchema`**（`base.py:160-227` `assemble_vision_report`）：产出带 `test_status`(OK/NG)、`export_value`（含 `test_endtime`/`dt` 等 8 字段）、`tasks_key`（含 image_size h/w + detection pred）的 v2 领域 wire，供下游 workstation/reporter 消费。

支持任务类型（`core.py:466-468`）：`classify / detect / obb / segment / ocr_det / ocr_rec`——覆盖工业视觉全套（分类、检测、旋转框、分割、OCR 检测/识别），但仓内实读只实现了 **detect** handler（其余为 schema 预留）。

### 2.3 模型从哪来 / 怎么加载

**文件系统驱动，全部只读挂载**（`README.md:136-152`、`app.json:53-60`、`engine.py`）：
- 模型目录 `/app/models/<project_id>/{models/权重, pipelines/<pipeline_id>.yaml}`，由 edge-operation 的 puller 在 deploy 阶段原子写入，**inference 只 `:ro` 读**（`app.json:54`）。
- `InferenceEngine.load_project_models`（`engine.py:165-403`）递归 `rglob` 扫模型文件，按扩展名偏好排序（**`.onnx` 优先于 `.pt`**，因边缘要确定性 shape 无需 torch model class，`engine.py:42-58`），`create_handler_for_file` 自动选 loader，注册进 lads engine；用 **mtime 缓存**判断是否需要热重载（`engine.py:270-277`）。
- **热重载三重机制**：
  - `ModelWatcher`（watchdog）监听 `.bundle_version.txt` marker（puller 最后写的「全量落地」信号），低延迟触发重载（`watcher.py:47-101`）；
  - `MarkerPoller`（60s 轮询）兜底 watchdog 漏事件，并处理目录消失时的 unregister（`watcher.py:204-366`）；
  - `Reconciler`（60s）以 SQLite `lifecycle_state` 为准，决策 load/unload（`reconciler.py`）。
- **启动 `core.warmup()`** 主动预加载所有 project 模型 + 索引 pipeline，避免首个请求命中冷模型（`core.py:177-222`、`app.py:406-410`）。

### 2.4 推理结果去哪

- **HTTP 路径**：结果只在 response body 返回，**不落库不下游**。
- **sqlite_bus 路径**：`record_result` 写 `inference_results` 表 + `mark_job_done`（`sqlite_bus.py:124-159`）；reporter（外部仓）读表发 pgmq `edge.inference.results` → executer 消费决定动作（`README.md:259-263`）。
- 落库前经 `_sanitize_json_safe`（`core.py:73-127`）把 numpy tensor 换成 descriptor，且对超 1024 长的 list 做 `trimmed_list` 截断（防止 `.tolist()` 逃逸的大 tensor 撑爆 SQLite——注释记录了一次 nano44 上 4 分钟涨 557MB 的真实事故，`core.py:54-70`）。

### 2.5 和物理设备/传感器怎么对接（关键判断点）

**这是本仓与物理世界耦合最弱的一环**。实读所有代码：
- inference **不直接碰任何相机、传感器、执行器、GPIO、串口**。它的输入是**已经落盘的图片文件路径** `image_path`（`core.py:301-310`、`schemas.py:41-58`），图片由 **collector**（另一个仓）通过共享卷 `/shared/inbox`（`:ro`）落盘、经共享 SQLite `inference_jobs` 表投递。
- 图片按**引用（容器内绝对路径）传递而非字节**，靠 host bind mount 让 collector（rw）和 inference（ro）看到同一文件（`README.md:61-78`）。
- HTTP 入口对 `image_path` 做 sandbox 校验：必须绝对路径 + resolve 后落在 inbox 内（防目录穿越/软链越权，`app.py:550-600`）。
- 与「设备」相关的只有元数据层面：`app.json` 里 `LISEN_DEVICE_ID/SITE_ID/DEVICE_IP/DEVICE_TYPE` 等，通过 `/api/v1/status` 回显（`app.py:463-471`、`config.py:46-77`），纯身份标签，无设备控制/读取逻辑。

**结论**：本仓是「图片文件进、结构化质检结果出」的纯计算节点。**传感器接入（相机取流/落图）在 collector，执行器动作在 executer，标定/闭环也不在本仓。**

---

## 3. 横向 vs 纵向归属

**尺子：换掉横向框架还留得下什么？**

### 属于「横向」（通用推理部署脚手架，可迁移）的部分——占绝大多数

- 双 ingress 单核心、sqlite_bus 消费循环、warmup、watchdog+poller+reconciler 三重热重载、mtime 缓存、JSON sanitize、健康检查、多 worker factory——这一整套是**「边缘 ML 模型的文件系统驱动加载 + 队列/HTTP 推理服务」的通用脚手架**。换任何模型、任何行业都能用，本质是「把 lads 模型跑起来并管好生命周期」。
- `InferenceEngine`/`PipelineRegistry`/`ModelWatcher`/`Reconciler`/`sqlite_bus`/`lifecycle_gate` 全是与业务无关的编排/运维代码。

### 属于「纵向」（不可迁移的行业资产）的部分——少而具体

- **工业视觉 AOI 的良否判定语义**：`default_ng_rule`「无检出即 NG」、`VisionOutputSchema` 的 `test_status`/`result_detail=无检出`/`export_value` 8 字段结构（`base.py:101-227`）——这是连山对接工厂 MES/质检系统的领域契约，不是通用推理框架自带的。
- **lads `VisionOutputSchema` 领域 wire 契约**（v2 discriminator：`vision_task_type/vision_report/execution/model_ref`）——这是连山工业视觉平台内部跨服务（inference→reporter→workstation）的私有数据契约，绑定 lads（`core.py:466-559`、`app.py:333-359`）。
- **edge 三件套的协作契约**（`inference_jobs`/`inference_results` 表 + lifecycle_state 状态机 + 只读模型挂载 + collector/executer 分工）——这是连山边缘工业部署形态的固化，非通用。

### 是否触及「与物理设备的闭环/标定」这一不可迁移纵向资产？

**基本没有。** 这是本次分析对该仓最重要的判断：
- 本仓**不接触真实传感器、真实执行器**，也**没有任何标定/漂移校准逻辑**。它离物理世界隔了一层（collector 落的图片文件）。
- 唯一能勉强算「物理耦合」的是 `letterbox_meta` 的 `scale/pad_x/pad_y` 坐标反算（`_legacy_v1.py:120-142`），但那只是图像几何变换的逆运算，不是相机内参标定、不是传感器漂移补偿。
- `default_ng_rule` 注释里提到「Bundle YAML 未来可覆盖为 config 配置的 callable」（`base.py:110-113`），说明良否阈值/规则**目前是硬编码默认值**，尚无现场标定/整定的旋钮化。

**综合归属**：**这个仓 85%+ 是横向的边缘推理部署脚手架**，纵向资产集中在「工业视觉良否判定语义 + lads 领域 wire 契约 + edge 三件套协作契约」这三点软件契约上。**它不是「与物理设备的闭环/标定」类不可迁移资产的承载仓**——那类资产（真实传感器、执行器、算力模拟不出的漂移/标定）如果存在于连山体系，应在 collector（取流/落图）或 executer（执行动作）或更底层的设备驱动/标定仓，而非 inference。

---

## 4. 反馈闭环 / 数据资产痕迹

**结论：本仓有「结果回流」的痕迹，但没有「与真实结果对比、标定校准」的闭环。**

有回流痕迹的部分：
- 推理结果经 sqlite_bus `record_result` 落 `inference_results` 表（`sqlite_bus.py:124-159`），带 `shadow`（影子模式）、`bundle_version`（哪个模型版本产出的）、`latency_ms`——这些字段为「结果可回溯到模型版本」打了基础。
- **lifecycle_gate 的 shadow 机制**（`lifecycle_gate.py:44-68`、`app.py:256-294`）：`deployed` 状态 → `shadow=True`（结果照跑照落但标记为影子，不进生产决策），`published` → `shadow=False`（正式生效）。**这是灰度/影子发布的骨架**，理论上可支撑「新模型影子跑一段、和线上对比再切换」的评估闭环——但**对比逻辑本身不在本仓**，本仓只负责打 shadow 标记并落库。
- `execution` 字段带 `lifecycle_state`/`should_publish`/`duration_ms`/`step_count`（`core.py:551-559`），有可观测性数据资产的雏形。
- `bundle_manifest` 回写 `engine_loaded_at`/`engine_load_error`（`engine.py:520-577`）——模型加载回执，运维层的反馈，非质量反馈。

**缺失的闭环**：
- **没有** ground-truth 对比、人工复判回流、误检/漏检统计、模型精度漂移监控、阈值自动整定等任何「推理结果 vs 真实结果」的校准机制。
- `default_ng_rule` 是静态规则，无基于历史反馈的自适应。
- 数据资产层面：结果落 SQLite 表是「原始事件流」，真正的「标注数据资产 / 反馈闭环」（若存在）应在上游 workstation/portal 侧沉淀，本仓只是生产者。

**判断**：本仓提供了反馈闭环所需的**数据出口和影子发布骨架**，但闭环的「对比、评估、校准、再训练触发」环节都不在此仓。它是数据资产的**采集点/生产者**，不是**闭环的决策点**。

---

## 5. 亮点 & 疑点

### 亮点

1. **出口分离设计干净且有事故驱动的严谨**：HTTP 只读通道 vs sqlite_bus 唯一落库路径，「避免幽灵结果双发布」的约束贯彻到底（`core.py:9-14`、`app.py:520-534`）。`_sanitize_json_safe` 的 `_LARGE_LIST_THRESHOLD=1024` 截断带真实事故注释（nano44 4 分钟涨 557MB，`core.py:54-70`），说明是踩坑后加固的。
2. **热重载三重冗余 + 原子性考量到位**：只监听 puller 最后写的 marker（而非每个文件写事件，避免半量加载）；`rglob`/`iterdir` 全程 try `FileNotFoundError` 应对并发 activator swap（`engine.py:225-240`、`pipeline_registry.py:100-121`）；YAML 读取带短重试防半写（`pipeline_registry.py:214-242`）。工程成熟度高。
3. **边缘算力务实**：全链路 CPU-only（torch CPU wheel + onnxruntime CPU EP），明确记录 Jetson JP5/CUDA 11.4 上没 cp311 GPU wheel 的现实约束，选择「CPU 直到 JP6 升级」而非硬上 GPU（`Dockerfile.base.jetson:10-20`、`AGENTS.md:5`）。双层镜像让部署只重建 ~15MB。
4. **NON-OWNER SQLite 消费者边界清晰**：不 own schema、不跑 alembic、只 `check_head` fail-fast（`shared_db.py`），职责收敛，符合 edge 无独立 PG 的硬约束。
5. **纯函数 gate + I/O adapter 分离**：`lifecycle_gate.apply_gate` 无副作用可单测，`lifecycle_reader` 是薄 I/O 层（`lifecycle_gate.py:14-15`），可测性设计好。测试覆盖充分（24 个测试文件 vs 15 个源文件，含 boot smoke、CI contract、私有 PyPI build contract）。

### 疑点 / 待深挖

1. **Jetson「边缘 GPU」名不副实**：仓名和 Dockerfile 都指向 Jetson，但**实际全程 CPU 推理**，Jetson 的 GPU/CUDA 完全没用上（`Dockerfile.base.jetson:11-20`、`app.json:82` `LISEN_INFRA_REQUIRES_GPU=false`）。所谓「边缘 GPU 推理」目前是「边缘 CPU 推理」，GPU 是 JP6 后的 TODO。**若产品对外宣称 Jetson GPU 加速，需核实。**
2. **多 worker 未验证**：`app.json:28-31` 明说 `UVICORN_WORKERS=1`，多 worker「sizing 是 future work」，且每 worker 各自起 engine/watcher/reconciler/sqlite_bus——多 worker 下 sqlite_bus 并发 claim、内存翻倍、日志交织都是未收尾项。**生产实际并发能力待深挖。**
3. **`inference_jobs`/`inference_results`/`bundle_manifest`/`dsapp_lifecycle_state` 的表 schema 不在本仓**（由 `lisen-edge-shared` wheel + edge-operation 拥有），本仓只按字段名读写。**完整数据契约需读 edge-shared 仓才能确认。** 标注「待深挖」。
4. **良否规则硬编码**：`default_ng_rule` 只有「无检出=NG」一条默认规则，注释说未来可 config 覆盖但**尚未实现**（`base.py:110-113`）。真实工厂质检规则远比这复杂（尺寸/位置/数量/类别组合判定），当前实现偏 demo。**现场是否另有规则注入路径待深挖。**
5. **`run_inference` 里未见真实模型 forward 的确认**：`_default` handler 调 lads `EdgeInferenceEngine.infer`，但 lads 是私有 wheel，`create_handler_for_file` 对 `.onnx`/`.pt` 究竟如何 forward（尤其 `.pt` 注释说「only loads state_dict」不能 forward，`engine.py:44-48`）——**实际 .pt 权重能否真跑通推理存疑**，代码偏好 `.onnx` 恰恰暗示 `.pt` 路径可能不完整。标注「待深挖 lads 内部」。
6. **examples/README 提到的 `pipelines.yaml` 路由表、`ImageWatcher`** 在当前代码里已删除（v2.0 删了 `image_watcher.py`，`README.md:268`），examples/README 部分内容与现状脱节（`examples/README.md:12-23` 描述的 ImageWatcher 已不存在于本仓，属 collector 侧职责）。**文档滞后。**

---

**关键文件索引**（绝对路径）：
- 双 ingress 装配 / HTTP 端点：`/Users/lijiayi/lianshan/agent/dokku-edge-inference-app/edge_inference/app.py`
- 统一推理核心 + JSON sanitize + v2 lift：`.../edge_inference/core.py`
- 模型加载/热重载引擎：`.../edge_inference/engine.py`
- 视觉业务（letterbox/NMS/良否判定/VisionOutputSchema）：`.../edge_inference/vision_ops/{detect.py,base.py,_legacy_v1.py}`
- sqlite 消费循环：`.../edge_inference/sqlite_bus.py`
- 热重载 watcher/poller：`.../edge_inference/watcher.py`；生命周期收敛：`.../edge_inference/reconciler.py`
- 生命周期 gate（纯函数）/reader：`.../edge_inference/{lifecycle_gate.py,lifecycle_reader.py}`
- Jetson/边缘构建：`.../Dockerfile.base.jetson`、`.../scripts/build-base.sh`
- 部署配置：`.../app.json`；CI：`.../flow.yaml`
