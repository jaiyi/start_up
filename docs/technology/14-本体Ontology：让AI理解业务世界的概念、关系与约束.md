# 14 · 本体 Ontology：让 AI 理解业务世界的概念、关系与约束

> 目标：面向没有本体经验的初学者，系统理解什么是本体、为什么企业 AI / RAG / Agent / 知识图谱需要本体、如何建立本体、有哪些开源框架和自动抽取方式，以及本体中的类、实体、关系、Action 与 OWL、RDF、SHACL、SPARQL、DMN、BPMN、Tool、Agent Workflow 之间是什么关系。

---

## 1. 一句话定义

本体 Ontology 是一套把业务世界讲清楚的“概念模型”。

它回答的是：

```text
这个领域里有哪些重要概念？
这些概念如何分类？
它们之间是什么关系？
哪些属性必须有？
哪些关系是允许的？
哪些规则和约束不能违反？
这些概念如何映射到真实数据、工具和流程？
```

如果说普通文档是给人读的知识，数据库表是给系统存的事实，那么本体是连接两者的语义层。

可以简单理解为：

```text
文档：写给人看的说明；
数据库：存业务事实；
知识图谱：存实体和关系；
本体：定义这个领域应该如何理解实体、关系和约束。
```

一句话记忆：

> 本体不是数据本身，而是定义数据背后的业务语义骨架。

---

## 2. 为什么本体对知识复利很重要

知识复利的核心不是“存更多资料”，而是让知识可以被：

```text
复用；
组合；
检索；
推理；
验证；
进入流程；
持续迭代。
```

如果没有本体，企业知识很容易变成：

```text
一堆文档；
一堆表；
一堆指标；
一堆系统字段；
一堆口头经验；
每个部门说法都不一样。
```

例如供应链里，不同人可能会说：

```text
供应商；
厂商；
vendor；
supplier；
供方；
承运商；
外协厂。
```

这些词在不同系统里可能字段不同、含义不同、粒度不同。

本体要做的事情就是：

```text
统一概念；
定义边界；
建立关系；
约束字段；
映射数据源；
支撑检索和推理；
让 Agent 调工具和走流程时有共同语义。
```

所以本体是知识复利系统里的“语义地基”。

---

## 3. 初学者最容易混淆的几个词

| 概念 | 简单解释 | 例子 |
|---|---|---|
| 术语 Term | 一个词或短语 | 供应商、采购订单、缺料 |
| 概念 Concept | 术语背后的业务含义 | 供应商是向企业提供物料或服务的组织 |
| 类 Class | 一类对象的抽象定义 | Supplier、PurchaseOrder、Material |
| 实体 Individual / Entity | 类的具体实例 | 供应商 A、PO-1001、物料 M-01 |
| 属性 Attribute / Data Property | 实体自身的字段 | 供应商名称、订单金额、交期 |
| 关系 Relation / Object Property | 实体之间的连接 | 供应商供应物料、订单包含行项目 |
| 约束 Constraint | 必须满足的规则 | 采购订单必须有供应商和至少一个行项目 |
| 规则 Rule | 条件和结果 | 延期超过 7 天且影响生产，则升级经理 |
| 行为 Action | 可被触发的动作 | 创建工单、发起审批、冻结供应商 |
| 事件 Event | 已发生或将发生的业务变化 | 到货、延期、质检不合格 |
| 流程 Process | 多个动作和状态的编排 | 供应商延期处理流程 |

这些概念之间的关系可以这样理解：

```text
类定义“有什么类型的东西”；
实体是“具体哪个东西”；
属性描述“它自己有什么特征”；
关系描述“它和别的东西怎么关联”；
约束描述“什么是合法结构”；
规则描述“遇到什么条件该如何判断”；
Action 描述“系统可以做什么动作”；
流程描述“动作按什么顺序推进”。
```

---

## 4. 一个供应链本体小例子

假设我们要建立一个供应链本体。

### 4.1 类

```text
Supplier：供应商
Material：物料
PurchaseOrder：采购订单
PurchaseOrderLine：采购订单行
Warehouse：仓库
InventoryRecord：库存记录
QualityInspection：质检记录
DeliveryEvent：交付事件
RiskEvent：风险事件
```

### 4.2 实体

```text
Supplier_A：供应商 A
Material_Motor_001：电机物料 001
PO_202609_001：采购订单 202609001
Warehouse_Shanghai：上海仓
```

### 4.3 属性

```text
Supplier.name：供应商名称
Supplier.risk_level：供应商风险等级
Material.code：物料编码
Material.category：物料类别
PurchaseOrder.promised_date：承诺交期
PurchaseOrder.status：订单状态
InventoryRecord.available_qty：可用库存
```

### 4.4 关系

```text
Supplier supplies Material
PurchaseOrder hasLine PurchaseOrderLine
PurchaseOrderLine orders Material
Material storedIn Warehouse
PurchaseOrderLine deliveredBy Supplier
QualityInspection checks Material
DeliveryEvent affects PurchaseOrderLine
RiskEvent relatedTo Supplier
```

### 4.5 约束

```text
每个 PurchaseOrder 必须有一个 Supplier；
每个 PurchaseOrder 必须至少有一个 PurchaseOrderLine；
每个 PurchaseOrderLine 必须关联一个 Material；
每个 Material 必须有唯一 material_code；
Supplier.risk_level 只能是 low / medium / high / blocked；
如果 Supplier 是 blocked，不允许自动创建新采购订单。
```

### 4.6 Action

```text
create_follow_up_task：创建跟进任务
send_supplier_reminder：发送供应商催办
start_delay_workflow：发起延期处理流程
create_quality_issue：创建质量问题单
block_supplier：冻结供应商
```

注意：Action 是否能执行，不由本体单独决定。

本体可以定义动作语义和适用对象，但真正执行要经过：

```text
Tool Schema；
Policy Guard；
Workflow；
权限系统；
人工确认。
```

---

## 5. 本体、知识图谱、数据库、RAG 的区别

这几个概念经常混在一起。

| 概念 | 它是什么 | 解决什么问题 | 典型技术 |
|---|---|---|---|
| 本体 Ontology | 领域概念、关系和约束模型 | 世界怎么被理解 | OWL、RDFS、SHACL |
| 知识图谱 Knowledge Graph | 实体和关系组成的图 | 事实之间如何连接 | RDF Store、Neo4j、AGE、NebulaGraph |
| 数据库 Database | 业务数据存储 | 事实如何被记录和查询 | PostgreSQL、MySQL、ERP 表 |
| RAG | 检索增强生成链路 | 文档如何进入模型上下文 | 向量库、Hybrid Search、Reranker |
| Prompt | 任务指令和上下文组织 | 模型如何完成任务 | System Prompt、任务协议 |

可以这样记：

```text
本体定义“什么是供应商、订单、物料”；
数据库记录“供应商 A、订单 001、物料 M1”；
知识图谱连接“供应商 A 供应物料 M1，订单 001 订购 M1”；
RAG 检索“关于供应商准入的制度文档”；
Prompt 指挥模型“基于这些资料回答用户问题”。
```

---

## 6. 本体的核心组成

一个工程化本体通常至少包含以下部分。

```text
1. 领域范围 Scope
2. 术语表 Glossary
3. 类 Class
4. 实体 Individual / Entity
5. 属性 Data Property
6. 关系 Object Property
7. 约束 Constraint
8. 规则 Rule
9. 事件 Event
10. 行为 Action
11. 数据源映射 Mapping
12. 版本 Version
13. 质量检查 Quality Check
14. 治理机制 Governance
```

下面分别说明。

---

### 6.1 Scope：领域范围

本体不能一上来就试图描述整个企业。

要先限定范围。

例如：

```text
供应链主数据本体；
采购订单本体；
库存异常本体；
供应商风险本体；
工业质量故障树本体；
客户服务工单本体。
```

范围越清楚，本体越容易落地。

常见错误是：

```text
一开始就想建立“企业全域本体”。
```

这通常会过度设计。

---

### 6.2 Glossary：术语表

术语表是本体的入口。

它要回答：

```text
有哪些业务词？
这些词是什么意思？
有没有同义词？
不同部门是否有不同叫法？
哪些词容易混淆？
```

示例：

| 术语 | 英文名 | 定义 | 同义词 | 备注 |
|---|---|---|---|---|
| 供应商 | Supplier | 向企业提供物料或服务的组织 | 厂商、供方、Vendor | 不含客户 |
| 物料 | Material | 被采购、生产、库存管理的对象 | 料号、Item | 和产品区分 |
| 采购订单 | Purchase Order | 向供应商发出的采购承诺 | PO | 包含一个或多个订单行 |

术语表不等于本体，但它是本体建设的第一步。

---

### 6.3 Class：类

类是业务对象类型。

例如：

```text
Supplier
Material
PurchaseOrder
InventoryRecord
QualityInspection
RiskEvent
```

类之间可以有继承关系。

例如：

```text
Organization
  ├── Supplier
  ├── Customer
  └── Carrier

BusinessDocument
  ├── PurchaseOrder
  ├── Invoice
  └── DeliveryNote
```

类的设计要避免两个极端：

```text
太粗：什么都叫 BusinessObject，无法表达业务差异；
太细：每个字段都建一个类，模型难以维护。
```

---

### 6.4 Entity：实体

实体是类的具体实例。

例如：

```text
Supplier_A 是 Supplier；
PO_1001 是 PurchaseOrder；
Material_M01 是 Material。
```

在工程里，实体通常来自：

```text
ERP 主数据；
业务系统表；
文档抽取；
人工维护；
外部数据源；
Agent 工具返回结果。
```

本体定义实体应该长什么样，知识图谱或数据库保存具体实体。

---

### 6.5 Data Property：数据属性

数据属性是实体自己的字段。

例如：

```text
Supplier.name
Supplier.credit_code
Supplier.risk_level
Material.material_code
Material.category
PurchaseOrder.order_date
PurchaseOrder.promised_date
```

属性要定义：

```text
名称；
含义；
数据类型；
是否必填；
取值范围；
单位；
来源系统；
更新时间；
质量要求。
```

例如：

```yaml
property: promised_date
domain: PurchaseOrderLine
range: date
required: true
source: ERP.PO_LINE.PROMISED_DATE
description: 供应商承诺交付日期
```

---

### 6.6 Object Property：对象关系

对象关系连接两个实体。

例如：

```text
Supplier supplies Material
PurchaseOrder hasLine PurchaseOrderLine
PurchaseOrderLine orders Material
Material storedIn Warehouse
RiskEvent relatedTo Supplier
```

关系要定义：

```text
关系名称；
源类型 domain；
目标类型 range；
方向；
基数；
是否可传递；
是否对称；
是否有反向关系。
```

例如：

```yaml
relation: supplies
domain: Supplier
range: Material
inverse: suppliedBy
cardinality: many_to_many
description: 供应商能够供应某种物料
```

关系设计是本体最重要的部分之一。

因为关系决定图谱是否能回答复杂问题。

---

### 6.7 Constraint：约束

约束定义什么样的数据结构是合法的。

例如：

```text
采购订单必须有供应商；
采购订单必须至少有一个订单行；
订单行必须关联物料；
供应商风险等级只能是 low / medium / high / blocked；
质检记录必须关联批次和检验结论。
```

约束可以用：

```text
OWL 公理；
SHACL shape；
数据库约束；
后端校验；
Tool Schema；
业务规则引擎。
```

不同约束适合放在不同层。

---

### 6.8 Rule：规则

规则描述条件判断。

例如：

```text
如果供应商延期超过 7 天，并且物料是关键物料，并且影响生产，则升级供应链经理。
```

这类规则更适合 DMN / Rules Engine，而不是全部塞进 OWL。

可以理解为：

```text
本体定义“有哪些概念和关系”；
DMN 定义“在什么条件下怎么判断”。
```

---

### 6.9 Event：事件

事件描述业务世界里的变化。

例如：

```text
订单创建；
供应商确认；
到货；
质检完成；
质检不合格；
库存冻结；
延期；
风险预警。
```

事件通常具有：

```text
发生时间；
事件类型；
关联实体；
来源系统；
触发人；
影响范围；
状态变化。
```

事件可以触发：

```text
图谱更新；
规则判断；
Workflow；
Agent 分析；
告警通知。
```

---

### 6.10 Action：行为

Action 描述系统可以做的动作。

例如：

```text
查询订单状态；
生成异常报告；
创建协同工单；
发送供应商催办；
发起审批；
冻结供应商。
```

Action 在本体中可以作为语义资产定义，但真正执行通常由 Tool / Workflow 完成。

Action 需要定义：

```text
作用对象；
输入参数；
前置条件；
后置结果；
是否有副作用；
是否需要人工确认；
需要什么权限；
对应哪个 Tool 或 Workflow。
```

示例：

```yaml
action: start_supplier_delay_workflow
acts_on:
  - PurchaseOrderLine
  - Supplier
inputs:
  - po_line_id
  - supplier_id
  - delay_days
preconditions:
  - delay_days >= 3
  - user_has_permission: supply_chain_exception.create
requires_human_confirmation: true
implemented_by:
  type: workflow
  key: supplier_delay_resolution
```

---

## 7. 本体常用标准：RDF、RDFS、OWL、SHACL、SPARQL

### 7.1 RDF：用三元组表达事实

RDF 的基本结构是三元组：

```text
主语 Subject - 谓语 Predicate - 宾语 Object
```

例如：

```text
Supplier_A supplies Material_M01
PO_1001 hasSupplier Supplier_A
Material_M01 hasCategory Motor
```

它适合表达图结构事实。

---

### 7.2 RDFS：定义基础类和属性

RDFS 可以定义：

```text
类；
子类；
属性；
属性的 domain 和 range。
```

例如：

```text
Supplier 是 Organization 的子类；
supplies 的 domain 是 Supplier；
supplies 的 range 是 Material。
```

RDFS 是轻量语义层。

---

### 7.3 OWL：表达更强的本体语义和公理

OWL 是 Web Ontology Language。

它可以表达：

```text
类；
子类；
等价类；
不相交类；
对象属性；
数据属性；
属性约束；
基数约束；
传递关系；
对称关系；
逆关系；
推理规则。
```

例如：

```text
BlockedSupplier 是 Supplier 的一种；
BlockedSupplier 不能参与新采购订单；
hasParentPart 是传递关系；
hasSupplier 和 suppliesTo 可以互为逆关系。
```

但要注意：

> OWL 不是数据库，也不是流程引擎。

它定义语义和可推理结构，但运行时查询、执行和流程推进还需要其他系统。

---

### 7.4 SHACL：检查图数据是否符合约束

SHACL 常用于校验 RDF 图数据质量。

例如检查：

```text
每个 Supplier 必须有 name；
每个 PurchaseOrderLine 必须有关联 Material；
risk_level 只能取 low / medium / high / blocked；
日期字段必须是合法 date；
金额不能为负数。
```

可以简单理解为：

```text
OWL 更偏语义推理；
SHACL 更偏数据校验。
```

---

### 7.5 SPARQL：查询 RDF 图

SPARQL 是 RDF 图查询语言。

它可以查询：

```text
某个供应商供应哪些物料；
哪些关键物料依赖高风险供应商；
某个物料关联哪些订单、库存和质检记录；
哪些实体不符合某个约束。
```

如果使用 Neo4j / AGE / NebulaGraph，查询语言可能是 Cypher、openCypher 或 nGQL。

所以要区分：

```text
本体语言：OWL / RDFS；
RDF 查询：SPARQL；
属性图查询：Cypher / openCypher / nGQL；
校验语言：SHACL；
流程语言：BPMN；
规则语言：DMN。
```

---

## 8. 本体和知识图谱的两种工程路线

### 8.1 语义网路线：RDF / OWL / SPARQL

适合：

```text
需要标准语义；
需要本体推理；
需要和外部语义资源互操作；
需要严格表达类、关系、公理；
需要 SPARQL 查询。
```

常见工具：

```text
Protégé；
Apache Jena；
RDF4J；
GraphDB；
Stardog；
TopBraid；
Ontotext；
HermiT；
Pellet；
ELK。
```

### 8.2 属性图路线：Neo4j / AGE / NebulaGraph

适合：

```text
工程查询；
路径遍历；
业务图谱；
关系分析；
和现有数据库 / 应用系统集成；
Agent 工具查询。
```

常见工具：

```text
Neo4j；
Apache AGE；
NebulaGraph；
Memgraph；
ArangoDB；
JanusGraph；
HugeGraph；
TuGraph。
```

### 8.3 两条路线怎么结合

常见工程方式是：

```text
OWL / 本体作为语义设计源；
Mapping / Projection 把本体投影到图数据库；
运行时 Agent 查询 Neo4j / AGE / NebulaGraph；
需要语义推理和一致性检查时使用 RDF / OWL 工具。
```

也就是说：

```text
本体是语义设计；
图数据库是运行时查询；
投影契约负责两者之间的映射。
```

---

## 9. 如何建立一个本体

本体建设不要从工具开始，而要从问题开始。

推荐流程：

```text
1. 明确业务问题
2. 划定领域范围
3. 收集术语和样例
4. 识别核心类
5. 识别实体和数据源
6. 识别关系
7. 定义属性和约束
8. 定义事件和 Action
9. 建立数据源映射
10. 设计查询问题 competency questions
11. 选择表示形式 OWL / YAML / JSON Schema / Property Graph
12. 导入样例数据
13. 校验和评审
14. 发布版本
15. 接入 RAG / Agent / Tool / Workflow
16. 基于使用反馈迭代
```

---

### 9.1 第一步：明确业务问题

不要一开始就问：

```text
我要建一个多大的本体？
```

而是问：

```text
这个本体要支持哪些问题？
```

这些问题叫 competency questions，即能力问题。

例如供应链本体要回答：

```text
某个物料依赖哪些供应商？
哪些关键物料只有一个供应商？
某个供应商延期会影响哪些生产订单？
哪些供应商同时存在质量风险和交付风险？
某个缺料事件可能由哪些原因导致？
哪些采购订单需要升级处理？
```

本体能回答这些问题，才有价值。

---

### 9.2 第二步：划定范围

不要第一版就覆盖全企业。

可以先从一个小域开始：

```text
供应商风险；
采购订单延期；
库存异常；
质量故障树；
设备告警诊断；
客户投诉归因。
```

范围小，才能快速验证。

---

### 9.3 第三步：收集术语和样例

来源包括：

```text
制度文档；
SOP；
数据字典；
ERP / MES / WMS 表结构；
历史工单；
专家访谈；
会议纪要；
报表指标；
业务流程图；
异常案例。
```

先把真实业务语言收集起来，再抽象成类和关系。

---

### 9.4 第四步：识别核心类

识别类时可以问：

```text
这个领域里有哪些稳定对象？
哪些对象会被反复查询？
哪些对象跨系统出现？
哪些对象有生命周期？
哪些对象会进入流程？
```

例如供应链：

```text
Supplier；
Material；
PurchaseOrder；
InventoryRecord；
DeliveryEvent；
QualityInspection；
RiskEvent。
```

---

### 9.5 第五步：识别关系

关系是本体的灵魂。

可以问：

```text
对象之间如何连接？
这些连接是否有方向？
是否有时间属性？
是否有强弱关系？
是否会变化？
是否来自事实数据还是规则定义？
```

例如：

```text
Supplier supplies Material；
PurchaseOrderLine orders Material；
Material storedIn Warehouse；
RiskEvent affects Supplier；
DeliveryEvent impacts ProductionPlan。
```

---

### 9.6 第六步：定义约束

约束来自业务常识和系统规则。

例如：

```text
采购订单必须有供应商；
订单行必须有物料；
库存数量不能为负；
冻结供应商不能自动生成新订单；
高风险供应商需要人工复核。
```

其中有些是数据结构约束，有些是业务决策规则。

要分清楚：

```text
结构完整性 → Schema / SHACL / 数据库约束；
业务判断 → DMN / Rules；
流程推进 → BPMN / Workflow；
动作权限 → Policy / IAM。
```

---

### 9.7 第七步：定义 Action 和 Tool 映射

本体不只描述静态对象，也可以描述可执行动作的语义。

例如：

```text
Action: query_supplier_risk
对应 Tool: supplier_risk_query
作用对象: Supplier
输入: supplier_id
输出: risk_score, risk_level, evidence
```

这样 Agent 就能知道：

```text
什么对象能调用什么工具；
工具输入应该来自哪个实体属性；
工具输出应该更新哪些事实或上下文；
哪些动作有副作用，必须走 Workflow。
```

---

### 9.8 第八步：设计数据源映射

本体里的概念需要映射到真实系统。

例如：

| 本体概念 | ERP 表 / 字段 | 说明 |
|---|---|---|
| Supplier | ERP_VENDOR.vendor_id | 供应商唯一标识 |
| Material | ERP_ITEM.item_code | 物料编码 |
| PurchaseOrder | ERP_PO.po_no | 采购订单号 |
| promised_date | ERP_PO_LINE.promise_dt | 承诺交期 |
| available_qty | WMS_INVENTORY.available_qty | 可用库存 |

没有映射，本体只是概念图。

有映射，本体才可以连接真实数据。

---

### 9.9 第九步：校验和评审

本体需要业务和技术共同评审。

评审问题包括：

```text
概念是否准确？
类是否过粗或过细？
关系方向是否正确？
属性是否可从系统获得？
约束是否符合业务实际？
是否能回答能力问题？
是否容易维护？
是否与现有系统字段冲突？
```

---

## 10. 本体自动抽取有哪些方式

本体可以人工建，也可以半自动抽取。

但要明确：

> 自动抽取能加速本体建设，但不能替代专家审核。

---

### 10.1 从文档抽取术语

从制度、SOP、手册、报告里抽取：

```text
业务术语；
同义词；
定义；
上下位关系；
规则描述；
异常类型；
动作名称。
```

方法包括：

```text
关键词抽取；
术语抽取；
命名实体识别；
LLM 信息抽取；
人工审核。
```

---

### 10.2 从数据库抽取实体和属性

从数据库表、字段、外键、数据字典里抽取：

```text
类候选；
属性候选；
实体标识；
关系候选；
数据类型；
值域。
```

例如：

```text
vendor_master → Supplier；
item_master → Material；
po_header → PurchaseOrder；
po_line → PurchaseOrderLine；
po_line.vendor_id → PurchaseOrderLine deliveredBy Supplier。
```

---

### 10.3 从流程文档抽取事件和 Action

从 SOP、BPMN、工单记录中抽取：

```text
事件；
动作；
前置条件；
后置状态；
责任角色；
人工确认点；
异常分支。
```

例如：

```text
供应商延期 → 触发延期处理；
质检不合格 → 创建质量问题单；
延期超过 7 天 → 升级供应链经理。
```

---

### 10.4 从历史案例抽取关系和因果链

从异常工单、质量报告、故障分析报告中抽取：

```text
现象；
原因；
证据；
处置措施；
结果；
复发风险。
```

例如工业质量场景：

```text
涂胶异常 → 胶量不足 → 喷嘴堵塞 → 清洗喷嘴 → 异常消除。
```

这类内容可以形成故障树、本体关系或案例图谱。

---

### 10.5 从 LLM 抽取本体草稿

可以让 LLM 从文档中抽取：

```text
类；
属性；
关系；
约束；
规则；
Action；
事件；
样例实体。
```

这一类工具里，**OntoGPT** 是一个值得重点关注的开源项目。

它的定位可以理解为：

```text
用 ontology / schema 约束 LLM，
从非结构化文本中抽取实体、关系、属性和事件，
生成可进入知识图谱或本体实例库的结构化结果。
```

OntoGPT 通常会和 **LinkML** 搭配使用。

LinkML 更像 schema / 本体结构定义语言，可以定义：

```text
有哪些类；
有哪些字段；
字段类型是什么；
哪些字段必填；
类之间有什么关系；
枚举值有哪些；
输出结构应该长什么样。
```

然后 OntoGPT 基于这些 schema 指导 LLM 抽取。

简单链路是：

```text
LinkML Schema
  ↓
OntoGPT 抽取模板
  ↓
LLM
  ↓
结构化抽取结果
  ↓
JSON / YAML / RDF / 知识图谱 / 本体实例库
```

它和普通 Prompt 抽取的区别是：

```text
普通 Prompt 抽取：写一段提示词，让模型输出 JSON；
OntoGPT：基于 ontology / LinkML schema 约束抽取结构，更偏知识工程和语义建模。
```

输出可以要求为 YAML / JSON。

例如：

```yaml
classes:
  - name: Supplier
    label: 供应商
    description: 向企业提供物料或服务的组织

relations:
  - name: supplies
    domain: Supplier
    range: Material
    description: 供应商供应某种物料

constraints:
  - PurchaseOrder must have exactly one Supplier
```

OntoGPT 更适合：

```text
已经有领域 schema / ontology；
希望从论文、报告、SOP、故障案例中抽取结构化知识；
希望抽取结果能进入知识图谱；
希望输出不只是自然语言摘要，而是可校验的结构化对象；
领域术语复杂，需要 schema 约束模型输出。
```

但它不应该被理解成“全自动本体设计器”。

它不能替代：

```text
业务概念边界确认；
跨部门术语统一；
专家评审；
版本治理；
数据源映射；
权限和流程治理。
```

所以更准确的定位是：

> OntoGPT 是本体构建和知识图谱构建中的抽取加速器，而不是完整治理平台。

抽取结果仍然必须经过：

```text
Schema 校验；
专家审核；
样例数据验证；
和现有本体合并去重；
版本评审。
```

---

### 10.6 自动抽取的典型流水线

```text
文档 / 表结构 / 工单 / SOP
  ↓
解析与清洗
  ↓
术语抽取
  ↓
实体类型识别
  ↓
关系抽取
  ↓
规则 / Action / 事件抽取
  ↓
LLM 生成候选本体草稿
  ↓
Schema / SHACL 校验
  ↓
专家审核
  ↓
合并入本体版本库
  ↓
投影到图谱 / RAG / Tool / Workflow
```

---

## 11. 本体建设的开源框架和工具

### 11.1 本体编辑与建模

| 工具 | 类型 | 特点 |
|---|---|---|
| Protégé | 本体编辑器 | 最经典的 OWL 本体编辑工具，适合学习和建模 |
| WebProtégé | Web 本体协作 | 支持多人在线编辑和评审 |
| VocBench | 词表 / 本体管理 | 适合受控词表、SKOS、语义资产治理 |
| TopBraid EDG | 商业语义治理 | 企业级能力强，非纯开源 |

---

### 11.2 RDF / OWL 存储与推理

| 工具 | 类型 | 特点 |
|---|---|---|
| Apache Jena | RDF 框架 / Fuseki Server | Java 生态成熟，支持 SPARQL、推理、RDF 处理 |
| RDF4J | RDF 框架 | Java 生态，适合 RDF 存储和查询 |
| GraphDB | RDF 图数据库 | Ontotext 产品，支持推理和语义查询 |
| Stardog | 企业知识图谱 | 商业产品，语义推理和虚拟图能力强 |
| HermiT | OWL Reasoner | 常用于 OWL 推理 |
| Pellet | OWL Reasoner | 经典推理器 |
| ELK | OWL EL 推理器 | 适合大规模 OWL EL 本体 |

---

### 11.3 属性图数据库

| 工具 | 类型 | 特点 |
|---|---|---|
| Neo4j | 属性图数据库 | 生态成熟，Cypher 友好，适合业务图谱 |
| Apache AGE | PostgreSQL 图扩展 | 在 Postgres 中使用 openCypher，适合集成现有 PG 体系 |
| NebulaGraph | 分布式图数据库 | 适合大规模图数据和图查询 |
| Memgraph | 内存优先图数据库 | 查询体验接近 Neo4j |
| ArangoDB | 多模型数据库 | 文档、图、键值混合 |
| JanusGraph | 分布式图数据库 | 适合大规模图，依赖后端存储 |
| HugeGraph / TuGraph | 国产图数据库方向 | 可关注社区活跃度和生态成熟度 |

---

### 11.4 抽取与构建工具

| 类型 | 工具 | 用途 |
|---|---|---|
| NLP 抽取 | spaCy、HanLP、Stanza | 实体、关系、术语抽取 |
| 中文 NLP | HanLP、LTP | 中文分词、实体识别、句法分析 |
| 信息抽取 | DeepKE、OpenNRE | 实体关系抽取、知识抽取 |
| LLM 本体抽取 | OntoGPT | 基于 ontology / LinkML schema，从文本中抽取实体、关系、属性和事件 |
| Schema / 本体建模 | LinkML | 用 YAML 定义类、字段、枚举和关系，可生成 JSON Schema、RDF / OWL 等表示 |
| LLM 结构化抽取 | LangChain、LlamaIndex、Instructor、PydanticAI | 从文档生成结构化候选本体或本体实例 |
| 数据处理 | pandas、dbt、SQLMesh | 从数据表和数据字典抽取结构 |
| 标注工具 | Label Studio、Doccano | 人工标注实体和关系 |
| 评测 | DeepEval、Promptfoo、自定义规则测试 | 抽取质量和本体一致性评测 |

---

## 12. 本体与国标 / 标准要求

> 注意：本节用于帮助理解标准通常关注什么，不替代正式国家标准文本。具体标准编号、适用范围、术语定义和条文要求，应以全国标准信息公共服务平台或正式发布文本为准。

近几年，随着人工智能、知识图谱和行业数字化发展，本体、知识图谱、语义建模相关标准逐渐受到重视。

标准通常不是要求企业“必须都用某一个工具”，而是强调：

```text
术语定义要一致；
概念层次要清楚；
关系语义要明确；
属性和约束要可描述；
数据来源要可追溯；
知识表示要规范；
构建过程要可管理；
质量评估要有指标；
版本演化要可治理；
系统之间要能互操作。
```

---

### 12.1 标准通常关注的对象

本体 / 知识图谱相关标准通常会覆盖：

```text
术语和定义；
总体架构；
知识表示模型；
实体、概念、关系、属性；
本体构建流程；
知识抽取和融合；
知识存储和查询；
知识推理；
质量评价；
安全和权限；
应用接口；
运维和治理。
```

---

### 12.2 对本体内容的常见要求

通常会要求本体至少描述：

```text
概念 / 类；
实例 / 实体；
属性；
关系；
约束；
规则；
术语定义；
同义词和别名；
来源和版本；
适用范围；
维护责任人。
```

这和工程实践是一致的。

---

### 12.3 对构建流程的常见要求

标准化构建通常包括：

```text
需求分析；
领域范围确定；
术语采集；
概念建模；
关系建模；
属性和约束定义；
数据源映射；
知识抽取；
知识融合；
质量校验；
专家评审；
发布和版本管理；
运行维护。
```

---

### 12.4 对质量评价的常见要求

质量评价通常关注：

```text
准确性：概念、关系、属性是否正确；
完整性：是否覆盖关键业务问题；
一致性：是否存在冲突定义；
唯一性：实体是否重复；
可追溯性：知识来源是否清楚；
时效性：是否过期；
可扩展性：是否能新增概念和关系；
可用性：是否能支撑查询、推理和应用；
安全性：是否满足权限和敏感信息要求。
```

---

### 12.5 对企业落地的启发

不要把国标理解成“写一份大而全的文档”。

更实际的启发是：

```text
术语要有统一定义；
类和关系要有规范命名；
本体要有版本；
抽取结果要能追溯来源；
本体变更要有评审；
知识图谱要有质量检查；
应用使用本体要有契约；
不同系统之间要能映射和互操作。
```

企业可以从轻量版开始：

```text
Glossary + YAML Ontology + 数据源映射 + 质量检查 + 版本管理
```

再逐步升级到：

```text
OWL / RDF / SHACL / SPARQL / 图数据库 / 本体治理平台
```

---

## 13. 本体与 OWL、DMN、BPMN、Tool 的关系

这是企业 Agent 里最容易混淆的部分。

可以先记住一句话：

```text
本体管语义；
DMN 管判断；
BPMN 管流程；
Tool 管执行；
Agent 管理解和协调。
```

---

### 13.1 本体与 OWL

OWL 是表达本体的一种标准语言。

关系是：

```text
本体是思想和模型；
OWL 是表达本体的标准语言之一。
```

类似于：

```text
业务流程是思想；
BPMN 是表达流程的一种标准语言。
```

本体可以用 OWL 表达，也可以先用 YAML、JSON、Markdown 表达。

不同成熟度阶段可以这样选择：

| 阶段 | 表达方式 |
|---|---|
| 早期梳理 | Markdown / 表格 / YAML |
| 应用接入 | JSON Schema / YAML Ontology / 数据映射 |
| 图谱投影 | Property Graph Schema / RDF Mapping |
| 语义推理 | OWL / RDF / SHACL / SPARQL |

---

### 13.2 本体与 DMN

DMN 负责决策模型。

例如：

```text
延期几天算严重？
是否需要升级？
派给哪个角色？
是否需要人工复核？
优先级是什么？
```

本体提供 DMN 使用的概念和字段语义。

例如：

```text
本体定义：Supplier、Material、PurchaseOrderLine、delay_days、material_criticality；
DMN 使用这些字段判断：是否升级、派给谁、优先级是什么。
```

关系是：

```text
本体定义判断对象；
DMN 定义判断逻辑。
```

---

### 13.3 本体与 BPMN

BPMN 负责流程模型。

例如供应商延期处理流程：

```text
发现延期
  ↓
收集证据
  ↓
判断影响
  ↓
生成建议
  ↓
人工确认
  ↓
通知供应商 / 创建工单
  ↓
跟踪反馈
  ↓
关闭流程
```

本体提供流程中各节点理解业务对象的语义。

例如：

```text
Task_QuerySupplierRisk 查询 Supplier；
Task_CheckProductionImpact 查询 Material 与 ProductionPlan 的关系；
Task_GenerateDelayReport 输出 DelayEvent 的证据链；
Gateway_RequireEscalation 使用 DMN 判断是否升级。
```

关系是：

```text
本体定义流程操作的业务对象；
BPMN 定义这些对象如何被一步步处理。
```

---

### 13.4 本体与 Tool

Tool 是实际执行查询或动作的接口。

例如：

```text
query_supplier_risk；
query_inventory；
query_purchase_order；
create_follow_up_task；
start_workflow；
send_supplier_reminder。
```

本体可以帮助 Tool 做三件事：

```text
1. 定义 Tool 操作的对象类型；
2. 定义输入输出字段语义；
3. 定义 Tool 结果如何映射回知识图谱或 workflow context。
```

例如：

```yaml
tool: query_inventory
acts_on: Material
inputs:
  material_code:
    maps_to: Material.material_code
outputs:
  available_qty:
    maps_to: InventoryRecord.available_qty
  warehouse:
    maps_to: Warehouse
```

关系是：

```text
本体让 Tool 的输入输出有统一语义；
Tool 让本体连接真实业务系统。
```

---

### 13.5 本体与 Agent

Agent 需要理解任务、调用工具、解释结果、推动流程。

本体可以给 Agent 提供：

```text
领域术语；
实体类型；
关系路径；
可用动作；
字段含义；
禁止动作；
查询模板；
解释框架。
```

例如用户问：

```text
这个供应商最近是不是有风险？
```

Agent 借助本体知道：

```text
供应商风险可能关联准交率、质量不良率、投诉、价格波动、区域风险；
这些数据分别来自哪些工具；
结果应该组织成风险等级、证据和建议。
```

关系是：

```text
本体让 Agent 有领域地图；
Agent 按任务协议使用这张地图完成任务。
```

---

## 14. 类、实体、关系、Action 与流程的完整链路

可以用一个供应商延期例子串起来。

### 14.1 本体层

定义：

```text
Supplier 是供应商；
PurchaseOrderLine 是采购订单行；
DelayEvent 是延期事件；
Supplier supplies Material；
PurchaseOrderLine orders Material；
DelayEvent affects PurchaseOrderLine。
```

### 14.2 数据层

存储：

```text
Supplier_A；
PO_LINE_1001；
Material_M01；
DelayEvent_20260916。
```

### 14.3 图谱层

连接：

```text
Supplier_A supplies Material_M01；
PO_LINE_1001 orders Material_M01；
DelayEvent_20260916 affects PO_LINE_1001。
```

### 14.4 Tool 层

查询：

```text
query_purchase_order(po_line_id)
query_supplier_risk(supplier_id)
query_inventory(material_code)
query_production_impact(material_code)
```

### 14.5 DMN 层

判断：

```text
如果 delay_days > 7 且 material_criticality = high 且 impacts_production = true，
则 priority = high，target_role = supply_chain_manager。
```

### 14.6 BPMN 层

编排：

```text
收集延期证据
  ↓
查询供应商风险
  ↓
查询生产影响
  ↓
调用 DMN 判断优先级
  ↓
生成建议
  ↓
等待人工确认
  ↓
创建协同工单
```

### 14.7 Agent 层

交互：

```text
用户：这个订单延期严重吗？
Agent：我会先查询订单、供应商风险、库存和生产影响，再给出判断。
```

### 14.8 最终关系

```text
本体告诉系统“业务世界是什么”；
数据告诉系统“当前事实是什么”；
图谱告诉系统“事实之间怎么连接”；
Tool 告诉系统“怎么查和怎么做”；
DMN 告诉系统“怎么判断”；
BPMN 告诉系统“怎么推进”；
Agent 告诉用户“现在发生了什么、为什么、下一步怎么办”。
```

---

## 15. 本体在 RAG / GraphRAG 中的作用

本体可以显著提升 RAG 的质量。

### 15.1 查询理解

用户问：

```text
这个厂商最近交付是不是不稳定？
```

本体可以帮助系统知道：

```text
厂商 ≈ 供应商；
交付不稳定可能关联准交率、延期次数、延期天数、未确认订单；
需要查询 Supplier、PurchaseOrderLine、DeliveryEvent。
```

### 15.2 Chunk 标注

文档 chunk 可以打上本体标签：

```text
涉及 Supplier；
涉及 PurchaseOrder；
涉及 RiskPolicy；
涉及 QualityInspection。
```

这样检索时可以按实体和概念过滤。

### 15.3 图谱路径检索

GraphRAG 可以沿关系查找上下文：

```text
供应商 A
  → 供应物料 M01
  → 被订单 PO1001 使用
  → 影响生产计划 P01
  → 曾发生质量异常 Q01
```

### 15.4 答案约束

本体能要求答案结构符合业务概念：

```text
回答供应商风险时，必须包含：交付、质量、价格、响应、合规五类证据。
```

---

## 16. 本体在数字员工中的作用

数字员工不是普通聊天机器人。

它需要知道：

```text
我负责哪些对象；
我能查哪些关系；
我能调用哪些工具；
我能建议哪些 Action；
哪些动作必须走 Workflow；
哪些动作禁止直接执行。
```

本体可以成为数字员工的领域地图。

例如供应链异常诊断员工：

```text
关注对象：Supplier、Material、PurchaseOrder、Inventory、QualityInspection；
核心关系：supplies、orders、storedIn、affects、relatedTo；
可用工具：query_po、query_inventory、query_supplier_risk、query_quality_status；
可建议 Action：send_reminder、create_follow_up_task、start_delay_workflow；
禁止 Action：直接修改订单交期、直接冻结供应商、直接承诺客户交付。
```

这样数字员工不是“凭感觉聊天”，而是基于领域模型工作。

---

## 17. 本体质量如何评测

本体不是画完就结束，也需要评测。

### 17.1 覆盖性

```text
是否覆盖核心业务问题？
是否覆盖关键对象？
是否覆盖关键关系？
是否覆盖主要异常场景？
```

### 17.2 准确性

```text
概念定义是否准确？
关系方向是否正确？
属性含义是否符合业务？
规则是否符合专家判断？
```

### 17.3 一致性

```text
有没有同一个概念多个定义？
有没有互相冲突的关系？
有没有重复实体？
有没有字段口径冲突？
```

### 17.4 可用性

```text
是否能回答 competency questions？
是否能支撑 RAG 检索？
是否能支撑 Agent 工具调用？
是否能支撑 Workflow 节点查询？
```

### 17.5 可维护性

```text
是否有版本？
是否有负责人？
是否能新增概念？
是否有变更记录？
是否有质量检查？
```

---

## 18. 本体常见错误和避坑

### 18.1 一开始做得太大

错误：

```text
先建一个企业全域本体。
```

建议：

```text
从一个高价值场景开始，例如供应商风险、缺料诊断、质量故障树。
```

---

### 18.2 把数据库表结构直接当本体

数据库表是系统实现，不等于业务语义。

例如 ERP 里一个字段叫 `vendor_id`，但业务上可能涉及：

```text
供应商主体；
供应商工厂；
供应商联系人；
供应商账户；
供应商风险等级；
供应商绩效记录。
```

本体要表达业务含义，而不是简单复制表结构。

---

### 18.3 只建类，不建关系

如果只有类，没有关系，本体很难支持推理和图谱查询。

真正有价值的是：

```text
供应商供应物料；
物料用于产品；
订单影响生产计划；
质量异常关联批次；
风险事件影响供应商。
```

---

### 18.4 把所有规则都塞进 OWL

OWL 适合语义和公理，不适合承载所有业务决策。

例如派发、审批、优先级、是否升级，通常更适合 DMN。

---

### 18.5 没有数据映射

本体如果不能映射到真实数据，就很难应用。

必须定义：

```text
哪个类来自哪张表；
哪个属性来自哪个字段；
哪个关系如何从数据推导；
更新频率是什么；
数据质量谁负责。
```

---

### 18.6 没有版本治理

本体会变化。

如果没有版本治理，就会出现：

```text
工具还按旧概念工作；
图谱按新关系存储；
Prompt 使用旧术语；
Workflow 节点找不到字段；
评测样例失效。
```

本体版本应该成为系统契约的一部分。

---

## 19. 个人 / 小团队 / 企业如何落地

| 场景 | 推荐起点 | 不建议 |
|---|---|---|
| 个人学习 | Markdown 术语表 + Mermaid 概念图 + YAML 示例 | 一上来研究完整 OWL 推理 |
| 家庭 / 个人知识库 | 概念分类 + 实体关系 + 标签体系 | 过度工程化 |
| 小团队 | 业务术语表 + YAML Ontology + 图数据库样例 | 直接做全域本体平台 |
| 企业 | 本体治理 + 数据映射 + 图谱投影 + 版本管理 + 评测 | 把本体当一次性建模项目 |

一个实用路线：

```text
第一步：选一个场景；
第二步：列术语表；
第三步：抽核心类和关系；
第四步：定义 10-20 个能力问题；
第五步：用 YAML 表达本体草稿；
第六步：接一小批真实数据；
第七步：验证能否回答问题；
第八步：再考虑 OWL / RDF / 图数据库。
```

---

## 20. 推荐学习路径

### 20.1 初学者先学

```text
什么是类、实体、属性、关系；
什么是术语表；
什么是知识图谱；
本体和数据库的区别；
本体和 RAG 的关系；
本体如何支撑 Agent。
```

### 20.2 进阶学习

```text
RDF 三元组；
RDFS；
OWL；
SHACL；
SPARQL；
图数据库查询；
本体抽取；
本体评测。
```

### 20.3 企业落地学习

```text
本体治理；
数据源映射；
知识图谱投影；
Agent Tool 语义契约；
DMN / BPMN / Workflow 集成；
版本管理；
标准合规；
质量评估。
```

---

## 21. 最终判断

本体不是一个孤立的学术概念。

在企业智能化系统里，它解决的是：

```text
业务世界如何被机器稳定理解。
```

最终可以这样记：

```text
本体定义概念和关系；
知识图谱存储实体和事实；
RAG 检索文档和证据；
Prompt 定义任务协议；
Tool 执行查询和动作；
DMN 做业务判断；
BPMN 推进业务流程；
Agent 连接用户、知识、工具和流程。
```

对知识复利工程师来说，本体的价值不是“画一张漂亮概念图”，而是：

```text
统一业务语言；
连接数据和知识；
支撑图谱检索；
约束 Agent 行为；
让工具输入输出有语义；
让流程节点理解业务对象；
让经验和规则可以被沉淀、复用和评测。
```

一句话总结：

> 本体是让企业 AI 从“会读文字”走向“理解业务世界”的关键语义基础设施。
