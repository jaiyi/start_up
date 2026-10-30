# 产品调研：OpenBKN / BKN Foundry

> 调研日期：2026-10-28。对象：[OpenBKN 官网](https://openbkn.ai/)、[BKN Foundry 官方仓库](https://github.com/openbkn-ai/bkn-foundry)。依据官方 [中文 README](https://github.com/openbkn-ai/bkn-foundry/blob/main/README.zh.md)、[仓库架构图](https://github.com/openbkn-ai/bkn-foundry/blob/main/docs/images/bkn-architecture.svg)及[许可证说明](https://github.com/openbkn-ai/bkn-foundry/blob/main/LICENSE)；未部署、未独立复现实测指标。
> 分类：AI 原生数据平台 / 本体驱动的业务知识网络；涉及 Agent 上下文装配和受控执行，但不宜当作普通 RAG 知识库或单一 Agent 前端。

## 1. 是什么

OpenBKN 将分散在业务数据、文档、系统、流程、规则和经验中的信息，通过本体组织为 Agent 可查询和使用的 **Business Knowledge Network（BKN）**。BKN Foundry 是其后端技术底座，而非整个产品的 Web UI：官方明确该仓库**不含 Web 界面**，另有 [BKN Studio](https://github.com/openbkn-ai/bkn-studio) 前端仓库，以及 [SDK / CLI](https://github.com/openbkn-ai/bkn-sdk)、[部署仓库](https://github.com/openbkn-ai/openbkn-deploy) 和示例仓库。不要把单独部署 Foundry 误认为完整可用的团队工作台。[来源：官方 README](https://github.com/openbkn-ai/bkn-foundry/blob/main/README.md)。

## 2. 核心结构与能力

| 层次 | 官方描述 | 工程理解与边界 |
|---|---|---|
| 语义与上下文 | BKN Engine 以 Data / Logic / Risk / Action 组织业务语义；Context Loader 做召回和排序 | 目标是按业务对象、规则和证据组织可用上下文，而非把所有原始材料直接塞进 Prompt |
| 数据访问 | VEGA 对多源、多模态数据做虚拟化 | 仍须针对真实源核查身份、权限、更新时效、原件引用及可用连接器 |
| 执行 | Exec Factory 编排 Tool、MCP 和 Skill | 执行路径需与业务系统的权威写入、审批、幂等和回执分别核对 |
| 治理与追溯 | BKN Safe 涉及身份/权限/策略；BKN Trace 描述从意图到知识节点、数据源和工具的证据链 | 官方能力声明不是具体环境中策略生效、全链路追溯已实测的证明 |

组件名称及关系见[官方 README 架构节](https://github.com/openbkn-ai/bkn-foundry/blob/main/README.md#toc-bkn-foundry)和[仓库架构图](https://github.com/openbkn-ai/bkn-foundry/blob/main/docs/images/bkn-architecture.svg)。官方的 HR 简历问答基准和正确率/延迟/Token 数字见 [README 基准节](https://github.com/openbkn-ai/bkn-foundry/blob/main/README.zh.md#toc-benchmarks)，属于厂商自报的特定样本、模型和版本结果；不能外推到团队知识场景，也不能当作独立对比评测。

## 3. 部署和许可

- [部署指南](https://github.com/openbkn-ai/openbkn-deploy/blob/main/README.zh.md)将 Linux 作为完整安装目标，提供 Kubernetes 安装路径；macOS kind 是开发验证路径。部署复杂度高于单个 RAG 服务；须先核查所需组件、资源、网络、升级及故障恢复。
- [许可证说明](https://github.com/openbkn-ai/bkn-foundry/blob/main/LICENSE)明确 **按文件多许可证**：源自 kweaver-core 的既有文件/修改依 Apache-2.0，新写文件依附加条款的 OpenBKN License；混合组件逐文件判定。不可笼统写为“整个 OpenBKN 都是 Apache-2.0”；商用及再分发须法务核对对应文件与组件。

## 4. 与团队知识工程的关系（本调研判断）

可借鉴“业务本体 → 上下文召回 → 受控动作 → 证据链”的分层，特别适合将知识/Skill 引用关联到具体业务对象、规则和数据权限；但不宜为了首期 Inbox、知识审核与发布直接引入全套 BKN 平台。现有分工中 Git 是获批资产的正式源码/版本边界，WeKnora 是授权知识检索，PG 保留工作过程和映射，DSH 宿主管实际执行；OpenBKN 若作为候选数据与语义能力，需先确定它提供的是辅助语义层还是替换既有权威系统，并用最小样例验证权限与引用读回，不应并列设立第二份资产权威。

## 5. 后续验证清单

1. 使用脱敏合成材料，验证语义对象与现有知识/Skill ID、来源版本、ACL 的双向映射及来源定位。
2. 验证撤权、来源更新、跨空间访问、连接器失败时 Context Loader / VEGA 的行为。
3. 对有副作用的操作检查策略拦截、审批、幂等、业务系统回执和可撤销范围；不要仅依赖 Trace 宣称执行成功。
4. 逐组件确认部署资源、许可证条款、开放 API 与真实集成成本。

**证据边界：**以上是公开资料研究，不代表已完成企业环境安装、安全审计或与 DSH / WeKnora 的互操作测试。
