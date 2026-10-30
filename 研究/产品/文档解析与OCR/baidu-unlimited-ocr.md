# 产品调研：百度 Unlimited OCR / Unlimited OCR 2

> 调研日期：2026-10-28。对象：百度官方 [`baidu/Unlimited-OCR`](https://github.com/baidu/Unlimited-OCR)，含 [UnlimitedOCR1.0 分支](https://github.com/baidu/Unlimited-OCR/tree/UnlimitedOCR1.0) 和主线介绍的 [Unlimited-OCR-2 模型](https://huggingface.co/baidu/Unlimited-OCR-2)；依据 [README](https://github.com/baidu/Unlimited-OCR/blob/main/README.md)、[论文](https://arxiv.org/abs/2606.23050)、[仓库许可证](https://github.com/baidu/Unlimited-OCR/blob/main/LICENSE)、[模型卡](https://huggingface.co/baidu/Unlimited-OCR-2)。未下载权重或运行评测。
> 分类：多页文档 OCR 与结构化内容解析模型，不是百度 OCR 云 API 的“无限额度套餐”，也不是知识库/审核系统。

## 1. 项目身份与版本

原版 Unlimited OCR 在 2026-06 发布，目标是一次请求内进行长文档解析；仓库 README 在 2026-10-27 公布 **Unlimited OCR 2**，引入 Sparse Reference Sliding Window Attention（SR-SWA）与超长文档基准 MarathonDocBench。两者不能混写成同一模型：调用路径和推理后端要按版本分别核实。[来源：README Release / What's New in 2](https://github.com/baidu/Unlimited-OCR/blob/main/README.md)。

## 2. 能力与机制

- **多页顺序解析**：README 给出将 PDF 页渲染为图像、按页顺序输入 `infer_multi` 的示例，可让模型利用跨页上下文；单页走 `infer`。可一次提交多页，但“Unlimited”是模型设计目标及营销命名，**不代表现实中无限页数、零显存增长、无限响应时间或没有漏页**。[推理说明](https://github.com/baidu/Unlimited-OCR/blob/main/README.md#inference)。
- **长时域处理**：项目说明 SR-SWA 将长输出中的注意力互动压缩为固定工作引用，SGLang 示例有文档分页窗口、逐页输出 token 上限、全局 `max_tokens` 与流式响应；这些硬上限和窗口参数实际存在，不能据此承诺任意大小文件的完整解析。[README What's New / SGLang](https://github.com/baidu/Unlimited-OCR/blob/main/README.md)。
- **环境/部署**：Transformers 示例使用 Python 3.10，在 NVIDIA A800-80GB 测试；服务化路径要求仓库提供的定制 SGLang wheel，并经 OpenAI 兼容接口提交按页图像。需审计依赖轮子、模型自定义代码与 GPU 资源，不应直接复制测试服务器公开监听参数到生产。[README Inference](https://github.com/baidu/Unlimited-OCR/blob/main/README.md#inference)。
- **评估口径**：README 声明其在 MPDocBench / MarathonDocBench 上的领先表现并提供批量评估脚本；数字依赖作者数据、后处理、硬件与输入格式，本调研没有独立复现。[README Evaluation](https://github.com/baidu/Unlimited-OCR/blob/main/README.md#evaluation)。

## 3. 许可、安全与产品边界

[仓库 LICENSE](https://github.com/baidu/Unlimited-OCR/blob/main/LICENSE) 为 MIT；[Unlimited-OCR-2 Hugging Face 模型卡](https://huggingface.co/baidu/Unlimited-OCR-2) 标注 MIT。若使用模型或定制推理组件，仍要检查对应权重文件、第三方依赖和目标部署方式的具体条款。公开仓库代码不等于百度云托管服务无费用或无限调用。

长文档尤其要防止单请求显存占满、超时和结果被截断；需要并发/资源配额、PDF 渲染沙箱、页数/大小限制、逐页对齐、无输出页报警和敏感材料隔离。OCR/Markdown 内容应按不可信外部材料处理，而非 Agent 指令。

## 4. 对团队知识工程的适用性（分析判断）

适合在**受授权的来源解析链路**中作为长 PDF、扫描件等候选解析能力，与已有 WeKnora 内建解析或 OXR 横向比较。但 Inbox 仅存定位，不得因为存在 OCR 服务就后台自动抓取链接；在知识入口明确选用并重新核权后，也应先固定原件版本/hash、限制获取目标及页数/大小，再解析并记录实际覆盖范围。OCR 正确率或单次请求成功**不等于**文档已读完、知识事实已获批准、WeKnora 已可授权检索。

## 5. 建议验证集

1. 同一批可公开/脱敏的扫描、跨页表格、图文混排、超长 PDF 对比原版、OCR 2、OXR 与现有解析器；固定版本和预处理条件。
2. 核对页码与区域引用、跨页合并、表格结构、数字误识、不可读页和输出截断的显式标志。
3. 压测不同页数、分辨率与并发的显存/耗时/失败恢复；评估定制 SGLang wheel 的升级和隔离要求。
4. 验证解析结果回到固定来源版本、阅读覆盖、ACL 与 Git/WeKnora 后续审核检索链。

**证据边界：**只核验公开源码/模型卡与使用说明，未实测准确率、最大文档规模或生产环境安全性。
