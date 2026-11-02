# 产品调研：Harness²（google-research/harness2）

> 调研日期：2026-10-28。名称核对：用户所写 `google-resaerch/harness2` 的组织名应为 **[`google-research/harness2`](https://github.com/google-research/harness2)**；项目名 Harness²。来源：[官方 README](https://github.com/google-research/harness2/blob/main/README.md)、[论文](https://arxiv.org/abs/2610.14224)、[实验说明](https://github.com/google-research/harness2/blob/main/docs/EXPERIMENTS.md)、[许可证](https://github.com/google-research/harness2/blob/main/LICENSE)。未本地运行或复现论文结果。
> 分类：Agent Harness 自适应/实验框架；不是 Google 官方提供支持的商业产品，README 末尾有明确免责声明。

## 1. 定位

项目将 harness 定义为模型之外使其能够执行任务的系统：Prompt、工具、记忆、Skill、编排等。**Harness² 优化的是这套包裹模型的执行系统，不训练/更新模型权重**。目标是遇到设计阶段未见过的任务时，利用当前任务的执行证据改进 harness，并将通过的经验用于后续任务。[来源：README 定义与流程](https://github.com/google-research/harness2/blob/main/README.md)。

## 2. 双层递归机制

1. **任务级**：Propose–Probe–Compose。先提出 harness 修改，在同一任务上探测候选执行差异，再将候选和证据组合成改进版；该阶段不依赖当前任务的 ground-truth 成绩反馈。支持并行探测多个候选，或顺序迭代。
2. **跨任务级**：将采纳的 harness 和有证据支持的经验反思写入持久的 *improvement harness*，指导后续任务；应注意这不等于无需审查的团队 Skill 自动发布。
3. 可编辑的八类组件是 **system prompt、guardrails、memory、tool guidance、subagents、skills、scripts、plugins**；改变不同组件的风险不一样，尤其是工具权限、脚本和插件。[来源：README Harness components / Experiments](https://github.com/google-research/harness2/blob/main/README.md#harness-components)。

## 3. 运行与实验边界

- README 给出的本地入门环境是 Linux、Python 3.12、`uv`；`harness2-demo` 使用确定性 editor 和真实 Python 执行，不需模型凭据。模型驱动的基准另需 Node.js、Google Cloud CLI 等依赖，并产生 API 费用。[安装说明](https://github.com/google-research/harness2/blob/main/README.md#install)。
- 当前仓库声明支持 OpenCode、Codex 两类 executor，JobBench、LAB、WorkBuddy-Bench 三类基准，以及并行/顺序递归。仓库报告在指定模型与实验条件下有性能提升，属于作者实验数据，**不应外推为通用的准确率提升或业务成功率**。[基准说明](https://github.com/google-research/harness2/blob/main/docs/BENCHMARKS.md) · [论文](https://arxiv.org/abs/2610.14224)。
- **重要安全边界**：官方 README 明示 executor 网络访问不受限，Codex 的 sandbox 被关闭；还提示公开 benchmark 评分标准可能被访问，评估前需自行配置网络限制。不得直接在企业敏感材料、生产凭据或有副作用的业务 Tool 上运行这种默认实验配置。[README Web access](https://github.com/google-research/harness2/blob/main/README.md#web-access)。
- 仓库本体是 [Apache-2.0](https://github.com/google-research/harness2/blob/main/LICENSE)；第三方代码、基准与数据集保留各自授权，不可一概当成 Apache-2.0。[README License](https://github.com/google-research/harness2/blob/main/README.md#license)。

## 4. 与团队知识工程的关系（本调研判断）

适合借鉴“**先提出变更 → 在隔离任务上探测 → 比较执行证据 → 由人决定是否采纳**”来打磨 Skill、验证工具说明或改善知识引用策略。团队已确定正式 Skill 必须经指定 Git 审核并合并主分支才算发布，Harness² 的自动采纳只是实验内部状态，不能代替审核、资产版本、权限或真实业务效果确认。若要试点，应固定基线版本/模型/样本/成本，阻断联网及生产写操作，将多次候选试验限制在合成数据与隔离 Runner 内，输出对照证据后再由人审。

## 5. 待验证

1. 在团队 Skill 的稳定可测任务上，测量改进相对固定基线的复现率、成本、延迟与负例退化。
2. 区分无需标准答案的任务内对比与有独立业务验收结果的离线评测，防止只优化表面任务分数。
3. 审计多轮候选执行的网络、脚本、插件、子代理权限与产物读写，确认采纳边界和回滚。
4. 评估现有 DSH Runner / Trace 接口是否足够承接这种实验；本次不认为已兼容。

**证据边界：**仅调研公开仓库及论文；未运行 demo、模型基准或任何 DSH 集成。
