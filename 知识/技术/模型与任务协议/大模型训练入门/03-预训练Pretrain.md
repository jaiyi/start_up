# 03 · 预训练（Pretrain）：从文本中学习预测下一个 token

> 一句话：自回归语言模型在大量合法可用的文本等数据上，最小化“预测下一个 token”的损失，形成可迁移的基座能力；多模态/掩码式模型可能使用不同目标。

## 用一个极小例子理解

输入“设备今天需要”，参考下一个 token 是“检查”；模型给所有候选 token 分配概率。如果“检查”的预测概率低，交叉熵损失就高；梯度更新参数，使它在类似上下文中更可能出现。训练时可对一句话中多个位置计算损失，而不是只学最后一个字。

```text
清洗后样本 → token 化 → 序列切分/打包 → 前向预测 → 损失 → 反向传播更新权重
```

这是统计训练目标，不保证说出的事实始终正确，也不会给模型实时查看企业知识的权限。“背下来”和“真正理解”不是由训练损失单独判断的。

## 起点、终点与代价

- 输入：授权的训练语料、分词器、架构、初始化参数、计算资源；需隔离验证集与基准。
- 输出：预训练 checkpoint（基座模型），通常还未充分学会按对话指令回答；随后可做 SFT 与偏好优化。
- 观察：训练/验证损失、不同领域任务表现、污染检查、能耗/成本、生成安全性。验证损失降低不代表企业业务结果一定更好。
- 从零训练大型模型需要大规模数据治理与计算基础设施；初学者可用**纸上概率计算**或极小公开例子理解，不必下载商业受限模型或真实业务数据。

## 和其他方法的区别

预训练更新权重以学习通用模式；RAG 在推理时按权检索外部材料，不改权重；SFT 用任务示范适配回答行为。数据会持续变化时，优先考虑可治理的知识库和 RAG，而非反复预训练。

## 一手资料

- [Radford 等：Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)——生成式预训练与下游适配的早期路线。
- [Brown 等：Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)——自回归大规模语言模型与上下文学习；数据/规模/评测结论有适用条件。
- [Hugging Face：Causal language modeling](https://huggingface.co/docs/transformers/tasks/language_modeling)——入门训练目标与代码范式，注意版本差异。
