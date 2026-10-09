# Open Ontologies 生产本体变更管理调研

## 1. 调研对象与资料来源

- 调研对象：`fabio-rovai/open-ontologies`（GitHub 约 964 stars，MIT，Rust 单二进制，最近更新活跃）。
- 资料来源：GitHub 仓库 README 与官方文档（含 HQDM 审计案例、Lean 4 证书机制说明），未做本地部署实测。商业版为 tesseractsemantics.com（引擎保持 MIT 开源，平台做托管版）。
- 调研日期：2026-09-29。

---

## 2. 一句话定位

Open Ontologies 是一个**生产本体（production ontology）的变更管理工具**：对每一次本体变更先做"爆炸半径（blast radius）"推演、再产出可独立复核的 Lean 4 证明证书——"Plan a change to a production ontology. See every consequence before you apply it. Then give the reviewer a proof that they can check without trust in you."

```text
它自称"Terraform for ontology"：Terraform 管基础设施变更的计划与apply，
它管语义资产变更的计划与apply，且每次 apply 附带可独立验证的证明。
```

它明确声明自己**不是本体编辑器**（画类层次请用 Protégé），而是在变更上生产环境之前跑的那个门禁。

---

## 3. 产品背景

企业语义层（本体、知识图谱、指标口径）一旦进入生产被多个 Agent / 应用消费，就出现了和数据库 Schema 一样的变更管理问题，但更隐蔽：

- 一次三行的小改动，文本 diff 只有三行，但**语义后果可以有九百多条**（README 案例：one triple change → 901 new consequences）；
- 普通推理器给出的答案是"推理器说如此"，人无法独立验证；
- 审计场景下，审计员拿到的往往只是一张截图。

open-ontologies 把这三个缺口分别对应成 blast radius 报告、Lean 4 证明证书、可复核文件。

---

## 4. 核心能力拆解

### 4.1 变更计划与 blast radius

```bash
printf 'load base.ttl\nplan proposed.ttl\n' | open-ontologies batch -
```

输出：新增/删除类计数、受影响三元组数（blast radius）、风险评分（risk score）、保守性判定（是否在规则表下 not conservative）、新增推理后果数量与耗时。核心卖点是"shape diff 看起来安全的改动，语义上可能不保守"——文本 diff 根本展示不出这个 gap。

### 4.2 Lean 4 证明证书

每次运行会写出一个证书文件，配套独立检查器 `oo-cert`：

- 复核者**不需要本软件、不需要网络**即可重新验证（`oo-cert asserted.tsv derivations.tsv`，通过则 exit 0）；
- 伪造的结论会被拒绝：向 derivation 文件写入一条错误结论，检查器 exit 1 并指名不成立的规则；
- 声称有定理（`OOCert.certificate_sound`）覆盖证书的可靠性。

README 强调："这个拒绝伪造的能力，而不是头条功能，才是经得起检验的部分。" 官方案例数字：426 asserted / 259 certified / 1 rejected。

### 4.3 与普通推理器的对比（README 官方表）

| 维度 | 普通推理器 | Open Ontologies |
|---|---|---|
| 答案为何成立 | "推理器说如此" | 命名每条规则和前提的证书 |
| 谁能验证 | 另一个实现可能同意，但无已验证的检查器接受任一方 | 任何人，用与引擎不共享代码的检查器 |
| 引擎有缺陷时 | 只知道两个实现有一个错 | 检查器拒绝该答案，exit 1 |
| 人工篡改输出 | 发现不了 | 检查器拒绝并指出行和规则 |
| 审计员拿到什么 | 截图 | 可以再次核验的文件 |

### 4.4 其余能力

- OWL / RDFS 推理 + SWRL / RIF Core / Horn 规则表（自带规则会带"这是你的规则不是标准"的判定词）；
- SHACL 校验（对 W3C 套件做实测度量，而不是声称通过）；
- 可满足性给出有限模型回放；不可满足性给出可证书化的反驳；
- **RAG 切片检索附带 entailment preservation 保证**（99% 覆盖率可能恰好丢了那条要紧的三元组）；
- 生产变更全周期：plan / blast radius / risk score / locked IRIs / apply / monitor / drift / rollback；
- 数据装载：CSV、JSON、XML、YAML、XLSX、Parquet、PostgreSQL、DuckDB → RDF；
- 电子表格输入 → 本体 + 逐行证据（业务同学的表格可以带证据地"升格"为语义资产）；
- **MCP server**：Claude / Cursor 可在对话中直接操作全部能力；
- 纯 Rust 单二进制，无 JVM、无 Protégé 依赖。

### 4.5 HQDM 审计案例（官方展示）

对同一 HQDM 本体的两个文件做审计：RDFS 文件查出 23 个未声明类、12 处 `rdfs:range` 错误；OWL 文件 195 条可满足、39 条不可判定——展示"存量语义资产的体检"能力。

---

## 5. 与相邻产品的差异

| 相邻产品 | 差异 |
|---|---|
| Protégé / WebProtégé | 本体编辑器，画图用；open-ontologies 是变更门禁，管"改了之后会发生什么" |
| Apache Jena / Ontotext GraphDB 等推理引擎 | 给答案但不给可独立验证的证明；open-ontologies 的差异化恰恰是证书与拒绝伪造 |
| Palantir Foundry Ontology | Foundry 做的是"本体 + 数据 + 动作"的运行时绑定（偏厚平台）；open-ontologies 只做变更治理这一件事（偏薄工具），且开源可私有化 |
| Terraform / IaC | 定位类比对象：Terraform 把"改基础设施"从手工操作变成可计划、可审查、可回滚的流程；open-ontologies 对语义资产做同样的事 |
| 数澜 / 明略等国内语义层产品 | 国内产品把本体当数据底座的一部分整体卖；open-ontologies 把"本体变更治理"单独立成一个可组合的工具 |

---

## 6. 优势

1. **问题定义极准**：本体进入生产后被多方消费，变更管理是真实且被普遍忽视的缺口；
2. **可验证性做到密码学级别的严格**：证明证书 + 独立检查器 + 拒绝伪造，"审计员不需要信任你"这个标准在 AI 语义工具里几乎独一份；
3. **工程形态克制**：单二进制、MIT、引擎与商业版分离，"薄工具"而不是"厚平台"，容易被组合进任何已有语义栈；
4. **MCP 原生**：可以直接成为 Claude 的一个工具——语义变更治理本身可以被 Agent 工作流调用；
5. **诚实边界声明**：不可满足性答案上明确"无保证且工具明说"，不拿证明的词汇去包装意见——这种措辞纪律本身就是可信度信号。

---

## 7. 短板与未验证点

1. **规模上限未知**：blast radius 推演在千万级三元组 + 复杂规则表下的耗时未验证；
2. **Lean 4 依赖的严肃性**：`OOCert.certificate_sound` 定理的证明本身是否经过第三方审查未确认（信任根问题：你最终还是得信任这个定理）；
3. **Horn/SWRL 规则表达能力**：复杂业务规则（聚合、时序、例外）能否表达未验证；
4. **中文 / 国内场景空白**：无中文资料、无国内案例，术语体系（HQDM 偏国防/制造业数据管理方法论）有学习成本；
5. **只管本体，不管语义层的其他面**：指标口径、业务术语、Agent 上下文装配不在其范围内——它是语义治理的一环，不是全部；
6. 社区体量（约 1k stars）尚小，长期维护与路线图待观察。

---

## 8. 适用场景

- 本体 / 知识图谱已进入生产、被多个 Agent 消费、需要变更门禁的团队；
- 强审计行业（金融合规、国防、医疗）需要"结论可独立复核"的语义资产；
- 存量语义资产的体检与迁移前评估（RDF → OWL 升级、双文件对齐审计）；
- 把电子表格规则"带证据地"升格为本体（与我们"人肉规则编译器"的观察直接相关）；
- RAG 知识切片需要 entailment 保证而非覆盖率口号的场景。

---

## 9. 对我们当前项目的启发

**（1）补上了 04-06 联邦本体模块缺失的一环。** 我们把"语义联邦本体"列为平台四件公共品之一，但 04-06 对它的描述停留在"统一各系统的对象语义"。open-ontologies 指出了更关键的问题：**本体一旦是公共品，变更就不是编辑行为而是治理行为**——谁批准、影响面多大、如何回滚、审计员如何复核。联邦本体模块的设计里应补上"变更门禁"子模块：blast radius 报告 + 保守性判定 + locked IRIs + rollback。

**（2）证明证书 vs 四态结论铁律的呼应。** 我们从案例里总结出"结论必须带 UNVERIFIED 等四态"，是行为层的可信分级；open-ontologies 的"asserted / certified / rejected + 意见不冒充证明的措辞纪律"是资产层的同类设计。两级合起来才构成完整的可信体系：Agent 说话有四态，资产变更有证书。

**（3）电子表格 → 本体 + 逐行证据，是"存量收编"的标准件。** 17 案例里大量资产活在 Excel 和文档里（字段字典、大白话规则、剧本）。open-ontologies 的表格装载 + 逐行证据输出，恰好是"把存量人肉资产升格为受治理语义资产"的工具化路径——这比"重做一遍本体"的规划型做法便宜一个数量级。

**（4）与 Palantir Foundry Ontology 的对照价值。** Foundry 证明本体值得做厚（动作绑定），open-ontologies 证明本体治理可以单独做薄。我们的路线判断与 04-06 一致：先薄（变更治理工具收编存量），厚不厚看需求演化，而不是一开始就上 Foundry 形态。

**（5）家庭营养师项目。** 当前家庭营养规则体量小（Git Markdown 管理、版本化 prompt），暂不需要 blast radius 级治理；但如果未来规则膨胀到"疾病禁忌 + 药物相互作用 + 家庭成员偏好"交叉，可参考其"规则表 + 判定词"的做法给规则加证据标注。

---

## 10. 后续需要实测的问题

1. 用一个中等规模本体（万级三元组 + 数十条规则）实测 blast radius 推演耗时与报告可读性；
2. `oo-cert` 独立复核流程在非技术审计员手里的实际可用性（是否真能做到"不需要信任你"）；
3. MCP 接入 Claude 后的完整工作流体验：让 Claude 提议一个 schema 变更 → 自动跑 plan → 人审 blast radius → apply；
4. 电子表格装载的容错能力：真实业务 Excel（合并单元格、多sheet、注释行）的通过率；
5. Horn 规则表能否表达我们质量数据分析场景的典型规则（阈值 + 分层 + 例外）；
6. 中文术语 / 中文本体的处理是否有坑（分词无关但 IRI 命名习惯差异）。
