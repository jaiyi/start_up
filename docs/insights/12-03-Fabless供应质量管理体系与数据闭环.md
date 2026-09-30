# 12-03 · Fabless 供应质量管理体系与数据闭环

> 讨论稿 / 会更新 · 最近更新 2026-09-30
>
> **一句话结论**：对兆易创新这类 Fabless 芯片公司来说，质量管理的核心不是替代晶圆厂管每一道制程，而是通过供应商准入、质量协议、数据权利、NPI 质量规划、lot release、PCN 变更管理、OSAT / 测试厂管控和 RMA 反向追溯，把晶圆厂、封测厂、测试厂、模组厂纳入自己的供应质量闭环。

---

## 0. 这篇和前几篇的关系

`12-芯片制程质量异常识别框架.md` 更偏工艺质量工程视角：

> 如何从 Inline、WAT、CP、FT、可靠性和图像数据里提前发现制程异常和 spec 内边缘品。

`12-01-芯片制程质量异常识别的可计算模型设计.md` 更偏数据挖掘视角：

> 如何把工艺专家经验转成可计算算子、数学特征、异常检测模型和风险分。

`12-02-芯片良率水平与难拦截失效的数据挖掘优先级.md` 更偏良率和难拦截失效视角：

> 哪些产品良率通常较高，哪些失效难提前拦截，哪些问题最适合优先用数据挖掘攻克。

这一篇补上一个关键修正：

> 兆易创新不是晶圆代工厂，而是 Fabless。它不直接控制每台设备、每个 chamber、每个 recipe，但它必须控制供应链质量风险是否可见、可追溯、可拦截、可闭环。

因此，Fabless 的质量管理重点不是“替代代工厂做制程控制”，而是：

```text
把产品质量目标
  ↓
转成供应商过程控制要求、测试要求、数据交付要求和变更管理要求
  ↓
再用 WAT / CP / FT / reliability / RMA 数据验证供应链是否稳定可信
```

---

## 1. 代工厂视角和 Fabless 视角的区别

### 1.1 代工厂关心什么

代工厂更关心过程本身是否稳定。

典型问题：

- 哪个 process step 漂了；
- 哪台 tool / chamber 异常；
- 哪个 recipe window 变窄；
- 哪个 Inline 参数 out of control；
- 哪个 reticle / mask / litho / etch / CMP 环节出问题；
- 如何调工艺，把 wafer 做回目标中心。

它的核心问题是：

> 过程是否受控？异常来自哪一步？如何恢复制程稳定？

---

### 1.2 Fabless 关心什么

Fabless 更关心供应链交付是否可信。

典型问题：

- 这个供应商是否有能力稳定交付；
- 这个 lot / wafer / package lot 是否可以放行；
- 供应商给的数据是否足够判断风险；
- CP / FT / reliability / RMA 是否能追溯到供应链；
- 代工厂或封测厂发生变更时，是否影响产品质量；
- 出现客诉后，能否推动供应商 8D / CAPA；
- 哪些供应商、工艺平台、封装厂、测试厂组合风险更高。

它的核心问题是：

> 供应链是否可控？质量风险是否可见？异常是否能被及时拦截和闭环？

---

### 1.3 视角差异总结

| 维度 | 代工厂 / IDM | Fabless |
|---|---|---|
| 控制对象 | 工艺 step、tool、chamber、recipe | 供应商、lot、wafer、package、test house、客户质量 |
| 数据深度 | Inline 原始数据、设备参数、工艺窗口 | 供应商交付数据、WAT、CP、FT、reliability、RMA |
| 决策问题 | 如何修正制程 | 是否放行、加测、hold、降级、追责、换供应商 |
| 质量动作 | 调机、调 recipe、停线、rework | 供应商 8D、PCN 管控、lot release、guardband、RMA 追溯 |
| 数据挖掘重点 | chamber 异常、工艺漂移、defect root cause | 供应质量风险、maverick lot、test escape、RMA 反向闭环 |

一句话：

> 代工厂管“过程怎么稳定”，Fabless 管“供应链交付是否可信”。

---

## 2. Fabless 供应质量管理的总框架

Fabless SQM 可以拆成 8 个模块。

```text
Supplier Qualification
  ↓
Quality Agreement / Data Rights
  ↓
NPI Quality Planning
  ↓
Mass Production Lot Release
  ↓
PCN / Change Management
  ↓
OSAT / Test House Control
  ↓
RMA / Customer Quality Loop
  ↓
Supplier Scorecard / Continuous Improvement
```

这套体系的关键不是多做几个 dashboard，而是形成一个闭环：

```text
供应商准入时定义能力边界
量产前定义质量控制计划
量产中用数据做 lot release
异常时用 genealogy 快速圈定范围
客诉后把现场失败反向喂给测试策略和供应商管理
```

---

## 3. 供应商准入和分层管理

### 3.1 供应商分层

Fabless 要先把供应商按质量风险分层。

```text
Tier 0：战略核心供应商
  晶圆代工厂、核心封测厂、核心测试厂

Tier 1：关键供应商
  特定封装、探针卡、测试 socket、模组厂、关键材料

Tier 2：一般供应商
  通用材料、非关键工序、备选产能
```

不同层级要求不同。Tier 0 / Tier 1 供应商必须进入严格质量管理闭环。

---

### 3.2 准入评估重点

核心供应商不能只看报价和产能，还要看质量协作能力。

重点评估：

- 工艺平台成熟度；
- 量产历史；
- 良率稳定性；
- 可靠性记录；
- 质量体系成熟度；
- PCN 透明度；
- 数据开放程度；
- 异常响应速度；
- 8D / CAPA 质量；
- FA 支持能力；
- 是否支持联合 debug；
- 是否能提供 lot / wafer / die / package genealogy。

对 Fabless 来说，供应商最重要的不只是“能生产”，而是：

> 出问题时，能不能拿到足够数据，能不能一起定位，能不能快速闭环。

---

## 4. 质量协议：把数据权利提前写清楚

很多 Fabless 后续质量数据做不起来，不是因为没有模型，而是因为一开始没有把数据权利写进质量协议。

质量协议里应该明确：

```text
需要供应商提供哪些数据
数据粒度到 lot / wafer / die / site 还是只到 summary
异常时必须提供哪些额外数据
PCN 提前多久通知
哪些变更必须重做 qualification
异常 lot 如何 hold
客户 RMA 时如何协同 FA
8D / CAPA 时限
数据保存年限
```

---

### 4.1 晶圆厂数据要求

Fabless 不一定能拿到晶圆厂所有 Inline 原始数据，但至少应该争取：

- WAT / PCM 数据；
- key monitor trend；
- wafer map / bin map；
- process excursion notification；
- abnormal lot disclosure；
- wafer / lot genealogy；
- reticle / mask revision；
- process platform / recipe change summary；
- reliability monitor summary；
- PCN / ECN / deviation approval。

最低要求不是“知道所有工艺细节”，而是：

> 能判断当前 lot 是否 out-of-family，能在客诉后追溯到相关批次和变更窗口。

---

### 4.2 封测厂数据要求

OSAT / test house 至少要提供：

- assembly lot；
- package lot；
- substrate / leadframe / mold compound lot；
- wire bond / die attach 关键过程记录；
- X-ray / SAM / AOI summary；
- test program version；
- tester id；
- handler id；
- socket id；
- site id；
- first pass yield；
- final yield；
- retest count；
- bin distribution；
- temperature corner result；
- correlation / GRR 记录。

测试厂数据尤其关键，因为很多 escape 和偶发问题会先体现在：

```text
first fail final pass
site-to-site delta
tester-to-tester correlation drift
socket aging
probe card / contact issue
```

---

## 5. NPI 阶段的供应质量前置规划

Fabless 的质量管理不能等量产后再补救。NPI 阶段就要把质量目标转成供应链控制计划。

### 5.1 NPI 要定义的质量对象

至少包括：

- CTQ：critical to quality；
- CTP：critical to process；
- 关键 WAT monitor；
- CP 测试覆盖；
- FT 测试覆盖；
- reliability qualification plan；
- guardband；
- corner lot 要求；
- golden sample；
- limit setting；
- sample size；
- burn-in / screen 策略；
- customer use case coverage。

NPI 的关键问题不是“能不能 tape out”，而是：

> 量产后靠哪些数据确认供应商交付处于正常族群？

---

### 5.2 按产品线定义 CTQ

#### NOR / NAND Flash

重点 CTQ：

- read margin；
- program / erase time；
- verify fail count；
- retention；
- endurance；
- read disturb / program disturb；
- raw BER / ECC correction count；
- bad block / bad sector；
- QSPI / SPI timing margin。

#### GD32 MCU

重点 CTQ：

- eFlash retention / endurance；
- SRAM Vmin；
- Fmax；
- Vmin；
- POR / BOR；
- oscillator startup；
- PLL lock；
- sleep current；
- IO leakage；
- ADC / DAC accuracy；
- boot / reset robustness。

#### 指纹 / 触控传感器

重点 CTQ：

- baseline mean / sigma；
- noise floor；
- SNR；
- dead pixel；
- row / column noise；
- humidity drift；
- charger noise sensitivity；
- raw image quality；
- module calibration margin。

#### 模拟 / 电源芯片

重点 CTQ：

- bandgap / reference；
- trim code；
- tempco；
- Iq；
- output voltage error；
- line / load regulation；
- current limit；
- load transient；
- dropout；
- thermal shutdown；
- phase margin proxy；
- ripple / noise。

---

## 6. 量产阶段：Fabless 要做 Lot Acceptance

Fabless 不应该只接受供应商一句：

```text
This lot passed.
```

而应该建立自己的 lot release 规则。

### 6.1 Lot release 要看什么

每个 lot 放行前至少看：

- WAT 是否 out-of-family；
- CP yield 是否异常；
- FT yield 是否异常；
- wafer map 是否有 pattern；
- retest rate 是否升高；
- first fail final pass 是否异常；
- 关键参数 tail 是否变厚；
- reliability 抽样是否异常；
- 是否发生 PCN / ECN；
- 是否来自新 tool / 新 chamber / 新封装线 / 新测试机台；
- 是否与历史 RMA 高风险组合相似。

---

### 6.2 Lot release 风险等级

建议输出不是简单 pass / fail，而是风险等级。

| 等级 | 含义 | 动作 |
|---|---|---|
| R0 | 正常 | 正常放行 |
| R1 | 关注 | 放行但持续监控 |
| R2 | 加严 | 追加测试 / 加严 guardband 后放行 |
| R3 | 隔离 | hold lot，供应商解释和工程评审后再决定 |
| R4 | 停出 | 停止出货，触发供应商 8D / CAPA / 客户风险评估 |

Fabless 最应该掌握的是：

> 自己做 lot release decision，而不是完全依赖供应商 final pass。

---

## 7. PCN / 变更管理

Fabless 最怕供应商“看起来很小”的变更。

### 7.1 必须纳入 PCN 的变更

典型包括：

- wafer fab 变更；
- process recipe 调整；
- material 变更；
- mask revision；
- reticle 变更；
- tool / chamber 迁移；
- test program 版本变更；
- CP / FT limit 变更；
- probe card 变更；
- tester 变更；
- OSAT 厂区变更；
- package type 变更；
- substrate / leadframe 变更；
- wire bond 参数变更；
- mold compound 变更；
- trim algorithm 变更；
- packing / marking / traceability 规则变更。

这些变更不一定立刻造成 fail，但可能改变 tail risk。

---

### 7.2 PCN 管理动作

Fabless 要做：

```text
PCN classification
+ risk assessment
+ delta qualification
+ pilot lot monitoring
+ customer notification decision
+ post-change enhanced monitoring
```

关键不是形式上收 PCN，而是回答：

- 变更影响哪些产品、客户、lot；
- 需要做哪些 delta qualification；
- 是否需要客户通知；
- 变更前后参数分布是否发生漂移；
- 变更后 RMA / retest / reliability 是否异常。

PCN 管不好，后续质量问题经常会变成：

> 供应商说只是小改动，客户现场却出现新失效模式。

---

## 8. OSAT / 测试厂质量不能被低估

Fabless 往往容易把注意力放在晶圆代工厂，但封测和测试厂同样关键。

### 8.1 OSAT 风险

常见风险：

- die attach void；
- wire bond lift；
- bond wire sweep；
- mold delamination；
- package crack；
- warpage；
- moisture sensitivity；
- X-ray void；
- SAM delamination；
- trim / marking / packing 错误；
- mixed lot；
- ESD handling；
- storage / baking / MSL 管理异常。

这些问题可能不会在 CP 阶段出现，却会在 FT、可靠性或客户现场出现。

---

### 8.2 测试厂风险

常见风险：

- test program 版本错误；
- limit 设置错误；
- tester correlation 差；
- site-to-site 偏差；
- probe card 污染；
- socket 老化；
- handler 温控异常；
- contact 不稳定；
- retest policy 不合理；
- first fail final pass 没有单独管控。

测试厂必须重点监控：

```text
tester_id
site_id
socket_id
handler_id
probe_card_id
test_program_version
retest_count
first_pass_yield
final_pass_yield
site_to_site_delta
```

很多“芯片质量问题”，本质上是 test escape、socket、探针、封装应力或混料问题。

---

## 9. 客诉 / RMA 必须反向驱动供应质量

Fabless 最宝贵的数据不是供应商报告，而是客户现场失败。

### 9.1 RMA 闭环

RMA 闭环至少要做到：

```text
客户症状标准化
  ↓
样品序列号 / lot / wafer / die / package lot 追溯
  ↓
CP / FT / WAT / reliability 数据回看
  ↓
FA 物理证据确认
  ↓
供应商 8D / CAPA
  ↓
测试策略和 guardband 更新
  ↓
同源 lot 风险排查
```

很多公司质量体系弱，不是因为没有测试，而是因为：

> 客诉回来了，但没有反向更新测试程序、供应商规则和 lot release 策略。

---

### 9.2 RMA 要反向回答的问题

每个重要客诉都要反问：

- 出货前是否有弱信号；
- 同 lot 是否有相似 tail；
- 同 wafer 是否有空间 pattern；
- 同 package lot 是否有封装风险；
- 同 test site 是否有 retest / correlation 异常；
- 是否发生过 PCN；
- 是否来自同一客户应用场景；
- 是否需要新增测试项或 guardband；
- 是否需要供应商 CAPA；
- 是否有同源产品需要隔离。

这才是 Fabless 质量体系的复利点。

---

## 10. 按产品线看 Fabless SQM 重点

### 10.1 NOR / NAND Flash

供应商管理重点：

- tunnel oxide / cell process 稳定性；
- array defect density；
- WAT / PCM monitor；
- retention monitor；
- endurance monitor；
- disturb monitor；
- wafer map pattern；
- bad block / sector 分布；
- CP 原始 margin 数据；
- ECC / read retry 相关数据。

Fabless 自己要掌握：

- read margin 分布；
- program / erase time tail；
- erase fail / program fail；
- retention bake 后 BER delta；
- P/E cycling 后 BER growth；
- read disturb delta；
- QSPI timing margin；
- high-temp / low-voltage corner。

核心原则：

> 不要只看 final yield，要看 margin tail 和退化速度。

---

### 10.2 GD32 MCU

供应质量重点：

- eFlash process monitor；
- logic process corner；
- leakage / RO / Vt trend；
- wafer edge / cluster 风险；
- SRAM weak bit；
- POR / BOR；
- oscillator startup；
- low-power leakage；
- ADC / DAC 参数；
- CP / FT site correlation；
- test program 版本控制；
- trim data 可追溯。

Fabless 自己要加强：

- test coverage review；
- corner condition validation；
- low-voltage / high-temp / cold-start screen；
- slow ramp test；
- eFlash margin test；
- retest-pass unit 管理；
- failure mode 和客户应用场景映射。

核心原则：

> 供应商保证工艺稳定，Fabless 自己保证产品级边界和客户应用场景被覆盖。

---

### 10.3 指纹 / 触控传感器

这类产品要管 die、模组、材料、算法和环境。

供应质量重点：

- sensor array；
- bump / package；
- FPC；
- cover glass；
- module assembly；
- calibration；
- firmware / algorithm threshold；
- humidity / noise / charger scenario。

Fabless 自己要加强：

- raw signal quality spec；
- baseline / noise / SNR 分布监控；
- dead pixel / row noise / column noise 管控；
- humidity drift screen；
- charger noise sensitivity screen；
- 模组厂工艺 audit；
- 盖板 / 胶水 / FPC 供应商变更管理；
- 客户误触 / 识别失败日志回流。

核心原则：

> 不要只看“传感器芯片 pass”，要看“模组 + 环境 + 算法”下的信号质量是否稳定。

---

### 10.4 模拟 / 电源芯片

供应质量重点：

- process corner 稳定性；
- passive component variation；
- metal / contact resistance；
- high-voltage device monitor；
- package thermal performance；
- trim 数据可追溯；
- FT tester correlation；
- high-temp / low-temp 参数分布。

Fabless 自己要加强：

- 应用电路验证；
- 外围器件兼容性；
- load transient matrix；
- ESR / capacitance sweep；
- thermal board validation；
- customer layout guideline；
- RMA 中系统级复现。

核心原则：

> 供应商管参数稳定，Fabless 管应用边界和系统稳定性。

---

## 11. 数据挖掘在 Fabless SQM 里的正确优先级

站在 Fabless 角度，数据挖掘的优先级要调整。

不是优先做：

```text
预测某台 chamber 是否异常
```

而是优先做：

```text
供应商交付的 lot / wafer / package / test data 是否显示质量风险
```

也就是从“制程根因模型”转成“供应质量风险模型”。

---

### 11.1 P0：供应商数据标准化和 genealogy 打通

这是第一优先级。

必须打通：

```text
product_id
revision
fab
process_platform
foundry_lot
wafer_id
die_x / die_y
cp_program_version
probe_card
tester_id
test_site
package_lot
osat
assembly_line
ft_program_version
socket_id
shipment_lot
customer
RMA_id
```

目标：

> 任意一个 RMA 样品，要能追到 wafer、package lot、test site、program version、供应商变更记录。

没有 genealogy，后面的模型都是空中楼阁。

---

### 11.2 P0：Lot / wafer out-of-family 监控

输入：

- WAT；
- CP；
- FT；
- yield；
- wafer map；
- retest；
- reliability sample；
- supplier summary。

输出：

```text
LotRiskScore
WaferRiskScore
RiskReason
SuggestedAction
```

核心问题：

> 这个 lot 能不能放？要不要加测？要不要 hold？要不要要求供应商解释？

这是 Fabless 最该优先做的数据挖掘。

---

### 11.3 P0：Retest-pass 和 test escape 管理

重点监控：

```text
first fail final pass
retest count
site-to-site yield delta
tester-to-tester correlation
socket aging pattern
probe card related fail
temperature corner recovery
```

工程动作：

- 高风险 retest-pass 单独标记；
- 特定 bin 不允许 retest-pass 出货；
- site 异常触发测试厂调查；
- socket / probe card 超限更换；
- 更新 test program limit；
- 对高风险产品加严出货规则。

这个方向性价比很高，因为数据容易拿，动作明确，而且对偶发边缘品敏感。

---

### 11.4 P0：供应商 scorecard

Fabless 必须有供应商质量评分，而不是只看价格和交期。

评分维度：

```text
incoming yield stability
CP / FT yield volatility
maverick lot count
excursion count
8D closure time
CAPA effectiveness
PCN compliance
RMA ppm
FA support quality
data completeness
response speed
```

输出：

```text
SupplierQualityScore
SupplierRiskTrend
SupplierDataComplianceScore
ExcursionFrequency
CAPAEffectivenessScore
```

这比单纯预测某颗 die 是否会坏，更符合 Fabless 管理现实。

---

### 11.5 P0 / P1：存储产品 margin tail 监控

对 NOR / NAND / eFlash / DRAM 都重要。

重点不是只看良率，而是看：

```text
read margin tail
erase / program time tail
raw BER tail
ECC correction tail
weak bit count
retention delta
P/E degradation rate
```

这些指标可以直接支持：

- guardband；
- customer grade；
- burn-in / bake screen；
- 降级出货；
- 特定 lot 加测；
- 与供应商讨论 process drift。

---

### 11.6 P1：可靠性 sample 与量产数据关联

可靠性测试是抽样，不能只看 sample pass / fail。

Fabless 应该做：

```text
reliability sample result
+ same lot CP / FT distribution
+ WAT trend
+ wafer map pattern
+ supplier process history
=> lot / platform reliability risk
```

目标不是精确预测每颗芯片寿命，而是：

> 判断哪些产品族群、lot、工艺平台、封装组合的可靠性风险更高。

---

### 11.7 P1：RMA 反向追溯

输入：

- 客户症状；
- FA 结论；
- RMA 批次；
- 应用场景；
- CP / FT 原始数据；
- WAT / wafer map；
- supplier genealogy；
- PCN history。

输出：

```text
RMA lift by supplier
RMA lift by wafer lot
RMA lift by package lot
RMA lift by test site
RMA lift by feature combination
test coverage gap
new screen recommendation
```

这能直接反哺供应商管理：

- 哪个供应商问题多；
- 哪个封测厂 escape 多；
- 哪类 PCN 后 RMA 上升；
- 哪个测试策略漏掉了边缘品。

---

### 11.8 P1 / P2：图像和 Inline 数据

Fabless 可以做图像和 Inline 数据挖掘，但优先级要现实。

更现实的路径：

```text
第一层：拿 wafer map / bin map
第二层：拿 defect summary / defect density / location
第三层：拿关键图像或 image embedding
第四层：和 CP / FT / RMA 做多模态关联
```

Fabless 不一定需要保存所有原始 SEM 图像，但至少要拿到：

- defect type；
- defect count；
- defect density；
- defect location；
- critical layer；
- wafer map overlay；
- supplier review conclusion。

---

## 12. Fabless SQM 的组织和流程闭环

### 12.1 Supplier Qualification 闭环

目标：供应商进来前就筛掉高风险。

包括：

- audit；
- process capability review；
- reliability history；
- sample qualification；
- pilot run；
- data sharing capability；
- PCN discipline；
- failure analysis capability；
- backup capacity。

输出：

```text
Approved Vendor List
Qualified Process Platform
Qualified Package Platform
Qualified Test House
Supplier Risk Level
```

---

### 12.2 NPI Quality Planning 闭环

目标：新产品量产前，把质量控制计划定义好。

包括：

- CTQ 定义；
- control plan；
- DFT / BIST / test coverage；
- CP / FT limit；
- reliability plan；
- guardband；
- corner validation；
- customer use case validation；
- supplier responsibility matrix。

输出：

```text
Product Quality Plan
Test Coverage Matrix
Reliability Qualification Plan
Lot Release Criteria
```

---

### 12.3 Mass Production Monitoring 闭环

目标：量产中识别 maverick lot / wafer / supplier。

包括：

- yield trend；
- WAT trend；
- CP / FT trend；
- wafer map pattern；
- retest rate；
- reliability sample；
- PCN impact；
- supplier scorecard。

输出：

```text
Lot Release Decision
Supplier Risk Dashboard
Excursion Alert
Guardband Adjustment
```

---

### 12.4 Excursion / 8D / CAPA 闭环

目标：异常发生后快速控制范围。

流程：

```text
异常发现
  ↓
containment
  ↓
影响范围定义
  ↓
供应商 8D
  ↓
root cause
  ↓
corrective action
  ↓
effectiveness verification
  ↓
放行 / 召回 / 客户通知
```

关键是 scope 定义：

```text
same lot?
same wafer?
same chamber?
same package lot?
same tester?
same PCN window?
same customer shipment?
```

Fabless 必须能用 genealogy 快速回答这些问题。

---

### 12.5 Customer Quality 闭环

目标：客户现场问题反向改善供应链和测试。

包括：

- RMA intake；
- symptom standardization；
- FA；
- supplier trace；
- test escape analysis；
- corrective action；
- customer communication；
- prevention update。

输出：

```text
RMA Root Cause
Supplier Accountability
Test Program Update
Design / Process / Package Improvement
```

---

### 12.6 Data Governance 闭环

目标：让质量数据可用、可信、可追溯。

包括：

- 数据标准；
- 字段字典；
- lot / wafer / die key；
- test program version；
- supplier data SLA；
- missing data alarm；
- raw data retention；
- label standardization；
- dashboard and model governance。

这一步很基础，但最容易被低估。

---

## 13. Fabless 供应质量管理的核心指标

建议至少建立 5 类指标。

### 13.1 供应商交付稳定性

- lot yield volatility；
- wafer yield volatility；
- CP / FT yield delta；
- maverick wafer ratio；
- out-of-family lot count；
- retest rate trend。

### 13.2 供应商响应能力

- 8D on-time closure rate；
- CAPA effectiveness；
- FA turnaround time；
- data request response time；
- containment response time。

### 13.3 变更纪律

- PCN on-time notification；
- unapproved change count；
- post-PCN abnormal lot count；
- PCN qualification pass rate；
- customer notification compliance。

### 13.4 数据质量

- data completeness；
- genealogy completeness；
- missing wafer map rate；
- test program version traceability；
- RMA trace success rate。

### 13.5 客户质量

- RMA ppm；
- early life failure rate；
- field failure mode recurrence；
- customer line stop count；
- escaped defect count；
- repeat issue count。

这些指标合在一起，才是 Fabless 供应质量能力。

---

## 14. 推荐落地路线

### Phase 1：先补供应质量数据底座

目标：能追溯、能看数、能发现明显异常。

建设内容：

- 建立产品 / lot / wafer / die / package / test / shipment / RMA 主键体系；
- 统一 WAT / CP / FT / reliability / RMA 数据格式；
- 建立 supplier data SLA；
- 建立 genealogy 查询；
- 建立基础 lot release dashboard。

最小可用输出：

```text
输入一个 RMA SN
可以追到 wafer lot、package lot、tester、site、test program、PCN window、出货客户
```

---

### Phase 2：建设 P0 风险模型

目标：支持量产 lot release。

建设内容：

- lot / wafer out-of-family；
- wafer map pattern；
- retest-pass risk；
- key parameter tail monitoring；
- supplier scorecard。

输出：

```text
LotRiskScore
WaferRiskScore
SupplierQualityScore
RiskReason
SuggestedAction
```

这一步最容易产生实际管理价值。

---

### Phase 3：引入可靠性和 RMA 闭环

目标：把“当前 pass”升级为“未来质量风险”。

建设内容：

- stress delta；
- reliability sample 与量产数据关联；
- RMA 反向标注；
- FA 结论结构化；
- escaped defect root cause library；
- test coverage gap analysis。

输出：

```text
FieldRiskScore
RMA-Lift Feature Combination
New Screen Recommendation
Guardband Update Suggestion
```

---

### Phase 4：多模态和供应链智能化

目标：把图像、文本、参数、供应商事件连起来。

建设内容：

- defect summary / image embedding；
- wafer map + defect map + CP / FT overlay；
- supplier 8D / FA report 文本结构化；
- PCN impact model；
- customer symptom embedding；
- quality knowledge graph。

输出：

```text
Supplier Quality Knowledge Graph
PCN Risk Assessment
Multimodal Quality Alert
RMA Similar Case Retrieval
```

这一步更适合作为成熟阶段能力，而不是第一期。

---

## 15. 最终判断

如果只写 Inline、tool、chamber、制程 pattern，就会偏代工厂视角。Fabless 的正确重心应该是：

```text
供应商准入
+ 质量协议
+ 数据权利
+ NPI 质量规划
+ CP / FT 测试策略
+ lot release 风险决策
+ PCN 变更管理
+ OSAT / test house 管控
+ RMA 反向追溯
+ 供应商 scorecard
+ 数据挖掘辅助决策
```

对兆易创新这类产品组合，Fabless 供应质量管理的本质不是自己下场调工艺，而是：

> 用产品质量目标定义供应商过程控制要求，用数据协议确保风险可见，用 lot release 机制决定是否放行，用 RMA 反向追溯修正测试和供应商规则。

一句话收束：

> 代工厂管制程稳定，Fabless 管供应可信；真正成熟的 Fabless 质量体系，是把供应商、测试、可靠性和客户现场数据连成能追溯、能评分、能拦截、能追责、能持续改进的闭环。
