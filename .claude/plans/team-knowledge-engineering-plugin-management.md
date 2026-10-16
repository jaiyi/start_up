# 将 Plugin 管理纳入长期架构路线

## 目标

在现有“知识 + Skill 双资产 AI 工作台”方案中补充 Plugin 管理的长期架构定位：第一阶段继续聚焦知识与 Skill 闭环；当双资产稳定并出现规模、复用、集成或权限治理需求后，再扩展 Plugin 管理。明确三类资产的边界、依赖关系、共用治理底座和不同生命周期，避免把 Plugin 当成 Skill 的别名，也避免因 Plugin 延后而削弱当前 Skill 范围。

## 修改范围

1. `README.md`
   - 产品定位扩展为知识、Skill 和未来 Plugin 的演进路线，但明确当前核心仍是双资产。
   - 增加三类对象的简短定义和关系：知识回答“知道什么”，Skill 回答“怎么完成任务”，Plugin 提供平台/外部系统能力。
   - 将阶段状态调整为：P0/P1/P2 建设和运营知识 + Skill，P3 扩展 Skill 分发，P4 评估 Plugin 管理与 Gateway/工具治理，P5 开放生态和高风险能力。
   - 将 Plugin 从“待验证的零散扩展”改成有明确长期方向、但不属于首期硬依赖的能力。

2. `方案/00-方案总览与关键决策.md`
   - 产品定义增加长期目标：统一 AI 能力工作台，保留 Knowledge Catalog、Skill Catalog、Plugin Catalog 三个独立资产域。
   - 核心决策表增加 Plugin 管理的定位、首期范围和演进条件。
   - 增加 Knowledge/Skill/Plugin 的边界表和 Agent 运行关系。
   - 阶段顺序将 Plugin 从笼统的 P5 前移为在双资产稳定后评估的 P4 能力；P5 保留第三方 Plugin、Marketplace、MCP 和高风险生产写入等更重能力。

3. `方案/01-问题、用户与产品范围.md`
   - 增加长期业务问题：任务能力会依赖外部系统和工具，需要受控的 Plugin 资产管理。
   - 增加 Plugin/platform/integration owner 的责任边界。
   - 明确 MVP 不做开放 Plugin Marketplace，但为受控内置 Plugin 预留 manifest、权限和运行归因接口。

4. `方案/02-端到端知识工作流.md`
   - 在两条生产线之后增加 Plugin 能力线：能力需求 → Plugin manifest/适配器 → 权限/安全/兼容性验证 → 安装/启用 → 工具注册 → Agent 调用。
   - 明确 Skill 依赖 Plugin 提供工具，Plugin 不等于 Skill；一个 Plugin 可被多个 Skill 使用，一个 Skill 可依赖多个 Plugin。
   - 增加运行反馈分流：业务任务质量进入 Skill，外部 API/权限/兼容性故障进入 Plugin/平台故障队列。

5. `方案/03-知识资产与生命周期.md`
   - 将资产分层中的 Plugin/MCP 从简单“后续”改为独立的长期资产域。
   - 增加最小 Plugin metadata 示例：id、version、host compatibility、tools、permissions、network/data scope、dependencies、digest、health、owner。
   - 增加 Plugin 生命周期和与 Skill 生命周期的区别；说明 Plugin package 可以捆绑 Skill，但安装单位与业务能力单位仍分离。
   - 扩展版本/运行追踪：run 同时记录 Skill digest、Plugin digest、knowledge refs、profile 和 tool calls。

6. `方案/04-角色、治理与运营机制.md`
   - 增加 Plugin owner/integration owner 和安全审核责任。
   - 增加 Plugin 专属治理门禁：权限声明、凭据隔离、依赖/许可证/SBOM、兼容性、沙箱或进程隔离、超时/重试/幂等、卸载和回滚。
   - 明确 Skill 质量治理和 Plugin 运行时治理分开，但共享审批、审计和发布底座。

7. `方案/05-系统架构与权威边界.md`
   - 拓扑增加未来 Plugin catalog/registry、Plugin runtime/gateway、tool registry，但标明 P1 不引入完整实现。
   - 权威边界表增加 Plugin package、Plugin registry、Plugin runtime/tool registry。
   - 明确 Plugin 提供工具能力，Skill 组合工具完成任务；Plugin 管理不替代 Skill 管理。
   - 增加演进触发条件：第二个外部系统、重复适配、集中权限/凭据治理、沙箱需求、跨 Skill 复用或模块化单体无法接受地管理安装。

8. `方案/06-数据、状态与可追溯性.md`
   - 增加 Plugin、Plugin installation、tool manifest、permission grant/health 等数据对象和状态证据。
   - 扩展统一追踪链，记录 Plugin version/digest、tool call、permission grant、installation 和 provider health。
   - 明确 Plugin 的 disabled/unknown/unhealthy 不得被报告为工具可用。

9. `方案/07-发布、安全与故障处置.md`
   - 增加未来 Plugin 发布链：manifest/代码 → 安全和兼容性 CI → 审核 → package/digest → 安装/权限授予 → health/readback → enable；首期仅保留受控内置适配器或接口定义。
   - 增加 Plugin 安全要求：最小权限、Secret Manager、网络/数据范围、沙箱、依赖扫描、签名/完整性、速率限制、超时、幂等和人工 gate。
   - 增加 Plugin 故障、禁用、撤回、卸载、回滚流程，区分 Skill 质量问题和 Plugin 运行问题。

10. `方案/08-MVP实施、验证与验收.md`
    - P0/P1/P2 继续只交付知识 + Skill，增加 Plugin contract/manifest 的预留验证而不是完整 Plugin 管理。
    - 新增 P4“受控 Plugin 管理”：一个低风险外部系统适配器、Plugin catalog、权限审批、安装/启用/禁用、health/readback、运行归因和回滚。
    - P5 改为开放 Plugin/MCP/Marketplace 和高风险生产能力。
    - 验收矩阵增加 Plugin 预留契约和后续 Plugin 管理验收项，并明确不阻塞双资产 MVP。

11. `验证/README.md`、`验证/01-平台与Provider能力验证.md`、`验证/02-DeepSeek-Bot能力评估.md`
    - 统一说明当前验证 Plugin 扩展能力，不把外部平台存在某种扩展机制视为 Plugin 管理已完成。
    - 增加待验证项：tool registration、权限/凭据、安装状态、health、沙箱、兼容性和回滚。
    - 保持 Bot 不等于 Plugin Registry 或企业控制面。

12. PDF
    - 重新按更新后的 Markdown 汇编 PDF，保持紧凑版式，并覆盖三类资产和阶段路线。
    - 生成后检查文件、页数、临时文件和工作区变化；只在用户要求时提交/推送。

## 验证

- 检查 Markdown 内部链接和重复/矛盾的阶段表述。
- 执行 `git diff --check`。
- 检查方案中所有 P4/P5、Plugin、SkillHub、DSH 和权威边界表述一致。
- 重新生成 PDF，确认目标文件可读、章节顺序不变、没有残留临时文件。
- 不引入生产凭据，不调用未经验证的外部能力，不把 Plugin 管理描述为已部署。
