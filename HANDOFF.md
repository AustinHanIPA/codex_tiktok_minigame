# HANDOFF

## 当前目标

基于新方案完成《方块合合合》H5 数字合成闯关小游戏 MVP，并保持后续迁移抖音小游戏的结构预留。

## 已完成项

- 搭建 Vite + TypeScript + Phaser 3 项目骨架。
- 删除旧机械球球 Matter.js 物理与机关逻辑，迁移为纯 2D 棋盘数据驱动玩法。
- 实现首页、关卡选择页、游戏主场景、暂停、失败和通关结算流程。
- 实现 5x8 棋盘、2048 经典暖色阶梯配色、64/128/256 高级方块 Glow。
- 实现下落方块、左右移动、快速落下、重力坍塌、递归连锁合成。
- 实现 10 个残局挑战关卡配置。
- 重排残局为多米诺式设计：第一手正确下落即可触发 3+ 连续合并并达成目标。
- 新增无尽模式：随机方块队列、合成得分、最高分/最大方块存档、堵顶结算。
- 新增通关炫耀战绩文案、失败看视频加 3 步复活、锤子道具激励广告 Mock。
- 实现 LocalStorage 存档：解锁进度、最少步数、最高星级、无尽最高分、音效/震动设置。
- 实现 PlatformService 浏览器 Mock，预留广告、分享、震动、登录、启动参数接口。
- 添加网格逻辑与关卡基础单元测试、ESLint、TypeScript 严格检查和 README。
- 保存 UI 验证截图：`screenshots/menu.png`、`screenshots/level-select.png`、`screenshots/gameplay.png`、`screenshots/endless.png`、`screenshots/result.png`。
- 新增合成粒子特效系统（`src/game/effects/ParticleEffects.ts`）：方块合并时彩色粒子爆炸、合成数值飘出动画、连锁 combo 棋盘缩放脉冲。粒子系统带全局活跃计数上限（80），防止低端机掉帧。
- 新增通关星级动画：星星逐个弹出（Back.Out 缓动 + 闪烁反馈）。
- 新增失败反馈：红色闪烁覆盖层 + 增强摄像头抖动。
- 重构 EventTracker 为队列批量上报架构：默认仅 console 输出（MVP），通过 `VITE_ENABLE_REPORT=true` 环境变量开启网络上报；重试策略与 console 日志独立配置。
- 优化第 6-10 关难度参数：增加容错步数、指定 nextBlocks 队列、调整初始棋盘布局。
- 补充 6-10 关 scripted solution 单元测试（验证多米诺骨牌效应核心体验）。
- 修复 `pointerToCell` 间隙误触：点击 CELL_GAP 区域时返回 null，防止锤子误敲。
- 修复 combo 冲击效果：从缩放 main camera 改为仅脉冲 tilesLayer 容器，避免 HUD/弹窗跟着缩放。
- 新增 `SoundService` WebAudio 占位音效：按钮点击、移动、落地、合成、通关、失败、锤子和奖励反馈都会尊重音效开关。
- 振动设置已接入 `PlatformService.vibrateShort()`，关闭震动后不会触发浏览器振动 API。
- 抽出 `blockQueue` 纯函数并补充确定性测试，关卡预览和实际生成都会在预设方块用完后自动补块。
- 优化移动端基础体验：禁用页面回弹、文本选择和点击高亮，降低滑动操作时的浏览器干扰。
- Vite 构建已将 Phaser 拆到独立 `phaser` vendor chunk，业务代码 chunk 显著变小，便于后续缓存优化。

## 待办

- 将当前 WebAudio 占位音效替换为真实音频素材，并在 BootScene 预加载资源。
- 补充移动端真机测试，尤其是左右滑动、下滑快速落下、音效解锁和按钮误触情况。
- 接入抖音小游戏真实 SDK，替换 `PlatformService` 的浏览器 Mock。
- 上线前设置 `VITE_ENABLE_REPORT=true` 并确认后端 `/api/events` 接口就绪。
- 继续控制首包体积；Phaser 已拆出 vendor chunk，但整体 gzip 仍约 330KB，后续可评估更轻引擎或按场景懒加载。
- 后续考虑粒子改为对象池或 Phaser 粒子发射器以进一步优化性能。

## 关键文件

- `src/main.ts`：游戏入口。
- `src/game/Game.ts`：Phaser 游戏配置，包含 9:16 画布。
- `src/game/scenes/`：Boot、Menu、LevelSelect、Play、Endless 五个核心场景。
- `src/game/audio/SoundService.ts`：WebAudio 占位音效与音效开关判断。
- `src/game/effects/ParticleEffects.ts`：合成粒子、星级动画、失败闪烁、combo 脉冲特效。
- `src/game/levels/index.ts`：10 个 MVP 关卡配置。
- `src/game/logic/blockQueue.ts`：预设方块用完后的补队列纯函数。
- `src/game/logic/gridLogic.ts`：棋盘重力、合成组查找、连锁结算等核心规则。
- `src/game/data/EventTracker.ts`：埋点上报（默认 console mock，环境变量开启网络上报）。
- `src/game/data/SaveManager.ts`：本地存档读写。
- `src/game/platform/PlatformService.ts`：抖音能力预留层。
- `src/game/utils/types.ts`：核心 TypeScript 数据结构。
- `src/game/utils/scoring.ts`：步数星级、击败百分比和默认存档逻辑。

## 注意事项

- 使用 `pnpm`，不要使用 `npm`。
- 交付前运行 `pnpm lint` 和 `pnpm test`。
- UI 修改需要补充或更新截图。
- 不要编辑 `src/gen` 下的生成文件；当前项目尚未创建该目录。
- 当前远端为 `origin`：`https://github.com/AustinHanIPA/codex_tiktok_minigame.git`。
- 当前开发分支为 `main`，已直接推送首个 MVP 提交到 `origin/main`。
- 埋点上报默认关闭网络请求，上线前需设置环境变量 `VITE_ENABLE_REPORT=true`。
