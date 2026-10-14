# Mahjong Table UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 实现已确认的暖白四川麻将桌，可设置手牌、记录摸打和碰杠、撤销及查看规则。

**Architecture:** React页面消费纯JavaScript牌局状态模块。原始牌面SVG由固定ID映射，所有交互通过一个事件入口校验、更新并保存撤销快照；三个对手仅存暗手张数。

**Tech Stack:** Product Design prototype模板，React 19、Vite 6、Phosphor图标、Node内置测试。

**Spec:** ../specs/2026-10-13-mahjong-table-ui-design.md

## Global Constraints

- 第二种暖白青绿布局；使用已确认的27张原创牌面，不使用用户照片或生成稿错误牌面。
- 七条为三组竖向双竹，八条为八根对称竹节；暗杠只亮一张，其余三张牌背。
- 所有界面中文为人工字符串；只做前端记录，不假装存在AI推荐或完整计分。
- 每种牌最多4张；副露移走的来源弃牌不重复计数；撤销恢复全部牌局状态。
- 1440×1024桌面及窄屏均能访问核心控制；实际浏览器验收后交付。
- 用户“OK，实现牌桌”作为确认规格并继续实现的指令，按本计划在当前会话直接执行。

## Review Focus

- 第五张已知牌、空牌或无效牌ID必须拒绝且不改变状态。
- 对手普通摸打记录不得永久减少暗手；碰杠后更新数量。
- 碰直杠接走弃牌后只计入副露一次；补杠只升级已有碰。
- 无牌可打、未初始化或14张再次摸牌，应给出可理解的错误。
- 设置手牌与撤销不能遗留旧副露、旧新摸牌标记或错误事件历史。

## Files and Interfaces

- `ui/src/game/state.js`: `createGame`, `initializeGame`, `applyEvent`, `undo`, `knownCounts`, `createDemoGame`, `concealedCount`。
- `ui/src/game/state.test.js`: 在真实状态上验证事件、牌数、来源转移、失败不变、撤销及初始化。
- `ui/src/components/Tile.jsx`: 所有区域共用的牌面组件；未知牌只显示牌背。
- `ui/src/components/Table.jsx`: 四家暗手、弃牌、副露、自家手牌与新摸牌。
- `ui/src/components/EventEntry.jsx`: 玩家、事件、来源、27牌选择、预览与提交。
- `ui/src/components/HandSetup.jsx`: 设置起始牌、庄家和各家定缺。
- `ui/src/App.jsx`, `ui/src/styles.css`: 状态连接、规则抽屉、记录及响应式视觉。
- `ui/public/tiles/`: 27张已确认SVG与牌背；`rules.md`为当前规则文件快照。
- `ui/design-qa.md`, `ui/qa/`: 浏览器操作和视觉比较证据。

### Task 1: 可校验的牌局状态

**Interfaces:** 初始化需13或14张牌；事件为`{player,type,tile,source?}`；成功返回新状态，失败抛中文错误；`history`保存快照。

- [x] 用官方bootstrap创建独立`ui`目录并安装依赖；保留模板Worker与构建脚本。
- [x] 先写失败测试：摸牌新增、出牌移除、第五张拒绝、来源转移、补杠、暗杠、对手张数、撤销、非法输入和重置。
- [x] 执行`node --test src/game/state.test.js`确认功能尚未实现。
- [x] 实现纯状态模块，测试通过后记录结果。

### Task 2: 牌桌与录入体验

**Interfaces:** 消费Task 1状态；调用`applyEvent`提交，失败保留原状态并显示错误。

- [x] 按选定稿组织页面，引用原创素材，展示暗手与副露。
- [x] 接通摸打、碰杠、初始化、撤销、定缺与规则阅读；支持键盘焦点和窄屏滚动。
- [x] 在浏览器完成“设置→摸牌→出牌→他家出牌→碰杠→撤销”真实流程。
- [x] 对照1440×1024原稿检查字体、布局、颜色、牌面与文案；调整差异。

### Task 3: 验证与交付

- [x] 运行状态完整测试、生产构建与模板Worker测试。
- [x] 使用独立代码审阅检查Review Focus；修复影响使用的问题。
- [x] 保存同视口截图及视觉对比，写入`design-qa.md`；不得把构建成功当作浏览器验收。
- [x] 更新README启动与当前能力说明，保持预览服务运行并交付本地链接。

## Environment Decisions

当前目录不是Git仓库，本次在隔离的`ui`子目录实现；不新增Git仓库，不使用依赖Git的提交或worktree辅助脚本。执行记录保留为同目录进度文档。

