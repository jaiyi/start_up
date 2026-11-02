# LoongSuite dsh-plugin：DSH 运行时可观测插件

> 调研口径：按本次会话日期 **2026-10-20** 截止，固定源码快照 [`f44ccfc`](https://github.com/loongsuite/dsh-plugin/commit/f44ccfcd2255186bfcfe1c9f8c7db047204865b7)（提交时间 2026-10-12 UTC）；仓库：[loongsuite/dsh-plugin](https://github.com/loongsuite/dsh-plugin)。主要核对 README 与包声明；**未安装插件，未连接真实 DSH 或 OTLP 后端**。

## 一句话定位

`@loongsuite/dsh-plugin` 是 **DeepSeek Harness（DSH）的独立观测插件**，监听 Session/Agent/Step/LLM/Tool 生命周期，将事件组织为 OpenTelemetry GenAI trace 和指标，经 OTLP/HTTP 发送到配置的后端。它不是 DSH 宿主、Skill 市场、资产审核工具，也不负责 WeKnora 知识检索。[README：定位与出口](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L1-L14)。仓库说明可对接任意兼容 OTLP 后端，不要求部署 LoongSuite 专属后端。

## 产品和实现边界

| 问题 | 仓库能确认什么 | 对本项目意味着什么 |
|---|---|---|
| 看到了什么 | README 给出的树是 `ENTRY → AGENT → STEP → LLM/TOOL`；真实 LLM 尝试分别建 Span、Tool 调用与结果按 DSH call ID 关联，异常/中断收束 Span。来源：[Trace 结构](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L44-L57)。 | 可成为任务运行成本/失败/耗时的数据来源；不是 Git commit、Skill release、安装、加载或业务结果的权威回执。 |
| 导出什么 | `gen_ai.client.operation.duration` 与 `gen_ai.client.token.usage` 指标；不导出 OTel Logs。来源：[指标与日志边界](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L67-L69)。 | Session/Tool 的运行轨迹不能直接当作准确的“某 Skill 某 digest 执行成功率”。需要额外建立稳定 Skill ID / revision / digest 与 Span 的映射和聚合口径。 |
| 怎样接入 | 按 DSH profile 分别用 `dsh plugin --profile … add @loongsuite/dsh-plugin`，配置 `OTEL_EXPORTER_OTLP_ENDPOINT` 或 profile 的 `cordis.patch.yml`；共享 endpoint 展开 `/v1/traces`、`/v1/metrics`。来源：[安装配置](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L85-L135)。 | **不是**安装到本工作台静态原型就能工作；要核对真实 DSH profile 的插件兼容和接收端授权。 |
| 内容隐私 | README 称默认不采 Prompt/回答、Tool 定义/参数/结果正文，但结构信息和 token 数仍导出；环境变量 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` 可在未显式配置时开启正文采集，故需在受限 profile **明确配置 `captureContent: false`**。来源：[参数表](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L145-L171)、[隐私说明](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L176-L184)。 | 禁止把受限报告/PPT、完整 Prompt、会话或 Tool trace 送往普通团队仓库或未批准的遥测服务；即使关正文，也须审查资源属性、标识、后端留存与访问权限。 |
| 运行和兼容 | 声明插件为 0.1.x；[package.json](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/package.json#L1-L5) 在快照中为 `0.1.3`，Node 需 `>=22.19.0`；README 的 DSH 支持范围是 `>=0.1.0-rc.6 <0.2.0`。来源：[兼容性说明](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/README.md#L75-L83)、[引擎要求](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/package.json#L31-L34)。 | 声明支持不等于目标 DSH Desktop、profile 或 Node 组合已经通过集成测试；按确切版本做 PoC。 |
| 许可 | [LICENSE](https://github.com/loongsuite/dsh-plugin/blob/f44ccfcd2255186bfcfe1c9f8c7db047204865b7/LICENSE#L1-L15) 为 Apache-2.0。 | 开源许可不构成对原始业务数据、Prompt 或发送到第三方 OTLP 后端的授权。 |

## 对团队知识工程的借鉴（分析建议）

1. 在本项目 `Git/CI → SkillHub → 目标分发 → DSH profile 加载 → 实际执行/业务结果` 链条上，它最多帮助回答**执行阶段发生了哪些 LLM/Tool 调用及耗时/用量**，不能替代每一段的固定 digest 和真实读回。参照本项目 [`05-系统架构与权威边界.md`](../../../项目/团队知识工程/方案/05-系统架构与权威边界.md)。
2. 试点先在**获准脱敏任务**和受控 OTLP 后端中运行，profile 显式关闭正文采集，验证 DSH 插件加载、异常路径 Span 收束、重试区分、接收端 ACL/保留期、无意采集与双插件/官方遥测重复计量。
3. 若希望把运行反馈回填到 Skill 质量体检，必须额外设计 `skill_id + version + package digest + target + run id` 的归因桥，区分“调用了 Skill Tool”“目标加载成功”“任务完成”和“业务结果有效”。原仓库提供的是**遥测来源，不是质量判定器或自建 registry 聚合层**。

## 未验证事项

没有检查真实安装回执、profile 的 `captureContent` 最终生效值、OTLP 出站数据包和接收端存储；没有凭该插件证明 Skill 名称/版本/digest 可准确归因，亦未进行线上隐私或性能审计。上述边界应在具体 DSH 版本上用获准样例验证。
