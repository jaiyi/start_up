# 产品调研：SoMark OXR 文档解析模型

> 调研日期：2026-10-28。对象：SoMark 团队的 [OXR 官方仓库](https://github.com/SoMarkAI/OXR)、[中文 README](https://github.com/SoMarkAI/OXR/blob/main/README_CN.md)、[部署说明](https://github.com/SoMarkAI/OXR/blob/main/README.md)、[自定义许可证](https://github.com/SoMarkAI/OXR/blob/main/LICENSE)；未部署、未独立运行基准。
> 名称澄清：**SoMark 是团队/文档智能产品体系，OXR（Optical Everything Recognition）是其开放模型及解析服务**；不是两个独立的待调研项目。分类：文档解析 / OCR / 结构化内容抽取。

## 1. 产品定位

OXR 是 SoMark 团队发布的 1.3B 参数文档解析模型，面向 PDF 与文档图片输出适合 Agent 使用的 Markdown / JSON，并附元素版面坐标。项目列出文本、标题、表格、公式、图像、化学式/结构、代码等 13 类元素，强调阅读顺序和复杂布局。开发方宣称其在多个公开基准表现领先；**这些是项目自报结果，本次未复现，不应写成独立验证的 SOTA 结论**。[来源：README](https://github.com/SoMarkAI/OXR/blob/main/README.md) · [基准与复现指南](https://github.com/SoMarkAI/OXR/blob/main/docs/benchmark.md)。

## 2. 技术与集成方式

| 能力 | 官方资料可确认的设计 | 集成边界 |
|---|---|---|
| 版面 + 识别 | 版面分析模块独立可替换；OXR 负责内容识别及阅读顺序；输出 Markdown/JSON 与坐标 | 换版面模型后须重新检验字段类别和坐标映射，不能只比较文本相似度 |
| 本地服务 | 仓库提供容器一体化路径，或分别启动 OXR 模型服务、版面服务和解析 API；当前官方 vLLM 发行版不直接支持 OXR 推理，README 给出额外插件 | 官方写明 NVIDIA GPU BF16，单卡 24GB 用于低并发入门、≥48GB 用于长文档/高并发建议；属于项目部署条件，未本机确认 |
| 调用 | 解析端点示例 `/v1/parse/sync` 支持上传文档及 `markdown`/`json` 输出；服务与 SoMark 的 SDK/CLI 接口兼容但**不支持全部专用功能** | 兼容请求格式不意味着第三方 SaaS 权限/可用性或解析质量相同；生产调用须控制输入大小、文件类型、处理时限及结果存留 |
| 展示 | 本地 `/demo` 显示原文、Markdown、源内容、框选坐标与阅读顺序 | demo 缓存会过期，不应当作持久原件管理或可靠引用仓库 |

[来源：官方英文 README 的部署与调用说明](https://github.com/SoMarkAI/OXR/blob/main/README.md)。[SoMarkDown](https://github.com/SoMarkAI/SoMarkDown) 是生态内的 Markdown 扩展渲染库，不应与 OXR 模型本体混同。

## 3. 许可与安全

**不能只看“open-source”字样就按 Apache-2.0 使用。**[OXR License](https://github.com/SoMarkAI/OXR/blob/main/LICENSE) 是以 Apache-2.0 为基础附加条款的自定义许可：达到一定融资额或年收入门槛的商业使用需另获商业许可；提供对外在线服务须标示 SoMark OXR；未经许可不得提供与 SoMark 托管 API 竞争的服务。内部使用与对外服务的条款并不相同，部署前应让法务结合实际主体和用途审核。模型权重、附属组件也要分别核对适用许可。

文档可能含个人信息或敏感合同；本地推理也需验证容器镜像来源、文件上传、临时缓存、结果清理、日志脱敏及模型插件供应链。解析出的 Markdown 不是可信指令，进入 LLM 前须按不可信材料隔离。

## 4. 对团队知识工程的启示（推断）

OXR 可作为**可选的受限解析器候选**，帮助将有权的复杂 PDF、表格、扫描文件变成可追溯的结构化候选材料；并非自动审定知识的来源权威。R-09 已确定 Inbox 仅存有权链接、不自动抓取；成员在“提炼知识&经验”明确选用链接、重新核权且受限获取/解析通过后才允许抓固定版本。OXR 如接入该链路，输出仍须回扣原文件版本/hash、页码与区域坐标、阅读覆盖与失败区域；入库和发布继续受团队审核门禁控制。

## 5. 待验证

1. 用脱敏合成的扫描件、跨页表格、复杂公式和混排文件测准确率、阅读顺序、坐标、漏页与失败可见性。
2. 校验容器/权重/额外推理插件的完整性与许可证；测资源、吞吐、长文档上限和隔离故障。
3. 对照 WeKnora 当前解析能力，确认替换/补充关系、索引引用如何追溯到固定原件页区；不能仅凭漂亮的 Markdown 宣称满足证据锚点要求。

**证据边界：**未安装、上传文件、运行模型或验证在线免费 API 的服务承诺。
