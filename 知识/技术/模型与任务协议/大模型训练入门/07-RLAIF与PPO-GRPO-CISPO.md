# 07 · RLAIF 与 PPO / GRPO / CISPO：先分清反馈，再分清优化

> 一句话：RLAIF 指使用 **AI 反馈**替代或补充人类对结果的评价；PPO、GRPO、CISPO 属于**策略优化方法**，不能把它们定义为“RLAIF 的三个阶段”。不同论文的目标、采样与裁剪细节不完全相同。

## 同一个例子看两条轴

模型生成三份合成工单摘要。评分来自人类比较，是**人类反馈**；来自另一模型按明确准则评价，是**AI 反馈**；如果可用机器程序核验摘要是否漏掉结构化字段，则属于**可验证奖励**。拿到训练信号之后可以选择不同优化方法，反馈来源不自动决定 PPO/GRPO/CISPO。

| 术语 | 作用 | 新手抓住什么 |
|---|---|---|
| RLAIF | 反馈/偏好来源路线 | AI 评判也会偏置、受提示影响，需要人与独立评测兜底 |
| PPO | 在线策略优化方法 | 用裁剪目标限制单次策略变化，常配价值估计/奖励模型；实现细节取决于训练系统 |
| GRPO | 用同一问题的一组候选回答作相对比较的策略优化方法 | 以组内相对奖励构造优势，减少某些价值模型依赖；依然需要可靠奖励与足够多样的样本 |
| CISPO | MiniMax-M1 论文提出的策略优化方法，裁剪重要性采样权重而非直接裁剪 token 更新 | 原论文在其特定对照实验中报告效率/效果改进；不要外推到任意模型和任务 |

```text
输入题目 → 当前策略采样多份回答 → 奖励/判别信号（人、AI 或可验证程序）
         → 策略目标（如 PPO / GRPO / CISPO 的具体实现）→ 更新 → 独立评测
```

**注意**：GRPO 在 DeepSeekMath 等工作中用于数学推理奖励，并不能仅因使用 GRPO 就称为 RLAIF；程序化的正确性奖励与 AI 裁判有本质区别。AI 裁判即使标注流畅，也可能偏爱长回答、泄露测试标准或奖励作弊。PPO、GRPO 等不是可替换的按钮，得比较训练稳定性、成本、奖励设计与安全回归。

## 入门自测

“用 AI 打分并以 GRPO 更新模型”包含哪两个不同选择？**选择 AI 作为反馈来源；选择 GRPO 作为策略更新方法。**

## 一手资料与实现边界

- [Bai 等：Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073)——AI 反馈路线。
- [Schulman 等：Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)——PPO 原论文。
- [Shao 等：DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300)——GRPO 与数学任务。
- [MiniMax-M1: Scaling Test-Time Compute Efficiently with Lightning Attention](https://arxiv.org/abs/2506.13585)——提出 CISPO，报告裁剪重要性采样权重而非 token 更新及特定设置下的实验结论；本文不据此推断所有场景性能。[MiniMind README](https://github.com/jingyaogong/minimind/blob/master/README.md)将其列为教学实现路线，不能等同于原论文的完整配置或复现实验。原论文 HTML 正文未在可访问文本中明确展开 CISPO 各字母的全称，因此此处不自行补写英文全称。
