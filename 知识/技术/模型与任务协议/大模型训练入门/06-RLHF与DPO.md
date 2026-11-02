# 06 · RLHF 与 DPO：学会在人类偏好中做选择

> 一句话：RLHF（基于人类反馈的强化学习）描述用人类反馈优化行为的一类流程；DPO（Direct Preference Optimization）是一种用偏好对直接优化策略的**偏好优化算法**，通常不需要显式训练奖励模型或在线 RL 采样。

## 一个偏好对

同一个问题有回答 A（附出处、说明不确定性）与回答 B（没有依据却声称确定）。标注员选择 A。样本包含 prompt、`chosen=A`、`rejected=B`；DPO 调整模型，使相对参考策略而言 A 比 B 更受偏好。不是在训练时让模型实时询问人类，也不是把每个“喜欢”都转为客观事实。

```text
常见 RLHF 路线：SFT → 人类比较数据 → 奖励模型 → 在线采样 + PPO 等策略优化
DPO 路线：      SFT（通常） → 人类比较数据 → 直接偏好损失优化
```

两者都要管参考模型、偏好数据分布、标注一致性、过优化和原有能力退化。DPO 的“直接”是相对显式奖励模型 + 在线 RL 链路而言；它仍有偏好目标、参考策略等假设，**不能说 RLHF = DPO，或 DPO 是 PPO 的别名**。偏好数据也可以来自其他来源；若来自 AI 判别，应标注为 AI 反馈而非冒称人类标注。

## 什么时候需要？

当多个回答都合语法但更需要比较安全性、帮助性或格式偏好时，可考虑偏好优化；先明确偏好维度和独立评测。对企业实时事实与访问权限的问题，偏好模型不能替代授权 RAG 和业务规则。

## 自测

“回答 A 更像专家”足以证明其内容真实？**不够**，必须核对来源事实、场景约束和标注偏置。

## 一手资料

- [Ouyang 等：Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155)——典型 SFT/奖励模型/PPO 训练链。
- [Rafailov 等：Direct Preference Optimization](https://arxiv.org/abs/2305.18290)——DPO 的推导与实验条件。
- [Schulman 等：Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)——PPO 原始算法，非 RLHF 专属。
