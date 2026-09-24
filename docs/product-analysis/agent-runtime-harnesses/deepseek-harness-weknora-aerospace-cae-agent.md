# WeKnora + DeepSeek Harness：航天 CAE Simulation Agent 整体方案

## 0. 一句话结论

如果以 WeKnora 作为知识底座、以 DeepSeek Harness 作为 Agent 能力层界面，航天 CAE Simulation Agent 的合理形态不是“把仿真资料上传到知识库，然后让模型回答问题”，而是：

```text
WeKnora 负责稳定工程知识、历史报告、规范、案例和经验的检索增强；
DeepSeek Harness 负责任务理解、Agent 编排、工具调用、人审、状态推进和审计；
LangGraph 负责 Agent 内部的认知步骤编排；
Temporal 负责 solver、后处理、报告生成等长任务的可靠执行、等待、恢复和补偿；
CAE 工具链负责真实模型解析、求解、后处理和数值计算；
Postgres 负责任务动态状态；MinIO / 文件存储负责模型文件、结果文件、报告版本和可复现 trace。
```

也就是说，WeKnora 是知识底座，不是动态状态库；DeepSeek Harness 是 Agent 能力层和任务执行控制面，不是数值求解器；CAE 求解器和后处理工具才是工程计算事实来源。

---

## 1. 产品定位

面向航天领域的 CAE Simulation Agent 可以定位为：

```text
面向航天结构、热、流体和多物理场仿真任务的工程智能体工作台。

它围绕一个仿真 case，帮助工程师完成需求解析、工况整理、模型检查、仿真方案草稿、工具调用、求解监控、结果解释、裕度计算、V&V checklist、报告草稿和经验沉淀。

其中，高风险工程结论、材料许用值、载荷工况、边界条件、正式裕度和报告发布必须由工程师确认。
```

第一版推荐聚焦：

```text
航天结构件静力 + 模态分析 Agent
```

典型样板：

```text
卫星电子设备安装支架 / 舱段局部结构 / 载荷适配器 / 天线支撑结构。
```

---

## 2. 三层核心分工

### 2.1 WeKnora：知识底座

WeKnora 适合承载稳定知识和可检索资料：

- 航天结构分析规范；
- 仿真建模指南；
- 材料手册说明；
- 载荷工况定义规则；
- 历史仿真报告；
- 试验报告；
- solver error 处理经验；
- V&V checklist；
- 报告模板；
- 典型 case 复盘；
- 审查意见沉淀。

WeKnora 不适合承担：

- 当前 case 状态；
- solver run 状态；
- 文件 hash；
- 工具调用日志；
- 审批状态；
- 任务幂等；
- 动态报告版本；
- 正式材料库 source of truth；
- 正式 PLM / PDM 设计基线。

### 2.2 DeepSeek Harness：Agent 能力层界面

DeepSeek Harness 负责把 DeepSeek 模型放进可控流程：

- 对话入口；
- 任务协议；
- Agent / Skill 编排；
- 上下文装配；
- WeKnora 检索调用；
- MCP / API 工具调用；
- 人审节点；
- 长任务状态；
- 权限策略；
- trace 和审计；
- 评测和回归。

它是工程师看到的主要 Agent 界面，也是系统内部的任务运行控制面。

### 2.3 CAE 工具链：计算事实来源

CAE 工具链负责真实计算和文件处理：

- FEM / CAD 解析；
- 网格质量检查；
- 求解器 deck 生成；
- solver 调度；
- solver log 读取；
- 结果文件解析；
- 应力 / 位移 / 频率提取；
- 裕度计算；
- 云图生成；
- 报告文件生成。

DeepSeek 只能解释工具结果，不能自己编造数值结果。

---

## 3. 总体架构

```text
工程师 / 审核人 / 项目负责人
        │
        ▼
DeepSeek Harness Agent 界面
├── 对话入口
├── 仿真 Case 工作台
├── 审核 / 审签入口
├── 报告草稿查看
└── 工具调用和 trace 查看
        │
        ▼
DeepSeek Harness / Agent Runtime
├── 任务协议与上下文装配
├── 人审节点与状态推进
├── 权限、审计、trace、评测
└── 调用 LangGraph / Temporal / MCP Tool Gateway
        │
        ├──────────────► LangGraph：Agent 认知编排
        │                ├── Requirement Agent
        │                ├── Load Case Agent
        │                ├── Model Check Agent
        │                ├── Material & Allowable Agent
        │                ├── Solver Setup Agent
        │                ├── Solver Monitor Agent
        │                ├── Post-processing Agent
        │                ├── Margin Agent
        │                ├── V&V Review Agent
        │                └── Report Agent
        │
        ├──────────────► Temporal：长任务可靠执行
        │                ├── solver workflow
        │                ├── postprocess workflow
        │                ├── report workflow
        │                ├── retry / timeout / compensation
        │                └── wait for human approval signal
        │
        ├──────────────► WeKnora 知识底座
        │                ├── 规范 / 指南 / 模板
        │                ├── 历史报告 / 试验报告
        │                ├── solver error 经验
        │                └── V&V checklist
        │
        ├──────────────► MCP / Tool Gateway
        │                ├── parse_model
        │                ├── check_model
        │                ├── validate_load_cases
        │                ├── submit_solver_run
        │                ├── parse_results
        │                ├── calculate_margin
        │                └── generate_report
        │
        ├──────────────► Postgres 动态状态库
        │                ├── simulation_cases
        │                ├── simulation_runs
        │                ├── simulation_reviews
        │                ├── temporal_workflow_refs
        │                ├── simulation_tool_calls
        │                └── simulation_audit_log
        │
        └──────────────► 文件 / 对象存储
                         ├── BDF / INP / CDB
                         ├── OP2 / ODB / RST
                         ├── solver logs
                         ├── contour plots
                         ├── Markdown / PDF reports
                         └── review packages
```

### 3.1 编排层分工：LangGraph、Temporal 与 BPMN

航天 CAE Agent 里会同时出现三类“编排”，不能混在一起。

```text
LangGraph 管 Agent 怎么思考；
Temporal 管长任务怎么可靠执行；
BPMN 管组织流程和正式审签。
```

| 编排层 | 负责对象 | 典型问题 | MVP 是否需要 |
|---|---|---|---|
| LangGraph | Agent 内部状态图 | 需要检索哪些 WeKnora 知识、调用哪个工具、如何解释日志、如何生成报告草稿 | 需要 |
| Temporal | solver / postprocess / report 等长任务 workflow | 求解跑 2 小时怎么办、worker 挂了怎么办、如何等待人审 signal、如何重试和补偿 | 需要 |
| BPMN | 企业业务流程和正式审签 | 谁审核、谁签字、超时升级、驳回后回到哪一步、流程是否合规 | MVP 可暂缓，正式工程化阶段引入 |

推荐关系：

```text
BPMN / 企业流程层
  └── Service Task 调用 DeepSeek Harness
        ├── LangGraph 执行 Agent 认知编排
        ├── Temporal 执行长任务 workflow
        └── MCP Tool Gateway 执行受控工具
```

MVP 阶段可以先不上 BPMN，但不建议省掉 Temporal。原因是航天 CAE 求解、后处理和报告生成天然是长任务：可能需要排队、等待 license、等待 HPC 资源、运行数十分钟到数小时，并且必须支持失败恢复和人工确认信号。

因此 MVP 推荐取舍是：

```text
必须上：LangGraph + Temporal + MCP Tool Gateway + Postgres + MinIO + WeKnora + DeepSeek。
暂缓上：BPMN、Neo4j、完整 PLM/PDM 集成、全量 HPC 调度。
```

BPMN 最适合在流程稳定后引入，用于正式审签、SLA、委派、退回和流程可视化；Temporal 则从第一版就进入核心架构，用来承载 solver run、postprocess、report package 这类长任务。

---

## 4. WeKnora 知识库设计

### 4.1 知识库分区

建议在 WeKnora 中按“知识用途”而不是文件夹路径来组织。如果 WeKnora 支持知识库、Wiki、标签、文档分类，可以设计为：

| 知识分区 | 内容 | 主要使用者 |
|---|---|---|
| `cae-guidelines` | 结构、热、模态、随机振动、报告编写指南 | Requirement / V&V / Report Agent |
| `material-guides` | 材料牌号说明、许用值使用规则、温度适用范围说明 | Material Agent |
| `load-case-rules` | 发射段载荷、准静态、随机振动、冲击、热工况定义说明 | Load Case Agent |
| `solver-error-knowledge` | Nastran / Abaqus / Ansys 常见错误、warning 和处理经验 | Solver Monitor Agent |
| `historical-cases` | 历史仿真报告、复盘、审查意见 | Planner / Report / V&V Agent |
| `report-templates` | 报告模板、章节模板、审签包模板 | Report Agent |
| `vv-checklists` | V&V 检查表、审查问题清单 | V&V Agent |
| `modeling-patterns` | 典型支架、板壳、连接、RBE/MPC、螺栓简化模式 | Model Check / Solver Setup Agent |

### 4.2 文档元数据

WeKnora 中每个文档最好补充 metadata 或标签：

```text
domain: structure / thermal / cfd / dynamics
analysis_type: static / modal / random_vibration / shock / thermal
asset_type: guideline / report / checklist / solver_error / template
applicable_object: bracket / panel / adapter / antenna_support
solver: nastran / abaqus / ansys / general
status: draft / approved / deprecated
version: v1.0
owner: team_or_person
sensitivity: internal / restricted / confidential
```

这样 Harness 调用 WeKnora 检索时，可以按任务上下文做过滤，而不是把所有知识都塞进同一个 prompt。

### 4.3 WeKnora 检索策略

不同 Agent 应使用不同检索策略。

| Agent | 检索内容 | 检索约束 |
|---|---|---|
| Requirement Agent | 需求模板、分析类型说明、验收准则 | 当前专业域、当前对象类型 |
| Load Case Agent | 工况定义、载荷表模板、历史相似工况 | analysis_type + object_type |
| Material Agent | 材料说明、许用值使用规则 | 材料牌号 + 温度范围 + approved 状态 |
| Model Check Agent | 建模规范、常见建模问题 | solver + element_type + structure_type |
| Solver Monitor Agent | solver error 知识 | solver + error_code |
| V&V Agent | checklist、审查标准、历史审查意见 | analysis_type + review_type |
| Report Agent | 报告模板、历史优秀报告 | report_type + analysis_type |

### 4.4 WeKnora 与正式数据库的边界

WeKnora 检索结果可以作为上下文和引用，但不能直接成为工程事实。

例如：

```text
WeKnora 可以检索到某材料手册说明；
但正式 Margin of Safety 计算必须使用材料库中经批准的 allowable record。
```

```text
WeKnora 可以检索到某历史报告里的支架频率经验；
但当前 case 的一阶频率必须来自当前 run 的结果文件解析。
```

```text
WeKnora 可以检索到报告模板；
但当前报告版本、审签状态和文件 hash 必须在 Postgres / 文件存储中登记。
```

---

## 5. DeepSeek Harness 界面设计

### 5.1 一个入口，多个后台能力

工程师最好只看到一个 CAE Simulation Agent 入口，不需要手动选择十几个 Agent。

```text
CAE Simulation Agent
├── 创建仿真任务
├── 上传模型 / 工况 / 材料
├── 让 Agent 检查缺失信息
├── 生成仿真计划
├── 确认计划并启动求解
├── 查看求解日志和结果
├── 生成报告草稿
└── 提交审核 / 归档经验
```

后台由 Harness 根据状态调用不同 Agent / Skill。

### 5.2 工作台核心页面

第一版可以有 5 个页面：

| 页面 | 内容 |
|---|---|
| Case Overview | case 状态、对象、分析类型、owner、阻塞项 |
| Inputs | 模型文件、载荷表、材料、边界条件、验收准则 |
| Plan & Review | Agent 生成的仿真计划、假设、需确认项、审批记录 |
| Runs & Results | solver run、日志、结果指标、云图、裕度表 |
| Report & Audit | 报告草稿、引用来源、V&V checklist、审签记录、trace |

### 5.3 Agent 对话不替代结构化工作台

对话适合：

- 创建任务；
- 解释阻塞项；
- 询问结果；
- 请求生成报告；
- 追问某个 warning；
- 总结审查意见。

但核心工程对象应结构化展示：

- case；
- model；
- load cases；
- solver runs；
- results；
- margins；
- reviews；
- reports。

---

## 6. Agent 编排流程

### 6.1 创建 case

```text
用户输入：
“我要对这个卫星支架做 X/Y/Z 三向准静态和模态分析，一阶频率大于 100Hz，MS 大于 0。”

DeepSeek Harness：
1. Requirement Agent 解析需求；
2. 调用 WeKnora 检索相关分析模板和 checklist；
3. 创建 simulation_case；
4. 返回缺失输入清单。
```

### 6.2 上传模型和载荷表

```text
用户上传 BDF / INP 和载荷表。

Harness：
1. 写入 file_assets；
2. 计算 sha256；
3. 调用 parse_model；
4. 调用 parse_load_case_table；
5. 写入 simulation_models 和 simulation_load_cases；
6. Model Check Agent 生成模型检查摘要。
```

### 6.3 生成仿真计划

```text
Harness：
1. 从 Postgres 读取 case 结构化状态；
2. 从 WeKnora 检索建模指南、历史相似 case、V&V checklist；
3. DeepSeek 生成计划草稿；
4. 计划草稿写入 simulation_plans；
5. 状态进入 plan_generated。
```

计划必须明确：

- 分析类型；
- 输入文件版本；
- 材料来源；
- 载荷工况；
- 边界条件；
- 求解器；
- 输出请求；
- 裕度准则；
- 假设；
- 风险；
- 需要人工确认项。

### 6.4 人工确认计划

```text
工程师确认：
- 材料；
- 载荷；
- 边界条件；
- 安全系数；
- 求解器设置。

Harness：
1. 记录 simulation_reviews；
2. 追加 audit_log；
3. 状态进入 plan_approved。
```

### 6.5 执行求解

```text
Harness：
1. 调用 generate_solver_deck；
2. 启动 Temporal solver_workflow；
3. workflow 内通过 MCP 调用 run_solver；
4. 创建 simulation_solver_runs 和 temporal_workflow_refs；
5. 长任务进入 running；
6. Solver Monitor Agent 周期读取 workflow 状态和 solver 日志；
7. 失败则按 Temporal retry / timeout / compensation 策略处理；
8. 成功则进入 postprocessing。
```

### 6.6 后处理和裕度计算

```text
Harness：
1. 启动 Temporal postprocess_workflow；
2. workflow 内调用 parse_results；
3. 调用 extract_static_metrics；
4. 调用 extract_modal_metrics；
5. 调用 calculate_margin_of_safety；
6. 保存 simulation_results 和 simulation_margins；
7. DeepSeek 生成结果解释草稿。
```

### 6.7 V&V 和报告

```text
Harness：
1. V&V Agent 检索 checklist；
2. 对照 case 状态、工具结果和报告草稿进行检查；
3. 启动 Temporal report_workflow；
4. Report Agent 生成 Markdown / PDF 草稿；
5. workflow 等待工程师审核 signal；
6. 审核通过后归档；
7. 重要经验作为 knowledge_candidate，提交到 WeKnora 审核发布流程。
```

---

## 7. 上下文装配策略

DeepSeek 的上下文不应只来自 WeKnora，也不应把全部文档塞进去。推荐组合：

```text
Task Context =
  当前 case 结构化状态
  + 当前用户权限
  + 当前状态允许动作
  + 相关工具结果摘要
  + WeKnora 检索片段
  + 文件资产引用
  + 历史反馈和审查意见
```

上下文装配顺序：

1. 从 Postgres 读取 case 当前状态；
2. 根据 case domain / analysis_type / object_type 构造检索 query；
3. 从 WeKnora 检索少量高相关知识；
4. 过滤无权限文档；
5. 加入工具结果摘要，而不是大文件原文；
6. 加入当前状态允许动作；
7. 要求 DeepSeek 输出结构化 JSON 或报告草稿。

---

## 8. 动态状态模型补充

在前一篇 CAE Agent 调研的基础上，如果接入 WeKnora，需要增加知识引用和知识候选表。

### 8.1 `knowledge_references`

记录当前 case 用到了哪些 WeKnora 文档或片段。

```text
knowledge_references
├── id
├── case_id
├── agent_run_id
├── weknora_doc_id
├── weknora_chunk_id
├── title
├── citation_text
├── relevance_score
├── usage_type          # requirement / load_case / model_check / report / vv
├── created_at
└── created_by
```

### 8.2 `knowledge_candidates`

记录从当前 case 产生的候选知识。

```text
knowledge_candidates
├── id
├── case_id
├── source_review_id
├── source_report_ref
├── candidate_type      # lesson_learned / solver_error / modeling_rule / checklist_update
├── title
├── content_draft
├── applicable_domain
├── applicable_analysis_type
├── status              # draft / pending_review / approved / rejected / published
├── reviewer_id
├── published_weknora_doc_id
├── created_at
└── updated_at
```

### 8.3 `agent_runs`

记录 DeepSeek Harness 中每次 Agent 执行。

```text
agent_runs
├── id
├── case_id
├── agent_name
├── model_name
├── prompt_version
├── input_context_hash
├── output_hash
├── status
├── trace_url
├── started_at
└── finished_at
```

### 8.4 `temporal_workflow_refs`

记录 CAE 长任务在 Temporal 中的 workflow 引用。Postgres 只保存业务状态和索引，不替代 Temporal 的执行历史。

```text
temporal_workflow_refs
├── id
├── case_id
├── run_id
├── workflow_type       # solver / postprocess / report / human_review
├── workflow_id
├── run_id_temporal
├── status              # running / completed / failed / canceled / timed_out
├── last_signal         # plan_approved / solver_cancel_requested / report_reviewed
├── last_error_summary
├── started_at
├── updated_at
└── closed_at
```

关键边界：

```text
Temporal 负责 workflow / activity / retry / timeout / signal；
Postgres 负责 case 当前业务状态、审计索引和界面查询；
Agent 不直接改 Temporal 历史，只能通过 Harness 发起 workflow、发送 signal 或查询状态。
```

### 8.5 `file_assets`

记录文件资产。

```text
file_assets
├── id
├── case_id
├── file_type           # model / load_table / solver_input / solver_output / log / plot / report
├── storage_uri
├── sha256
├── size_bytes
├── version
├── produced_by_tool_call_id
├── created_by
└── created_at
```

---

## 9. WeKnora 回写策略

WeKnora 不应该被 Agent 任意写入。建议采用候选知识流程。

```text
仿真 case 完成
  ↓
DeepSeek 总结高价值经验
  ↓
生成 knowledge_candidate
  ↓
工程师 / 知识管理员审核
  ↓
通过后写入 WeKnora 源文档或 Wiki
  ↓
触发 WeKnora 重新抽取 / 索引
  ↓
新知识可被后续 case 检索
```

候选知识类型：

| 类型 | 示例 |
|---|---|
| solver error 经验 | Nastran 某 fatal error 的排查路径 |
| 建模规则 | 某类支架安装孔附近需要局部细化 |
| 工况模板 | 某类载荷适配器三向准静态组合模板 |
| 报告审查项 | 某类报告必须说明 RBE 简化依据 |
| 设计经验 | 某类筋板高度对一阶频率影响明显 |

关键边界：

```text
Agent 可以生成候选知识；
人类审核后才能发布到 WeKnora；
正式规范和材料许用值不能由 Agent 自动覆盖。
```

---

## 10. Tool / MCP 设计

### 10.1 WeKnora 检索工具

```text
search_weknora_knowledge
```

输入：

```json
{
  "case_id": "case_001",
  "query": "satellite bracket modal analysis frequency requirement",
  "domain": "structure",
  "analysis_type": "modal",
  "asset_types": ["guideline", "historical_case", "checklist"],
  "top_k": 5
}
```

输出：

```json
{
  "results": [
    {
      "doc_id": "doc_001",
      "chunk_id": "chunk_010",
      "title": "结构模态分析指南",
      "snippet": "...",
      "metadata": {
        "domain": "structure",
        "analysis_type": "modal",
        "status": "approved"
      },
      "relevance_score": 0.87
    }
  ]
}
```

### 10.2 Case 状态工具

```text
get_simulation_case_context
update_simulation_case_status
record_agent_run
record_knowledge_reference
record_knowledge_candidate
```

### 10.3 CAE 工具

```text
parse_model_file
check_model_integrity
parse_load_case_table
validate_material_allowables
generate_solver_deck
submit_solver_run
get_solver_run_status
read_solver_log
parse_solver_results
extract_static_metrics
extract_modal_metrics
calculate_margin_of_safety
generate_report_draft
```

### 10.4 人审工具

```text
create_review_request
record_review_decision
list_pending_reviews
```

所有写工具必须：

- schema 校验；
- 权限校验；
- 状态机校验；
- 幂等校验；
- 审计记录；
- 高风险动作人审。

---

## 11. 第一版开源组件组合

建议 MVP 采用尽量少的组件。

| 能力 | 推荐组件 | 说明 |
|---|---|---|
| 知识底座 | WeKnora | 规范、历史报告、案例、错误经验、模板 |
| Agent 能力层 | DeepSeek Harness | 对话、Agent 编排、工具调用界面 |
| 模型 | DeepSeek API / 私有 DeepSeek | 需求解析、日志解释、报告生成 |
| Tool Gateway | FastAPI + Pydantic + MCP SDK | 工具 schema、权限、审计 |
| 状态库 | PostgreSQL | case、run、review、tool call、audit |
| 文件存储 | MinIO | FEM、结果、日志、报告 |
| Agent 编排 | LangGraph | 显式多 Agent 状态图，可逐步替换/嵌入 Harness |
| 长任务可靠执行 | Temporal | solver run、后处理、报告生成、人审 signal、retry、timeout、compensation，MVP 直接采用 |
| 业务流程 / 审签编排 | MVP 暂不上 BPMN；后续 Camunda / Flowable | 等审签流程稳定、需要 SLA / 委派 / 可视化治理时引入 |
| FEM 解析 | pyNastran | BDF / OP2 优先 |
| 后处理 | pyNastran + PyVista | 指标和云图 |
| 报告 | Markdown + Pandoc | 报告草稿和 PDF |
| Trace | Langfuse | LLM 和 Agent trace |
| 测试 | pytest + golden cases | 工具和回归测试 |

第一版不建议立刻引入太重的 BPMN、Neo4j、完整 PLM 集成和全量 HPC 调度。等单条 case 闭环跑通后再加。

### 11.1 MVP 的编排取舍

MVP 不再采用“Celery + Redis，生产再升级 Temporal”的长任务路线，而是直接采用 Temporal。原因是航天 CAE 的核心动作不是秒级后台 job，而是带有等待、失败恢复、人审信号和可追溯要求的长周期工程 workflow。

```text
solver run 可能等待 license / 队列 / HPC 资源；
postprocess 可能依赖大结果文件和多步解析；
report package 可能需要等待人工审核、补充材料和重新生成；
这些都不是普通短任务队列最擅长处理的问题。
```

推荐 MVP 分工：

| 模块 | MVP 取舍 | 原因 |
|---|---|---|
| LangGraph | 采用 | 管 Agent 自动节点内部的认知编排，例如需求解析、知识检索、日志解释、结果摘要、报告草稿生成 |
| Temporal | 采用 | 管 solver / postprocess / report workflow 的可靠执行、等待、重试、超时、补偿和 human signal |
| BPMN | 暂缓 | 先不把企业审签流程做重，避免 MVP 被流程建模拖慢；等审签链路稳定后再引入 |
| Postgres review 表 | 采用 | 记录计划审批、材料确认、结果审核、报告审签等结构化人审结果 |
| Temporal signal | 采用 | 人审通过、驳回、取消、补充材料等动作通过 signal 推进长任务 workflow |
| MCP Tool Gateway | 采用 | 所有模型解析、求解提交、结果解析、裕度计算、报告生成都必须走受控工具边界 |

边界要明确：

```text
LangGraph 不负责 solver 长任务可靠性；
Temporal 不负责 LLM 推理和 Agent 决策；
BPMN 不负责具体求解任务执行；
MCP 不负责业务流程，只负责工具 schema、权限、幂等和审计；
WeKnora 不负责动态状态，只负责稳定知识检索；
Postgres 不负责大文件，只负责业务状态和索引；
MinIO 不负责业务状态，只负责文件资产；
DeepSeek 不直接操作工程系统，只通过 Harness 和 MCP 调用受控能力。
```

MVP 的人审实现可以先采用：

```text
Postgres simulation_reviews
  + DeepSeek Harness 审核入口
  + Temporal wait for signal
  + audit_log
```

也就是说，计划审批、求解确认、报告审签先不建 BPMN 流程图，而是作为 case 状态机和 review record 管理。当流程稳定、角色复杂度上升、需要 SLA / 委派 / 抄送 / 退回路径 / 可视化流程治理时，再把 BPMN 接到 Harness 外层。

---

## 12. MVP 里程碑

### Milestone 0：知识底座准备

输出物：

1. WeKnora 中建立 CAE 知识库或分类；
2. 上传 5-10 份样例文档：规范、报告模板、solver error、V&V checklist、历史 case；
3. 为文档打 metadata；
4. 验证检索结果是否能按 domain / analysis_type / asset_type 返回。

验收标准：

- 输入“支架模态分析频率要求”，能检索到相关指南和 checklist；
- 输入 solver error，能检索到处理经验；
- 检索结果带文档引用。

### Milestone 1：状态库和文件资产

输出物：

1. Postgres 表：case、model、load_case、run、result、margin、review、tool_call、audit、file_asset、temporal_workflow_ref；
2. MinIO 文件存储；
3. 文件上传、hash、版本登记；
4. case 状态机。

验收标准：

- 上传 BDF / INP 后生成 file_asset；
- case 能从 created 推进到 model_uploaded；
- 所有文件有 sha256。

### Milestone 2：CAE 工具封装与 Temporal 长任务

输出物：

1. `parse_model_file`；
2. `check_model_integrity`；
3. `parse_load_case_table`；
4. Temporal `solver_workflow`，内部调用 `run_solver` 或 mock solver；
5. Temporal `postprocess_workflow`，内部调用 `parse_solver_results`；
6. `calculate_margin_of_safety`；
7. Temporal `report_workflow`，内部调用 `generate_report_draft`；
8. `wait_for_human_approval` signal；
9. retry / timeout / cancellation / compensation 策略。

验收标准：

- 一个样例 case 能从模型解析到报告草稿；
- 工具调用写入 audit；
- solver workflow 能记录 Temporal workflow id；
- solver 失败能被记录并触发 retry / compensation；
- 人审动作能通过 Temporal signal 推进 workflow。

### Milestone 3：DeepSeek Harness 接入

输出物：

1. Requirement Agent；
2. Model Check Agent；
3. Solver Log Agent；
4. Result Interpreter Agent；
5. Report Agent；
6. WeKnora 检索上下文注入；
7. agent_runs trace。

验收标准：

- Agent 能根据用户需求创建 case；
- Agent 能引用 WeKnora 文档生成计划草稿；
- Agent 能解释 solver log；
- Agent 生成的报告草稿包含工具结果和引用来源。

### Milestone 4：人审闭环

输出物：

1. 计划审批；
2. 材料 / 载荷确认；
3. 求解执行确认；
4. 结果审核；
5. 报告审签；
6. 审核意见回写 case。

验收标准：

- 没有计划审批不能启动求解；
- 没有报告审签不能进入 approved；
- 审核意见能被 Agent 总结成修改清单。

### Milestone 5：知识回写和评测

输出物：

1. knowledge_candidate；
2. WeKnora 发布审核流程；
3. golden cases；
4. prompt / report / log explanation 回归测试；
5. bad case 管理。

验收标准：

- case 完成后能生成候选知识；
- 人审后可发布到 WeKnora；
- 至少 3 个 golden case 能稳定回归。

---

## 13. 第一版 Demo 流程

Demo 名称：

```text
卫星电子设备安装支架静力 + 模态分析 Agent
```

输入：

```text
- BDF / INP 模型文件；
- 载荷工况表；
- 材料名称或材料记录；
- 约束说明；
- 一阶频率要求；
- MS 要求；
- 报告模板。
```

流程：

```text
1. 工程师在 DeepSeek Harness 中创建 case。
2. Agent 解析需求并调用 WeKnora 检索相关指南。
3. 工程师上传 FEM 和载荷表。
4. Tool Gateway 解析模型和载荷。
5. Model Check Agent 给出模型检查结果。
6. Agent 生成仿真计划草稿。
7. 工程师确认计划。
8. Harness 启动 Temporal solver workflow 执行求解。
9. Solver Monitor Agent 通过 Temporal workflow 状态和 solver log 解释进展。
10. Postprocess 工具提取应力、位移、频率。
11. Margin Agent 计算裕度。
12. V&V Agent 对照 checklist 检查完整性。
13. Report Agent 生成报告草稿。
14. 工程师审核并签署。
15. Agent 总结经验，生成候选知识。
16. 知识管理员审核后发布到 WeKnora。
```

---

## 14. 关键边界和安全策略

### 14.1 DeepSeek 不直接执行 shell

错误方式：

```text
Agent 生成一段 shell，然后直接在服务器执行。
```

正确方式：

```text
Agent 只能调用受控工具。
工具由 Tool Gateway 校验 schema、权限、状态和审计后，再由 cae-runner 执行受控 job。
```

### 14.2 WeKnora 不存动态事实

错误方式：

```text
把当前 case 状态、solver run 状态、文件 hash、审批状态都写进 Wiki。
```

正确方式：

```text
Postgres 存动态状态；
MinIO 存文件；
WeKnora 存稳定知识和已审核经验。
```

### 14.3 Agent 不发布正式工程结论

错误方式：

```text
Agent 自动判断结构可放行并发布报告。
```

正确方式：

```text
Agent 生成报告草稿和风险提示；
工程师审核后才进入 approved。
```

### 14.4 材料许用值必须可追溯

错误方式：

```text
Agent 从文档片段里猜一个材料强度用于正式裕度。
```

正确方式：

```text
材料许用值来自受控材料库；
WeKnora 只能提供说明和引用；
缺少批准记录时，正式 MS 计算阻塞。
```

---

## 15. 与 DeepSeek Harness 产品能力的映射

| 航天 CAE 需求 | DeepSeek Harness 应提供的能力 | WeKnora 的角色 | 仍需外部组件 |
|---|---|---|---|
| 长任务求解 | 状态机、等待、恢复、重试 | 提供求解经验 | Celery / Temporal / HPC adapter |
| 模型和结果文件 | 文件资产上下文和引用 | 存报告说明，不存大文件 source of truth | MinIO / NAS / file_assets |
| 工具调用 | Tool Registry、MCP、权限、审计 | 提供工具使用说明 | FastAPI / MCP Server |
| 需求和规范理解 | Agent prompt、上下文装配 | 检索规范和 checklist | Postgres case state |
| 材料和载荷确认 | 人审节点、审批状态 | 检索材料说明和工况规则 | 材料库 / review tables |
| 求解日志解释 | Solver Monitor Agent | 检索 error 经验 | solver log parser |
| 裕度计算 | 调用受控计算工具 | 提供准则说明 | margin calculator |
| 报告生成 | Report Agent、模板上下文 | 检索报告模板和历史报告 | Markdown / PDF generator |
| V&V | checklist Agent | 存 checklist | review workflow |
| 经验沉淀 | knowledge candidate workflow | 发布审核后的知识 | 知识审核流程 |

---

## 16. 最小系统边界

第一版可以只做这些：

```text
WeKnora
  - 存规范、模板、历史 case、solver error、checklist。

DeepSeek Harness
  - 一个 CAE Simulation Agent 入口。
  - 5 个后台 Agent：Requirement、Model Check、Solver Log、Result Interpreter、Report。

Tool Gateway
  - parse_model_file
  - check_model_integrity
  - parse_load_case_table
  - run_solver 或 mock_run_solver
  - parse_solver_results
  - calculate_margin_of_safety
  - generate_report_draft

Postgres
  - simulation_cases
  - simulation_models
  - simulation_load_cases
  - simulation_solver_runs
  - simulation_results
  - simulation_margins
  - simulation_reviews
  - simulation_tool_calls
  - simulation_audit_log
  - file_assets
  - knowledge_references
  - knowledge_candidates

MinIO
  - 模型、日志、结果、云图、报告。
```

不做：

- 全自动 CAD 建模；
- 全自动网格优化；
- 全域航天 CAE；
- 自动修改 PLM / PDM 基线；
- 自动发布正式结论；
- 复杂多物理场耦合；
- 完整企业 PLM 集成。

---

## 17. 最后判断

在“以 WeKnora 为知识底座、DeepSeek Harness 为 Agent 能力层界面”的架构下，航天 CAE Simulation Agent 的关键不是让 DeepSeek 变成求解器，也不是让 WeKnora 变成数据库，而是让三类系统各司其职：

```text
WeKnora：让 Agent 找得到可信工程知识。
DeepSeek Harness：让 Agent 在任务流里可控地理解、规划、调用工具、解释和生成。
CAE 工具链 + Postgres + 文件存储：让工程计算、动态状态和结果追溯真实可靠。
```

这个组合如果先从“航天结构件静力 + 模态分析”落地，会比从全 CAE 平台起步更稳。等一条 case 闭环跑通后，再扩展到随机振动、冲击、热分析、热-结构耦合、CFD 和试验相关性。
