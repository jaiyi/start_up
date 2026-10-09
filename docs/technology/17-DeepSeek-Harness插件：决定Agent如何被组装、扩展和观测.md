# 17 · DeepSeek Harness 插件：决定 Agent 如何被组装、扩展和观测

> 目标：用最直白的方式讲清 DeepSeek Harness（下文简称 dsh）里的 plugin（插件）到底是什么。本文面向刚入门的读者，但会按照软件工程师视角展开：插件框架的核心概念、最小可运行示例、插件能做什么、怎么装进 dsh、动态插件、插件与 Skill 的区别、学习路径和常见坑。所有代码和机制描述均来自 dsh 官方文档（Cordis 入门、Cordis 教程、子系统文档），不是概念推演。

---

## 1. 一句话定义

先给结论：

> dsh 的插件是一个 TypeScript 代码包，装进 dsh 后**改造 agent 的运行时本体**——给它加工具、加服务、加界面、接 MCP、加观测出口。

如果你刚入门，只需要记住这个类比：

```text
dsh 本体        ≈ 一部装好系统的手机
插件            ≈ App
Skill           ≈ 你写给手机里 AI 助手看的说明书（不改手机本身）
```

dsh 的口号是 **everything-is-a-plugin**——连"agent 本身"都不是写死的主程序，而是一堆插件组合出来的结果。这听起来玄，实际含义很朴素：

```text
你以为的 agent：一个大 exe，功能写死在里面
实际的 dsh：    一份插件清单（cordis.yml），
               工具是插件、LLM 连接是插件、界面是插件、
               连"会话管理"都是插件
               ——换掉清单里的插件，就得到另一个 agent
```

所以"插件"在 dsh 里不是"附加功能"的意思，而是**构成方式**的意思。理解了这一点，后面所有内容都是在回答一个问题：这些插件是怎么拼起来的。

---

## 2. 它在知识复利系统中的位置

这个系列 06 号文档讲过 Harness 是什么：模型负责生成，harness 负责维护会话、组织 ReAct 循环、执行工具调用、管理权限与沙箱。

dsh 是目前最彻底践行"everything-is-a-plugin"的开源 harness（TypeScript、MIT 协议、DeepSeek 官方维护）。对知识复利工程师，它的插件体系值得学，因为：

```text
01. 它是"agent 如何被工程化组装"的公开范本——
    你能看到工具注册、事件拦截、权限控制是怎么变成代码的；
02. 它的插件市场生态（观测、MCP、UI、Skill 装载）就是
    小团队组织 AI 能力资产的最小参照；
03. 我们在 product-analysis 里设计的 Skill 资产七层结构、
    registry 治理、遥测回填，落地时都绕不开
    "能力以什么形态装进 agent"这个问题——
    dsh 的答案就是插件。
```

相关调研已沉淀在 `docs/product-analysis/agent-learning-systems/skillhub-vs-skills-manager-and-a2a-skill-design.md`（Skill 资产与 registry 视角），本文补的是插件本身的机制视角。

---

## 3. Cordis：插件体系的地基

dsh 的插件系统不是自己发明的，而是 vendor（内嵌拷贝）了一个叫 **Cordis** 的插件框架。小白只需要掌握五个概念，全部来自官方《Cordis 入门》：

### 3.1 五个核心概念

**① 插件是实现 Service 的对象。**

最小的插件就是一个带 `apply(ctx)` 函数的模块：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}
```

Cordis 加载它时调用 `apply(ctx)`，你在里面注册你想贡献的一切。除了函数，还有对象形态（带 `apply` 方法）和类形态（`Service` 子类，需要公开服务时用）。

**② 上下文（ctx）是服务的容器。**

每个服务占一个稳定的 `ctx.<key>`，比如 `ctx.tools`（工具注册表）、`ctx.llm`（模型流）、`ctx.sessions`（会话）。其他插件通过 key 查找服务，**不 import 具体实现**——所以工具插件和界面插件互不认识，却能协作。

**③ 通过 `inject` 声明依赖。**

```ts
export const inject = ['tools']
```

声明了 `inject` 的插件会等这些服务就绪才启动。**加载顺序由依赖表达，不由清单里的位置决定**——清单里各项是并发启动的，谁先谁后看谁的服务先就绪。

**④ 类型化事件用于通信。**

服务可以发事件，别的插件监听。五种分发模式（初学先记住前两种就够）：

| 模式 | await？ | 顺序 | 返回值 | 典型用途 |
|---|---|---|---|---|
| `emit` | 否 | 注册顺序 | 否 | 观察："发生了 X" |
| `waterfall` | 否 | 注册顺序 | 是 | 中间件：逐层包裹/可短路 |
| `parallel` | 是 | 并行 | 否 | 并行扇出 |
| `serial` | 是 | 注册顺序 | 是 | 按序处理 |
| `bail` | 否 | 直到有人 bail | 是 | 第一个有答案的说了算 |

**⑤ 注册是可逆的副作用。**

工具 schema、事件监听器都是通过 `ctx.effect()` / `ctx.on()` 安装的，插件卸载时**自动回卷**（disposer 模式）。这是热替换能成立的原因——插件来无影去无踪，不留垃圾。

### 3.2 一个直觉总结

```text
ctx     = 插件共用的大插座板
service = 插在插座上的电器（ctx.tools、ctx.llm…）
inject  = "这个电器要等某个插座有电才开机"
事件     = 电器之间的广播频道
effect  = 每根电线都带自动回收功能
```

---

## 4. 组合：cordis.yml 就是 agent 的零件清单

单个插件没有意义，**清单才有意义**。dsh 启动时读一份插件列表（教程里是 `cordis.yml`，真实 dsh 里是 profile 的 `cordis.patch.yml`），把所有插件挂载起来：

```yaml
# 教程示例：三行清单 = 一个能跑的应用
- name: '@deepseek-ai/dsh-system-prompt'   # 提供系统提示词服务
- name: './tool-logger.ts'                  # 你的观察插件
- name: './greet-tool.ts'                   # 你的工具插件
```

真实 dsh 的 base profile（`packages/bundle/base/cordis.patch.yml`）就是一份更长的同类清单，再由部署 overlay 逐层 patch。**换 profile = 换一份清单**——官方随包提供 Web 和 headless 两种模板，你也可以组合自己的。

清单条目还有几个有用的元数据（第 6 章教程）：

```yaml
- id: greeter           # 稳定标识：改配置时能区分"修改"与"删了再加"
  name: './greeter.ts'
- id: consumer
  name: './consumer.ts'
  disabled: true        # 保留条目但不挂载；改回即恢复
```

### 4.1 热模块替换（HMR）

`@deepseek-ai/dsh-hmr` 插件监视文件，保存时执行"先卸载旧实例（effect 回卷）→ 再加载新代码"。编辑 `cordis.yml` 本身也触发更新——loader 按 `id` 对比，只挂载/卸载发生变化的部分。

这就是"改一个插件，不用重启整个 agent"的机制来源。

---

## 5. 插件能做什么：三个真实例子

### 5.1 注册一个模型可调用的工具

来自官方教程第 7 章，完整可运行：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet the named person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Who to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

注意四件事，每一件都是工程化的体现：

```text
inject: ['tools']          → 等工具注册表就绪才启动
ctx.tools.register(...)    → 注册 disposer 自动附着，卸载时注销工具
defineTool 的 parameters   → 自动转成给模型看的 JSON Schema，
                             并在 execute 前校验模型给的参数
output.schema + render     → 返回值受 schema 约束，渲染单独声明
```

**这就是"工具不是 prompt 里的一段描述，而是注册表里的一条记录"**——加工具等于注册，不需要改 agent 主程序。

### 5.2 观察每一次工具调用

同章的第二个插件，与第一个互不知晓：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'tool-logger'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    console.log(`[tool-logger] ${exec.name} -> done`)
  })
}
```

这个模式就是所有观测类插件的原型——Higress 那篇 DSH 可观测实践里的 `@loongsuite/dsh-plugin`（监听 Session/Turn/Step 生命周期、构建调用树、直发 OTLP）本质上是这个例子的工业级放大。

### 5.3 拦截与策略：waterfall

`ctx.waterfall` 是环绕中间件：监听器收到 `(...args, next)`，调 `next()` 委托下游，不调直接返回就短路。官方文档明确说：**对于单决策事件，短路是设计意图**——拥有决策权的策略监听器可以直接拍板。权限、审批、内容过滤这类"要拦住"的需求都走这个模式。

---

## 6. 动态插件：agent 自己写插件

dsh 有一个进阶能力（`extensions` 子系统，`ctx.dynamicCordisRunner`）：**agent 在会话中现场定义插件**——写代码、带版本（immutable Package）、走审批后运行。要点：

```text
- 会话拥有插件：define/undefine 都要求 Session 归属；
- Host 半与 Client（浏览器）半分开运行；
- 未经授权的 Client 包要等审批；可以选择"批准此插件的所有未来版本"；
- 每个版本不可变（immutable Package），回滚 = 切回旧版本。
```

对小白先建立印象即可：dsh 把"agent 造工具"也纳入了插件的同一套治理模型（版本、审批、可撤销），而不是让 agent 乱跑 shell。这是"everything-is-a-plugin"哲学的延伸——连运行时自产的能力都要走正门注册。

---

## 7. Plugin 和 Skill 的区别（十秒版）

详细对比在 product-analysis 调研文档 §9，这里给最短版：

| | Plugin（插件） | Skill |
|---|---|---|
| 本质 | 代码资产（TypeScript 包） | 文本资产（说明书） |
| 生效方式 | 注册服务/工具/UI，改运行时 | 被调用时注入模型上下文 |
| 决定 | agent "能调用什么" | 模型 "知道该怎么做" |
| 典型失败 | bug、权限越界 | 模型读了不照做 |
| 修改成本 | 走代码工程流程 | 改一个 Markdown |

一个容易混淆的事实：**装载 Skill 的机制本身是插件**（skill 注册表、本地目录发现、面向模型的 skill 工具都是 Cordis 包）。"机制是插件，内容是 Skill"——分清这两层，dsh 的架构图就看懂了一大半。

---

## 8. Plugin 不是唯一解法：六种"把能力装进 agent"的模式

看到这里容易产生一个误解：以为插件就是给 agent 加能力的唯一方式。实际上业界至少有六种模式，**它们回答的是不同的问题，不是六个竞争方案**。先上总表：

| 模式 | 能力以什么形态存在 | 生效位置 | 谁来加 | 典型代表 | 入门类比 |
|---|---|---|---|---|---|
| ① 一体化内置 | 运行时源码，写死 | 进程内 | 平台开发者 | 早期 CLI agent、多数 demo | 焊死在主板上的功能 |
| ② 插件（微内核） | 代码包 | 进程内，运行时挂载 | 第三方开发者 | dsh + Cordis、VS Code、浏览器扩展 | 给手机装 App |
| ③ 外部工具协议 | 独立进程/服务 | 进程外，协议调用 | 服务提供方（任何人） | MCP | USB 外设 |
| ④ 文本资产 Skill | 说明书（Markdown） | 模型上下文内 | 用户/团队任何人 | Agent Skills、dsh skill | 给 AI 助手的操作手册 |
| ⑤ 代码图组装 | 开发者写的应用代码 | 构建期组合 | 应用开发者 | LangGraph、openJiuwen agent-core | 自己拼乐高 |
| ⑥ 服务化多 agent | 一个完整的独立 agent | 网络对面 | 其他团队 | A2A 协议、编排调度 | 微服务 / 外包给别的公司 |

### 8.1 逐个说清：各自解决什么问题

**① 一体化内置**——最原始的形态：工具直接写在 agent 主程序里。简单可靠，但加任何能力都要改主程序发新版本。它不是"被淘汰的方案"，而是所有系统的底座：dsh 的 base profile 本质上也是一份写好的内置组合，只是组合方式开放了出来。

**② 插件（dsh 的解法）**——解决的问题：**怎么让第三方在不改我主程序的情况下，把代码装进我的进程里**。能力最强（能加工具、加服务、改 UI、拦截事件），但信任要求也最高——插件代码在你的进程里跑，一个 bug 或恶意插件能碰到运行时的一切，所以需要版本、审批、effect 回卷这套治理（§6 动态插件就是它的极致形态）。

**③ MCP 外部工具协议**——解决的问题：**怎么让能力提供方完全不碰我的进程**。工具活在一个独立服务里，agent 通过标准协议调用。信任边界从"进程内"移到"网络+协议"：服务挂了只影响这一个工具，升级不用动 agent，任何语言都能写。代价是能力受限——你只能"提供工具"，不能改 agent 的内部行为（拦不了事件、加不了 UI）。类比 USB：外设随便换，但外设永远改不了手机的操作逻辑。

**④ Skill 文本资产**——解决的问题：**怎么让不会写代码的人教模型做事**。一份说明书装进上下文，模型"知道该怎么做"。门槛最低（改 Markdown 就行、目录热刷新），但也最不可强制——模型可能读了不照做（§7 的"典型失败"）。它和插件的分工在 §7 已经讲过：插件决定"能调用什么"，Skill 决定"知道该怎么做"。

**⑤ 代码图组装**——解决的问题：**开发者怎么从零拼一个自己的 agent 应用**。LangGraph 这类框架把"节点、边、状态、checkpoint"给你当乐高，你写的整个应用就是图。和插件模式的本质区别：**组合发生在构建期，且组合的人是应用开发者，不是运行时的插件市场**。适合"要一个定制 agent"的团队，不适合"要一个可被生态扩展的平台"。

**⑥ 服务化多 agent（A2A）**——解决的问题：**怎么用别人的 agent**。能力单位不再是工具或说明书，而是一个完整的 agent（带它自己的模型、权限、治理），跨网络协商调用。这是跨团队编排的形态——我们 product-analysis 里的 skillhub-vs-skills-manager 调研里 agent-card 协商层、七层 Skill 资产设计，就是为这一格做准备的。

### 8.2 两条关键对比线

**信任边界线**（越往上信任要求越高、治理越重）：

```text
④ Skill（只是文本，最多"骗"到模型）
③ MCP（网络边界 + 协议 schema 约束）
② 插件（代码跑在你进程里，什么都碰得到）
```

**扩展成本线**（越往上门槛越低、能加的人越多）：

```text
⑤ 代码图（要会写整个应用）
② 插件（要会 TypeScript + 插件工程）
③ MCP（要会写后端服务）
④ Skill（会写文档就行）
```

两条线一交叉就看清了各自的位置：**功能强度和准入门槛是同向的**——插件最强也最贵，Skill 最弱也最便宜。这就是为什么真实系统从不二选一。

### 8.3 正确的理解：不是选一个，是叠着用

dsh 自己就是活例子——它同时用了六种里的四种：

```text
① base profile 是官方写死的内置组合
② Cordis 插件体系（本文主题）
③ mcp 子系统本身是个插件，把外部 MCP 服务接进来
④ skill 能力族也是插件，装载文本说明书
（将来跨团队调度时，⑥ A2A 也从插件层接入）
```

所以"plugin 是 DeepSeek 的解法"这句话要修正为：**plugin 是 dsh 的总装接口**——其他模式（MCP、Skill、A2A）在 dsh 里最终都以插件的形式接进运行时。这和小团队选型时的启示一致（product-analysis 调研的结论）：

```text
要加一个现成工具   → 先看 MCP 生态有没有（最省）
要教模型做事方法   → 写 Skill（最轻）
要改 agent 行为    → 写插件（最强，最重）
要跨团队用别人能力 → A2A 服务化（最远，最正式）
```

先穷尽上面两种，再考虑写插件——这是给"想加能力"的人的默认顺序，和 06 号文档"能用提示词解决就不上工具，能用工具解决就不上框架"是同一个克制原则。

## 9. 小白上手路径

不需要读源码，官方有七步教程（`docs/cordis-tutorial/`），每章一个可运行的小例子：

```text
第 1 步   跑通 hello.ts —— apply(ctx) 是什么
第 2 步   生命周期与 effect —— 卸载时会发生什么
第 3 步   服务 —— Service 子类与 ctx 键
第 4 步   事件 —— 五种分发模式
第 5 步   配置 —— config 字段与 overlay
第 6 步   组合与 HMR —— cordis.yml、id、disabled、PENDING 诊断
第 7 步   进入 harness —— 注册真工具、观察 tools/result
```

第 7 章跑通后，对照 base profile 的 `cordis.patch.yml` 逐项认插件名，就能读懂一个真实 agent 是怎么拼出来的。再往后按需读：构建工具（`docs/user/develop/basic/tool.zh.md`）、三层能力设计（`docs/user/develop/practice/`）、各子系统页面的 cordis-surface 区块（可注入、可监听的全部清单）。

---

## 10. 常见坑（全部来自官方教程的现身说法）

1. **`apply` 抛异常 → 进程直接死**。插件加载失败会明确报错，不是跳过这一项继续跑。
2. **模块名拼错 → 静默失败**。路径或包名解析失败只走 logger 报告，可能比 console 导出器启动还早而丢失——"新增配置项没有任何效果"时先查拼写。
3. **`inject` 的服务没人提供 → 永远 PENDING，无提示**。PENDING 是合法状态（提供方可能晚到），所以不会报错。官方教程给了诊断插件：遍历 `ctx.registry`，打印所有 `FiberState.PENDING` 的 fiber 名。
4. **清单条目不带 `id` → 每次读配置都生成新 id**。任何编辑都会被视为"删除再加"而重挂载。想让 loader 精确 diff，就显式写 `id`。
5. **组合里漏了服务的提供方 → 依赖它的插件集体 PENDING**。教程第 7 章的例子：工具插件要向系统提示词贡献 schema，清单里就必须有 `@deepseek-ai/dsh-system-prompt`。

---

## 11. 与其他模块的关系

- **06-Harness**：本文是它在具体开源实现上的机制展开——工具注册、事件、权限如何变成代码；
- **16-MCP**：MCP 服务是被插件接进来的外部工具源（mcp 子系统本身就是 Cordis 包）；
- **product-analysis / SkillHub 对比调研**：registry、Skill 资产七层结构、遥测回填——那些是"资产管理"视角，本文是"运行时装配"视角，两者合起来才是完整图景；
- **12/13-认知流程层**：dsh 展示了"agent 是被组装出来的"这一工程事实——认知流程层的每一段能力，落地时都可以对应到一份插件清单。

---

## 12. 后续要验证的问题

1. 照教程第 1→7 章走一遍，验证本文第 5 节的代码在当前 master 上仍然可运行；
2. 自写一个最小观测插件（监听 `tools/result` 聚合统计），对比 `@loongsuite/dsh-plugin` 的实现差距——作为团队遥测回填管道的练手；
3. base profile 的 `cordis.patch.yml` 逐项注释：一份"真实 agent 零件清单"的翻译，可作为团队内训材料；
4. 动态插件的审批流程在企业多人环境如何治理（审批人是谁、未来版本授权的边界）；
5. 插件市场（awesome-dsh-plugin.com）的安装、更新、卸载在私有化环境的可行路径——与 SkillHub registry 的收编方案对照。
