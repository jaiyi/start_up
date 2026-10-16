# DSH 可安装 Plugin 真实契约与分阶段 Bundle 验证计划

## 目标

补齐 Team Knowledge Workbench 方案中此前缺失的 DSH 可安装 Plugin 真实开发契约，并把“每个阶段都必须打 Bundle、安装、重启、读回并做最小端到端验证”写成强制开发门禁。当前只补充调研、证据边界、验证矩阵和实施路线；在目标 DSH 版本的源码/类型/README/运行时读回完成前，不实现 `dsh-decision-map` 的未证实 API。

## 关键原则

1. 固定 DSH 官方仓库、commit/tag、Node、包管理器、OS、目标 profile 和安装方式；所有结论带证据路径。
2. 官方源码、类型声明、README、官方 fixture、Loader/profile 和真实安装读回优先；社区 Skill 只能作为作者指南，不能作为契约或 CI 阻断依据。
3. 将 `fact`、`candidate`、`pending_checks`、`warning` 分开；未取得目标版本可重复证据的 package 字段、Cordis patch、trace service、Host→Client bridge 和 UI slot 不得写成 confirmed。
4. 将 `requested → built → packaged → installed → loaded → enabled → healthy` 与 `disabled → uninstalled → rolled_back` 分开记录，不把安装成功推断为功能可用。
5. 每个功能增量都必须经过 `build → package → digest → fresh-profile install → restart → manifest/load-report readback → functional E2E → failure cleanup/rollback`；不得只在源码或开发 profile 中验证。
6. Plugin 与 Skill/Workbench/Team Knowledge asset 分层；插件在宿主进程内运行，必须有依赖锁定、SBOM、secret scan、权限、health、disable/uninstall/rollback 和审计证据。

## 调研与证据范围

- 官方 DSH 仓库及固定 commit：development、Cordis API/tutorial、bundle/package fixture、module graph、client modules/resources/slots、plugin manager、upgrade guide、测试 fixture 和类型声明。
- 真实可安装契约：`package.json` name/type/exports、Node/Host entry、Browser/Client entry、`dsh.bundle.patch`、`dsh.client.platform`/其他 client metadata、files、dependencies/peerDependencies、patch 顶层和 `insert` 结构、profile compatibility、digest、loader、安装/卸载/回滚读回。
- 真实运行时接口：session/trajectory/turn/step/tool event 或 observation service、token/duration/current session ID、Host→Browser bridge、client store、UI Slot catalog/register/mount/unmount。
- 社区 Creator/Builder Skill：记录来源、适用范围和缺口，作为开发 checklist，不提升为官方契约。

## 分阶段实施与验证

### Stage 0：版本与证据基线

- 固定目标 DSH commit、runtime/package manager、profile、安装目标和 fresh profile 目录。
- 读取官方源码/类型/README/fixture，输出契约证据表和未决问题。
- 失败门禁：目标 commit、profile 或安装命令不固定，不能进入 Plugin PoC。

### Stage 1：Host-only 最小插件

- 只实现官方已确认的 `apply(ctx)`、最小 service/tool 或健康探针；不接 session trace、UI 或自猜 service。
- 打包并计算 digest；安装到 fresh profile；重启；读取 boot manifest、Node load report、版本/digest/enable 状态。
- 做一个无敏感数据的功能 E2E；验证重复安装、启动失败、disable、uninstall 和旧 digest rollback。

### Stage 2：Client-only 最小插件

- 仅使用目标版本已确认的 client entry、platform 字段、module/slot API。
- 重复 build/package/install/restart/readback；验证 Client load report、UI mount/unmount、刷新、宿主重启和缺失 slot 的明确失败。
- 未确认 slot 或 client loader 时保持 candidate，不写业务 UI。

### Stage 3：Mixed Plugin 与 Host→Client bridge

- 使用官方确认的 Remote/Connection/service bridge/store；Node half 和 Browser half 只传最小、脱敏数据。
- 重复 bundle 安装和 restart；端到端验证 Host 发布 → Client 读到 → UI 展示、bridge 断连、session 切换、权限拒绝、宿主重启和卸载清理。

### Stage 4：Session trace/trajectory 观测

- 在目标版本确认真实 session log/observation service 和事件字段后再接入。
- 先对纯函数聚合做单元测试：空/乱序/重复/缺 token/缺结束时间/并列慢步骤/未知事件/超大 token/敏感字段脱敏。
- 再打包安装并做真实脱敏 E2E，验证 timeline/stats、current session、工具次数、轮次数、token、slowest step 和权限/断连/损坏 trace 处理。

### Stage 5：生产候选与生命周期

- 固定 package digest、来源 commit、SBOM、license、依赖扫描、secret scan、权限清单和 target profile。
- 验证 enable/disable/uninstall/reinstall/rollback、升级兼容性、错误恢复、crash/restart、unknown/degraded/reconciling 状态和审计。
- 通过后才允许进入正式 Workbench Plugin 或 `dsh-decision-map`；任何未验证项进入 blocker/fallback，不伪造成功。

## 文档修改范围

1. 新增 `项目/团队知识工程/验证/05-DSH Plugin开发与安装契约验证.md`：证据分级、官方资料索引、真实契约字段、PoC 阶段、Bundle 安装/E2E 验证、生命周期、证据模板、失败与回滚。
2. 更新 `项目/团队知识工程/验证/01-平台与Provider能力验证.md`：扩展 V-03/V-07，加入版本固定、build/package/digest/install/restart/readback/functional E2E，以及 disable/uninstall/rollback 和失败清理门禁。
3. 更新 `项目/团队知识工程/验证/03-DeepSeek Harness能力验证.md`：补充 Plugin Bundle handoff、installed/loaded revision、digest/profile/readback，继续保持 Workbench 与 Harness runtime 边界。
4. 更新 `项目/团队知识工程/验证/04-DSH Desktop Workbench落地与多团队部署验证.md`：补充真实 Plugin Bundle 路径、local/market 安装差异、restart/readback/uninstall/rollback 证据。
5. 更新 `项目/团队知识工程/方案/08-MVP实施、验证与验收.md`：P0 完成契约侦察和最小安装 Spike；P4 真实 Plugin 采用阶段性 Bundle gate；新增 Plugin contract discovery/PoC/production readiness 的边界和验收项。
6. 更新 `知识/技术/17-DeepSeek-Harness插件：决定Agent如何被组装、扩展和观测.md`：将未决问题改为官方证据优先、社区 Skill 辅助、真实 Bundle 安装验证清单，并标注尚未确认的运行时接口。
7. 如现有验证 README 有专项索引，补充验证/05 链接和状态边界。

## 验证与交付

- 只修改 Markdown/计划材料，不生成凭据、真实业务材料或未经证实的 `dsh-decision-map` API。
- 运行 `git diff --check`、Markdown 链接/标题/术语检查，以及旧表述和未验证字段搜索。
- 记录官方资料和社区 Skill 的证据等级；没有目标环境的真实安装结果时，明确标记 `pending/fallback/blocked`。
- 代码实现阶段另行执行 TDD：先写聚合纯函数和 contract tests，再按 Stage 1–5 每阶段打包安装和 E2E；通过目标环境读回后才实现正式插件。

## 回滚

本轮仅改文档，回滚为恢复新增/修改 Markdown。未来 Plugin 实现必须能按 digest 回退到上一版本，并能卸载失败产物而不删除 Team Knowledge asset、Git 历史、WeKnora 正式索引或审计记录。
