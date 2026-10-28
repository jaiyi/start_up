# 产品调研：Chronos Forecasting（Amazon 时序预测模型家族）

> 调研日期：2026-10-28；官方仓库源码快照：[1224fafa](https://github.com/amazon-science/chronos-forecasting/tree/1224fafa91e1ecd6674f5204066b159e40b5e4a1)。
> 对象：[amazon-science/chronos-forecasting](https://github.com/amazon-science/chronos-forecasting)；配套案例：[基于 Amazon SageMaker AI 部署 Chronos-Bolt 实现零样本时序预测](https://aws.amazon.com/cn/blogs/china/sagemaker-ai-deploy-chronos-bolt-implement-prediction/)（AWS 中国博客，页面发表时间 2026-07-24）。
> 方法与边界：只读核对官方仓库、模型卡、论文、AWS 博客及部署示例；**未安装模型、未执行推理、未部署 SageMaker、未复现论文基准或验证中国区域可用性**。模型效果与云成本数字均是来源方报告或示例，不是本次实测。
> 分类判断：放在 `工业AI/` 作为制造业时序预测能力的外部技术参照；它是**预测模型与推理工具包**，不是 SPC 判异系统、根因诊断 Agent、知识库或完整工业 AI 平台。

## 1. 定位与核心价值

Chronos 将历史时序输入预训练模型，直接给出未来若干时间步的预测，无须先针对每条新序列训练专用模型（**零样本预测**）；也可以进一步微调。输入是按采样间隔排列的数值序列，输出可以是采样轨迹或概率分位数，适合建立需求、设备指标、能耗、产量、过程参数等连续量的预测基线。零样本不代表无需数据清洗、时间粒度约定、业务校验和回测，也不代表预测的分位数已在某个工厂数据上校准。[原始论文](https://arxiv.org/abs/2403.07815)、[仓库 README](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/README.md)。

### 模型家族不要混为一谈

| 模型 | 机制与原生输入 | 原生输出 | 官方示例检查点的窗口 / 训练预测长度 |
|---|---|---|---|
| Chronos-T5 | T5 编码器—解码器；缩放并离散化为 token，自回归采样；单变量预测，可批量处理多条**相互独立**的序列 | 多条未来样本路径，可从样本估计分位数 | `amazon/chronos-t5-base`：512 / 64；[模型卡](https://huggingface.co/amazon/chronos-t5-base)、[配置](https://huggingface.co/amazon/chronos-t5-base/blob/main/config.json) |
| Chronos-Bolt | 连续值 patch、T5 编码器—解码器，直接预测未来多个步长；**无原生联合多变量/协变量输入** | 直接预测 0.1–0.9 的九个分位数 | `amazon/chronos-bolt-base`：2,048 / 64；[模型卡](https://huggingface.co/amazon/chronos-bolt-base)、[配置](https://huggingface.co/amazon/chronos-bolt-base/blob/main/config.json) |
| Chronos-2 | 约 1.2 亿参数的 encoder-only、连续值 patch；原生单变量、联合多变量以及历史/已知未来的数值或类别协变量；可选跨序列 cross-learning | 直接预测 21 个分位数 | `amazon/chronos-2`：8,192 / 1,024；[模型卡](https://huggingface.co/amazon/chronos-2)、[配置](https://huggingface.co/amazon/chronos-2/blob/main/config.json)、[论文](https://arxiv.org/abs/2510.15821) |

这里的上下文长度与训练预测长度是**所列检查点的配置**，不是所有规模/版本的统一上限；超出训练长度可以分段递推，但源码警告预测质量可能降低、推理成本可能上升。[T5 实现](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos.py)、[Bolt 实现](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos_bolt.py)、[Chronos-2 推理](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/pipeline.py)。Bolt 可由 **AutoGluon 外部协变量回归器**配合未来已知特征，但不可将这一组合方案写成 Bolt 模型本身的原生联合多变量预测；Chronos-2 才原生提供相应接口。[旧版 Bolt 部署示例](https://github.com/amazon-science/chronos-forecasting/blob/v1.5.3/notebooks/deploy-chronos-bolt-to-amazon-sagemaker.ipynb)、[Chronos-2 模型卡](https://huggingface.co/amazon/chronos-2)。

## 2. 现有接口与实际输出口径

- Python 包名为 `chronos-forecasting`，源码快照 `main` 中声明 `2.3.3.dev0`；核对时已发布版本为 [`v2.3.2`](https://github.com/amazon-science/chronos-forecasting/releases/tag/v2.3.2)（2026-09-08）。[PyPI](https://pypi.org/project/chronos-forecasting/)、[源码版本文件](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/__about__.py)。仓库声明 Python ≥3.10、PyTorch ≥2.2 且 <3、Transformers ≥4.41 且 <6；仓库及所述官方模型卡为 Apache-2.0，企业使用仍需逐个核查选用权重及依赖许可。[项目配置](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/pyproject.toml)、[LICENSE](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/LICENSE)。
- T5 的 `predict` 返回 `(batch, samples, horizon)`；Bolt 的 `predict` 返回 `(batch, quantiles, horizon)`；Chronos-2 的 `predict` 返回按任务组织的张量列表，每项 `(variates, quantiles, horizon)`。不要把这些轴或“多条序列的批量预测”误作相同的多变量建模能力。[T5 源码](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos.py#L430-L533)、[Bolt 源码](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos_bolt.py#L504-L648)、[Chronos-2 源码](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/pipeline.py#L467-L563)。
- Chronos-2 `predict_df` 接受长表历史数据、可选 `future_df`、单/多目标字段；随历史数据提供的附加列可用作过去协变量，未来已知的协变量须提供于未来数据。输出包含对象标识、未来时间、目标名、预测值与所请求分位数；结构化任务的目标维度、协变量键有输入约束，不能假设任意缺列自动兼容。[DataFrame API](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/pipeline.py#L822-L962)、[预处理](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/preprocess.py)。T5/Bolt 共用的旧 `predict_df` 仅预测单一目标，其他列并非自动用作原生协变量。[基类实现](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/base.py#L136-L245)。
- 旧 Bolt 和 Chronos-2 的 `predict_quantiles` 接口中名为 `mean` 的点预测按源码实际取 **0.5 分位数（中位数）**，不能不加说明地按数学期望均值解释。Chronos-2 cross-learning 是否提升精度依数据而定，且结果会受同批其他序列影响；落地时应固定分组、批处理策略并做对照。[Bolt 实现](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos_bolt.py)、[Chronos-2 quantile API](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/pipeline.py#L763-L820)。

以下仅供**本地脱敏数据试验**参考；与已发布 `2.3.2` 的 API 一致，但本次没有实际运行，也不代表具备某种固定推理耗时：

```bash
pip install 'chronos-forecasting==2.3.2'
```

```python
import numpy as np
from chronos import Chronos2Pipeline

pipeline = Chronos2Pipeline.from_pretrained("amazon/chronos-2", device_map="cpu")
history = np.random.randn(2, 3, 64).astype("float32")  # 2 条任务，每条 3 个关联变量
quantiles, points = pipeline.predict_quantiles(
    history, prediction_length=12, quantile_levels=[0.1, 0.5, 0.9]
)
print(quantiles[0].shape, points[0].shape)  # (3, 12, 3), (3, 12)
```

接口依据：[官方 quickstart](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/notebooks/chronos-2-quickstart.ipynb)、[推理源码](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/src/chronos/chronos2/pipeline.py)。模型权重首次下载依赖网络和本地内存；本次没有对 CPU 时延作保证。另需注意：Bolt 模型卡旧例使用 `predict(context=...)`，而 [2.3.2 的方法参数](https://github.com/amazon-science/chronos-forecasting/blob/v2.3.2/src/chronos/chronos_bolt.py#L504-L509)名为 `inputs`；照搬旧例时应传位置参数或 `inputs=`。

## 3. 用户提供的 AWS 文章：它部署的是 Bolt，不是 Chronos-2

[文章的部署演示](https://aws.amazon.com/cn/blogs/china/sagemaker-ai-deploy-chronos-bolt-implement-prediction/#section5)使用 SageMaker AI **JumpStart** 搜索 `AutoGluon Forecasting Chronos-Bolt Base`，选择单台 `ml.m5.xlarge`，部署实时端点；文章预计约 5–10 分钟进入 `InService`。SageMaker Python SDK **v2** 的等价演示是：

```python
from sagemaker.jumpstart.model import JumpStartModel

model = JumpStartModel(model_id="autogluon-forecasting-chronos-bolt-base")
predictor = model.deploy(initial_instance_count=1, instance_type="ml.m5.xlarge")
```

该文是 JumpStart 托管模型及镜像的入门 PoC，**没有**提供 Dockerfile、自定义推理容器或 Chronos-2 部署步骤；不能据此声称私有化部署路径已经验证。其生成 100 条模拟的*小时级*序列，将历史数值放入 `inputs: [{"target": [...]}]`，再用 `parameters: {"prediction_length": 24}` 调用 SageMaker Runtime `InvokeEndpoint`；时间戳是本地示例数据，并未发送在该请求体里。故这里的 24 表示未来 **24 个采样步**，仅因样例以小时采样才对应 24 小时。请求还可以包含多条序列和 `quantile_levels`。[文章 §5.3–5.4](https://aws.amazon.com/cn/blogs/china/sagemaker-ai-deploy-chronos-bolt-implement-prediction/#section5)。

需特别区分博客示例与接口契约：

1. [官方旧版 Bolt 端点 notebook](https://github.com/amazon-science/chronos-forecasting/blob/v1.5.3/notebooks/deploy-chronos-bolt-to-amazon-sagemaker.ipynb)显示即使只指定 `prediction_length`，响应也可含 `predictions` 下的 `mean`、`0.1`、`0.5`、`0.9`；不能据博客“只取均值”的写法推断其默认不计算/返回分位数，且需注意上节所述 `mean` 口径。
2. 该 notebook 记录每次至多 1,000 条序列、每条至少 5 个观测（建议不少于 30）；建议预测长度 ≤64 以降低更远期的质量风险，但**端点硬性拒绝阈值是超过 1,000**，不是 64。带时间戳的返回需按接口成对提供 `start`、`freq`。博客提及缺失值标记 `NaN`，但 JSON 标准不定义 `NaN` 字面量；真实序列应先验证缺失值序列化和端点处理，不能直接照抄为合法 JSON 请求。
3. [博客费用表](https://aws.amazon.com/cn/blogs/china/sagemaker-ai-deploy-chronos-bolt-implement-prediction/#section6)给出 `ml.m5.xlarge` 约 **$0.23/小时**、15 分钟约 **$0.06**、此零样本演示训练费 **$0**。这是示例报价，**非中国区域已核实价格**；仅按该小时单价连续保留 30 天的端点托管费约 **$165.60**，未计其他适用费用，空闲但未删除的实时端点仍可能计费。[当前定价](https://aws.amazon.com/sagemaker/ai/pricing/)应按实际区域重核。
4. 博客建议不用后删除 endpoint；[AWS 删除资源文档](https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints-delete-resources.html)另外区分 endpoint config、model 等资源。博客仅提议 serverless 减少常驻端点费，**未验证 Bolt JumpStart 在 serverless 上可用**；[AWS Serverless Inference 文档](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html)列明最大 6 GB 内存、不支持 GPU/VPC，所列区域不含中国区域，不应将博客方案直接等同 serverless 方案。
5. 博客 SDK 示例明确面向 `sagemaker>=2.232.0` 的 **v2** 和 Python ≥3.9，不能将文中的无上限 `pip install -U sagemaker` 当成固定 v2 的安装指令；如要复现应在兼容环境约束 `sagemaker>=2.232,<3`。[博客 §5.2](https://aws.amazon.com/cn/blogs/china/sagemaker-ai-deploy-chronos-bolt-implement-prediction/#section5)、[PyPI SDK 版本](https://pypi.org/project/sagemaker/)。中国区域属于单独的 [`aws-cn` 分区](https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/partitions.html)；模型 ID、制品与镜像、机型和端点配额需逐区域实际检查。博客最后也提醒部分服务仅在海外区域提供。本次**未核实任何指定中国区域**的部署可用性，亦未核实 IAM/VPC/数据安全配置满足企业要求。[SageMaker IAM 说明](https://docs.aws.amazon.com/sagemaker/latest/dg/security_iam_service-with-iam.html)。

当前仓库另提供 [Chronos-2 SageMaker notebook](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/notebooks/deploy-chronos-to-amazon-sagemaker.ipynb)，使用**不同**的 JumpStart ID `pytorch-forecasting-chronos-2`；其 Batch Transform/serverless 例还需单独处理 JumpStart 模型制品并建立 SageMaker Model。不要拿 Bolt 的 ID 和请求格式直接替换成 Chronos-2 后当作同一接口。[旧 Bolt notebook](https://github.com/amazon-science/chronos-forecasting/blob/v1.5.3/notebooks/deploy-chronos-bolt-to-amazon-sagemaker.ipynb)。

## 4. 性能声明的正确读法

- [Chronos 原始论文](https://arxiv.org/abs/2403.07815)报告在其基准上，零样本表现可与特定任务训练方法相当、某些情况更好；不是所有数据、所有预测长度都最优。
- [Bolt 模型卡](https://huggingface.co/amazon/chronos-bolt-base)及[README](https://github.com/amazon-science/chronos-forecasting/blob/1224fafa91e1ecd6674f5204066b159e40b5e4a1/README.md)宣称相较相近规模的原 Chronos 约低 5% 误差、推理最快达 250 倍、内存效率提升 20 倍；比较依赖指定基准、模型与硬件，**不是本次复测的通用加速倍数**。
- [Chronos-2 论文](https://arxiv.org/abs/2510.15821)报告 fev-bench 指标下平均 90.7% 的*对比胜率*（scaled quantile loss），并在规定条件下报告约 300 forecasts/s（A10G、batch 1,024、上下文 2,048、预测 64）；**胜率不是预测准确率**，吞吐也不是单条实时请求时延。工业质量场景的短时异常、分布漂移或稀疏故障并未因这些论文数字自动获得同等效果。

## 5. 对连山工业场景的判断（建议，非已实现能力）

[本仓 `demos-spc` 分析](./lianshan/07-demos-spc.md)将现有链路描述为“测量值接入 → 控制图/控制限与 Nelson Rules 判异 → 告警 → 数字员工诊断与反馈”。Chronos 可以作为**额外的未来值/预测区间候选基线**，与现有判异规则并行对照；预测偏差或越界可以是待验证的辅助信号，但**预测分位数不是 SPC 控制限**，不能直接替换统计过程控制、过程能力或根因归因。模型也没有提供企业 MES 接入、权限审计、工单处置和知识写回闭环。

| 候选任务 | 建议的初始对照 | 必须先查的边界 |
|---|---|---|
| 单条设备/过程连续量、短期预测 | Bolt 与季节性朴素法、现有业务规则并跑 | 采样规律、间歇停机、突变/漂移、分位数覆盖率；先限制预测窗口与成本 |
| 多指标关联、班次/计划/环境等已知条件 | Chronos-2 与单变量基线及可解释的协变量模型对照 | 未来协变量是否在预测时真的可得、时序对齐、分组依赖与信息泄漏 |
| 质量异常提前提示 | 回放历史已结案事件，分离“预测误差/区间”与“SPC 判异”指标 | 提前量、误报/漏报、异常样本稀缺、人工确认与收益口径；不可把区间直接当告警阈值 |

优先用脱敏历史序列做滚动时间切分回测，保证训练/预处理/未来特征不窥看测试段；分工况、设备、季节/班次比较 MAE/WAPE 等点误差、分位数损失与实际覆盖率，再同时量化单条与批量时延、内存及云端持续成本。只有在通过业务可用性、安全与区域可用性检查后，才讨论连接现场数据和生产部署；试点设计、测试记录与实施决策按本目录约定进入 `项目/`，不在本文冒充现状。

## 6. 待核实清单

1. 以目标区域和账号查询两种 JumpStart model ID、镜像/制品、实例、配额、价格；必要时确认境内合规、数据出域和 IAM/网络隔离要求。
2. 固定 Chronos 包、权重、SageMaker SDK/容器版本，在脱敏数据上分别复现本地 Chronos-2 和云端 Bolt 接口，检验缺失值、频率、分位数、超长窗口及服务端清理。
3. 对真实工艺信号建立朴素/季节性/传统时序及现有 SPC 基线；按工况做回测和成本效益评估，不直接采用论文或博客示例的效果数字。
4. 核对生产数据授权、模型权重来源、许可证、依赖清单、数据保留和推理日志，再决定是否进入项目试点。
