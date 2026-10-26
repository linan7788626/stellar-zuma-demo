# H-R Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **当前状态（2026-10-26）**：任务 1–4 完成。独立代码审查唯一重要发现（I1 动画冻结测试盲点）已修正；主会话在隔离副本中删除冻结门，确认补强测试能检出故障，真实源码最终全套 80/80、全部 JS 语法及差异检查通过。无注入集成演示与布局/遮挡/滚动可达性复核通过；细小文字的真机阅读体验与教学效果仍待真人试用。验证范围见 `docs/hr-learning-loop.md`，设计与接口未改变。

**Goal:** 用统一物理赫罗图支持暂停阅读和三类读图练习，交付可复现的学习与工程闭环。

**Architecture:** 纯模型与练习会话独立于DOM；共享Canvas renderer和阅读对话层负责展示；现有游戏仅接入场景Adapter、冻结门和入口。普通script顺序加载，保持离线运行。

**Tech Stack:** 原生JavaScript、Canvas、HTML/CSS、Node内置测试、现有隔离Chrome/CDP harness。

**Spec:** `docs/superpowers/specs/2026-10-25-hr-learning-loop-design.md`（用户已选择“按方案实施”）。

## Global Constraints

- 保留现有未提交成果；不重写游戏物理，不新增运行依赖、构建工具、数据上报或在线服务。
- 支持直接打开index.html，使用普通脚本；纯逻辑文件同时支持CommonJS以便Node测试。
- T=2500–100000 K，L/L☉=10⁻⁴–10⁶；太阳T=5772 K、L=1、R=1。
- 使用设计中的代表点与路径数据；路径/区域为教学示意，不冒充实测数据。
- 甲/乙为练习示意星；本次练习统计不改变游戏分数、存档、点亮或解锁；不声称作答证明掌握。
- 原17课、无尽入口、现有通关问答保留；小图有效字号至少约12px。
- 专员只修改分配文件，不提交、不推送，不派生子代理。父会话负责整合后的全套验证。
- 模型与UI两个写入范围可并行；游戏接入在其交付后执行。共用Interface变更先告知父会话。

## Shared Contracts

各任务遵守以下名称与字段，不自行另起别名。

### StellarHRModel（js/hr-model.js）

- `SUN={temperature:5772,luminosity:1,radius:1}`。
- `BOUNDS={minTemperature:2500,maxTemperature:100000,minLuminosity:1e-4,maxLuminosity:1e6}`。
- `spectral`：OBAFGKM顺序只读数组，每项`{id,name,temperature,luminosity,color}`。
- `regions`：超巨/巨星/白矮顺序，每项`{id,name,classification,temperature:[min,max],luminosity:[min,max],marker:{temperature,luminosity}}`；id分别`supergiant/giant/white-dwarf`。
- `evolution`：太阳/大质量顺序，每项`{id,name,points:[{temperature,luminosity}],stages:[{name,pointIndex}]}`。`stages`只列课程阶段：太阳4项对应pointIndex `[0,2,4,6]`，大质量3项对应`[0,2,4]`；其余points只是路径节点，不增加课程。
- `project({temperature,luminosity})->{x,y,inside}`：归一化，x左→右、y上→下；不夹断合法但越界的数据；非有限/非正输入抛RangeError。
- `radiusOf({temperature,luminosity})->R/R☉`；`luminosityAtRadius(temperature,radius)->L/L☉`，验证正有限输入。

### StellarHRLearning（js/hr-learning.js）

- `kinds=['temperature','luminosity','radius']`。
- `createSession({random=Math.random}={})->{snapshot(),answer(choiceId),next(kind?)}`。
- snapshot：`{question,answered,selectedChoiceId,correct,totals:{answered,correct}}`；初始`answered=false,selectedChoiceId=null,correct=null`。
- question：`{id,kind,prompt,stars:[{label:'甲',temperature,luminosity},{label:'乙',temperature,luminosity}],choices:[{id,text}],correctChoiceId,explanation}`。选项id为`a/b/same`，打乱展示顺序。
- answer/next均返回快照；无效选项、重复答案不改变统计。next默认当前题型，例子必须变化；切题型不重置总计。快照不能被调用者改写内部会话。

### StellarHRDiagram（js/hr-diagram.js）

- `render(canvas,scene)->void`；`hitTest(canvas,clientX,clientY)->{kind:'spectral'|'region',index}|null`。
- scene：`{density:'compact'|'standard'|'expanded',target,progress,showRadius,comparison,animation}`；字段均可省略。
- target为`{kind:'spectral',index}`、`{kind:'region',index}`或`{kind:'evolution',chain,stage}`；`stage`始终是课程阶段索引，坐标由`evolution[chain].stages[stage].pointIndex`解析；无target时显示目录与太阳。
- progress为只读的`{spectral:[],lum:[],evo:[[],[]]}`，与现有存档同形，renderer不修改它。
- comparison为`{kind,stars}`，直接消费question的kind/stars。
- animation为`{chain,stage,fraction}`，沿该链起点到指定stage回顾；单节点时强调该点，不伪造前置路径。
- 内部管理边距、DPR与上次场景命中几何；调用方不知晓像素坐标。合法越界点不画进图内假装有效，并提供说明。

### StellarHRPractice（js/hr-practice.js）

- `mount({getScene,onOpen,onClose})->{open(trigger?),close(),isOpen()}`。
- getScene返回基础scene，onOpen/onClose通知游戏冻结/解除阅读冻结；对话层管理本次session、焦点与背景inert，不操作游戏存档。
- 稳定DOM：侧栏`#hrOpenBtn`，独立层`#hrPractice`，图表`#hrPracticeCanvas`，关闭`#hrPracticeClose`，换题`#hrPracticeNext`；题型`data-hr-kind`，选项`data-hr-answer`。
- 卡片入口统一`data-action="read-hr"`，非primary样式，由游戏覆盖层委托转入controller.open。

## Review Focus

1. 暂停/介绍/过关/失败卡遮住侧栏：触屏仍需卡内入口，任务3实际点击全部来源。
2. 阅读中失焦/隐藏与Esc/Enter：不能误续玩或穿透底层，任务3验证。
3. frame()独立推进演化track：阅读冻结必须覆盖，任务3验证。
4. CSS尺寸/DPR变化后的绘图与选关同源，任务2验证缩放/命中，任务3验证真实选关。
5. 甲乙交换、相等与重复作答：答案不固定、统计不重复，任务1以明确实例验证。

---

### Task 1: 物理模型与纯练习会话

**Owner:** fixer。**Write scope:** 新建`js/hr-model.js`、`js/hr-learning.js`、`tests/hr-model.test.cjs`、`tests/hr-learning.test.cjs`。

**Interfaces:** 产出Model与Learning；浏览器全局和CommonJS提供同一个Interface。Learning使用Model.radiusOf判断半径，不复制公式。

- [x] 写模型失败测试：太阳R=1；同温L=100则R=10；T=11544/R=1则L=16；T=√(2500×100000)/L=10投影(0.5,0.5)；太阳y=0.6；高温在左/高光度在上；0/负数/NaN/Infinity拒绝；合法越界inside=false。
- [x] 运行`node --test tests/hr-model.test.cjs`记录失败，再实现设计所列代表点、路径、模型；区域边界选取有标注的合理示意范围。
- [x] 写会话失败测试：三类显式题例的正确答案、交换甲乙、相等、换题、无效/重复提交、快照隔离；不以被测函数计算预期答案。
- [x] 初始例子：温度(20000,1)与(4000,1)；光度(5772,100)与(5772,1)；半径(5772,100)与(5772,1)。各类均包含交换甲乙的变体与相等情形；半径相等可用(5772,1)与(11544,16)。解释引用坐标或L∝R²T⁴，区分光度与视亮度。
- [x] 初始为温度题，各题型以确定的变体顺序轮换，random仅用于选项排序；实现计数与重复作答保护。
- [x] 运行`node --test tests/hr-model.test.cjs tests/hr-learning.test.cjs`，报告失败→通过证据和文件列表。

### Task 2: 共享图表与阅读练习界面

**Owner:** designer。**Write scope:** 新建`js/hr-diagram.js`、`js/hr-practice.js`、`tests/hr-ui.test.cjs`；修改`index.html`、`css/style.css`。不改game.js。

**Interfaces:** 消费Model/Learning；产出Diagram/Practice，遵守Shared Contracts。可先依接口开发，模型文件就绪后完成浏览器验证。

- [x] 先建立失败浏览器测试：侧栏入口可见；公共mount后打开/关闭回调一次；三类练习反馈与换题统计；Tab/Shift+Tab不逃逸、Esc关闭、焦点返回。
- [x] renderer支持小图/标题/课程/演化/练习，使用太阳、对数刻度、物理等半径线、教学示意标签和甲乙。不得调用旧game绘图；按CSS/DPR绘制，移动/Retina字号可读。
- [x] hitTest复用绘图几何，仅命中目录光谱点或区域；测试实际CSS/DPR下的命中，不只断言DOM存在。
- [x] 独立对话层：桌面弹性两栏/窄屏单栏，内容滚动、关闭可达、图表文字摘要；三个题型，无混合模式或图层开关；“本次答对 X / 已答 Y”，说明不影响游戏进度。
- [x] mount绑定侧栏入口；背景inert只作用于对话框之外的同级内容，关闭恢复原inert与焦点；处理阅读层Tab/Esc/1/2/3，不能依赖底层暂停卡。
- [x] index依次加载hr-model、hr-diagram、hr-learning、hr-practice、game，路径相对；模块加载不自动冻结游戏，挂载由任务3负责。
- [x] 运行`node --test tests/hr-ui.test.cjs`及新增JS语法检查。模型就绪后检查1280×720、1024×720、390×844、844×390并报告截图路径。

### Task 3: 游戏接入与跨状态回归

**Owner:** 独立fixer任务。**Write scope:** `js/game.js`、`tests/browser.test.cjs`；必要时新建`tests/hr-integration.test.cjs`。接口问题告知父会话，不修改别人的文件。

**Interfaces:** 消费任务1/2；getScene以gamePart/featuredType/curLum/evoInfo组装target/progress；onOpen设置readingOpen并setFast(false)，onClose只解除阅读冻结，不盲目写state='playing'。

- [x] 先增加失败回归：playing打开后advanceFrames星链位置/技能不变、加速释放；关闭恢复前进；paused/intro/levelclear打开后返回原状态。
- [x] 失焦/visibilitychange后关闭仍暂停；Esc不二次切换，Enter/Space/F不穿透；未答/已答过关卡的DOM与下一关状态保持。
- [x] 删除旧三套绘图、归一化坐标、手写半径线，用少量场景Adapter调用共享renderer。STAR_INFO.hr、LUM的marker/lab/region、EVO旧track不再作为第二来源。
- [x] track只保留时间、链/阶段，共享renderer绘制animation；冻结门同时守住update与frame内track推进。visibility/blur只把playing转paused，不改其余来源状态。
- [x] 所有卡片添加次级read-hr入口，可由showOverlay统一追加，保留原primary与问答DOM；H打开，阅读期间所有底层游戏输入先返回。
- [x] 标题选关转用hitTest，保留litCount条件、对应关卡编号和介绍；调整旧G点坐标断言，不削弱选关检查。
- [x] HTTP本地资源检查加入新增JS；file://、全部课程/无尽、DPR、camera与原有回归保留。演化冻结用canvas图像/绘制比较，不新增测试专用生产接口。
- [x] 运行所属浏览器测试并报告证据，交父会话合并验证。

### Task 4: 闭环交付

**Owner:** 主会话协调、文案与最终证据；独立审查专员只读审阅。

**Files:** 更新`README.md`、`docs/project-review.md`；新增`docs/hr-learning-loop.md`（数据、操作、演示、验证）。

- [x] 读取各专员产物，核对范围/Interface/证据；修正回送原专员，不并发改同一文件。
- [x] 整合后运行`node --test tests/*.test.cjs`、新增/修改JS的`node --check`、`git diff --check`。
- [x] 实操：游戏→打开图冻结→温度题错答反馈→换题正确→光度/半径题→关闭返回→暂停来源开关→刷新原存档；记录结果。
- [x] 设计/视觉专员检查代表视口截图；父会话核对文案没有把练习说成掌握。
- [x] 独立审查数学、恢复状态、旧行为保留和范围；修正重要问题并复验。
- [x] 文档注明人工教学数据与示意路径、自动验证范围及学生试用边界，交付运行和演示路径。

## Plan self-review

- 三项批准目标均有任务与证据；原课程及离线兼容在任务3回归。
- 任务1/2无共享写文件；任务3在依赖交付后接入；最终文档由主会话更新。
- 五类Review Focus由任务1/2/3覆盖；不暴露额外游戏私有状态用于测试。
- 本计划只形成首轮集成交付，不扩大为全课程改版或框架迁移。
