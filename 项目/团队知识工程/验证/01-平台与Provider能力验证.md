# 平台与 Provider 能力验证

> 本文只记录外部能力的验证问题、实验和结论，不定义产品范围。Skill 管理本身是核心产品能力；本文件只验证 SkillHub、DSH loader/profile 等自动化实现是否可用。

## 1. 验证分级

- **A：已存在可靠的官方 API、源码或本地文档证据，可进入 PoC。**
- **B：架构上可行，但必须在目标版本和真实部署中验证。**
- **C：前置条件未确认，只做只读、fake provider 或人工 fallback。**
- **D：当前不建议作为正式依赖。**

技术可行不等于已经集成。每个 B/C 项必须产生版本、环境、日期和结论。

## 2. 当前能力矩阵

| 能力 | 当前判断 | 必须验证 |
|---|---|---|
| Git branch/commit/MR/CI | A/B | 幂等、受保护分支、旧 SHA、Webhook 重放 |
| WeKnora 查询/摄取/检索 | A/B | ACL、来源/版本、重复、索引失败和旧版本 |
| DSH 入口/插件 | B | 目标版本 UI/API 扩展、生命周期和身份传递 |
| DSH Skill loader/profile | B | 固定 digest 装载、权限过滤、装载读回和回滚 |
| SkillHub 状态读取 | B | 版本、digest、owner 和状态是否可读 |
| SkillHub 上传/晋升 | C | API、审批、审计、回滚和 webhook；未确认则管理员操作 |
| MCP tools/list/call | A/B | profile 过滤、schema、ACL、审批、超时和取消 |
| OTel/观测出口 | B | DSH 事件出口、隐私策略和 run/job/asset 关联 |
| 多租户 Gateway | B | 身份、密钥、workspace 隔离和跨域拒绝 |
| 高风险 Agent 发布 | D（默认） | 人工 approval、服务端 policy、读回和回滚 |

## 3. 首先做的实验

### V-01：Git provider contract

使用 fake provider 覆盖 branch、batch commit、MR、pipeline 和状态读取；再在隔离项目验证 protected main、expected base/head SHA、Webhook 签名、重复和乱序事件。

**通过条件：**重复请求不重复创建资源；所有动作能关联 actor、job、commit、MR 和 pipeline；旧 head SHA 合并被拒绝。

### V-02：WeKnora 索引和检索

准备测试知识库和两个 workspace，上传带 canonical key、source commit、version、sensitivity 的脱敏文档，测试重复、ACL、hybrid search、旧版本、退役和索引失败。

**通过条件：**结果返回 document/version/source；跨 workspace 拒绝；索引失败不覆盖旧版本；`approved` 不被错误标成 `published`。

### V-03：DSH 入口和 Skill loader

创建只读测试插件或 API bridge，验证入口注册、profile 传递、固定 Skill digest 装载、权限过滤、重启、升级、卸载、失败清理和回滚。

**通过条件：**实际装载版本可读回；Skill 声明的 effects 不能突破 profile/tool policy；失败则使用管理员安装或外部 Web/API 向导。

### V-04：SkillHub capability discovery

固定目标版本和部署方式，查找官方 REST/CLI/API，测试 upload、metadata、beta/stable、digest、revoke、audit、webhook 和 DSH 非生产 profile 安装。

**通过条件：**发布结果、digest、安装结果和回滚都可查询；否则锁定管理员 fallback，但保留 Skill 管理闭环。

### V-05：Skill contract and regression

用一个低风险 Skill 验证 input/output schema、缺字段、未知字段、超大输入、知识依赖缺失、effects 与 profile 冲突、golden cases、回归失败、digest 变化和旧版本回滚。

**通过条件：**契约或权限冲突阻止发布/装载；回归失败不能晋升 beta/stable；运行记录包含 Skill version/digest、profile 和知识引用。

### V-06：MCP security contract

测试合法/非法/超大参数、无 token、跨 workspace、过期 token、无 approval、幂等、超时、断连和 cancellation；确认高风险工具默认不出现在普通 Agent 的列表中。

**通过条件：**拒绝有稳定错误码和审计；工具结果与真实 provider 状态一致；日志和 trace 无 token、Cookie 和敏感正文。

## 4. 通用安全检查

| 检查 | 方法 | 必须结果 |
|---|---|---|
| Secret 泄露 | 扫描 Git、日志、trace、错误响应 | 无 token、Cookie、密钥 |
| 跨 workspace | 构造资源 ID 和 Webhook | 全部拒绝 |
| Webhook 重放 | 重复 event/旧 timestamp | 不重复执行 |
| 越权合并/晋升 | 普通用户调用 merge/promote | 拒绝并审计 |
| 权限冲突 | Skill effects 超出 profile | 发布和装载均拒绝 |
| 参数注入 | 工具参数携带外部指令 | 只按 schema/策略处理 |
| 外部响应污染 | provider 返回恶意文本 | 不直接成为系统指令 |
| 任意文件上传 | 脚本、超大文件、路径穿越 | 拒绝或隔离 |
| 审计完整性 | 反查 actor/job/asset/version/digest | 每个写动作可追溯 |

## 5. 当前结论

第一版优先 fake provider、一个真实 Git/WeKnora 隔离环境和一个低风险 Skill 的非生产回放。SkillHub 自动发布、DSH UI/loader、MCP 高风险工具和完整 Gateway 都必须先有实验结果，不能因为设计了 adapter 就视为已接通；但这些实现未验证不影响 Skill 管理作为产品核心能力继续交付。
