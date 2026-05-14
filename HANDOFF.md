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

## 待办

- 逐关实玩调参，重点检查第 6-10 关的通过率、目标步数和连锁爽感。
- 增加真实音效、合成粒子、通关星级动画和失败反馈细节。
- 补充移动端真机测试，尤其是左右滑动、下滑快速落下和按钮误触情况。
- 接入抖音小游戏真实 SDK，替换 `PlatformService` 的浏览器 Mock。
- 增加埋点上报实现，目前仅通过 `EventTracker` 输出到 console。
- 控制首包体积，必要时把 Phaser 或后续素材拆包/懒加载。

## 关键文件

- `src/main.ts`：游戏入口。
- `src/game/Game.ts`：Phaser 游戏配置，包含 9:16 画布。
- `src/game/scenes/`：Boot、Menu、LevelSelect、Play 四个核心场景。
- `src/game/scenes/EndlessScene.ts`：无尽模式随机队列、分数和最高分结算。
- `src/game/levels/index.ts`：10 个 MVP 关卡配置。
- `src/game/logic/gridLogic.ts`：棋盘重力、合成组查找、连锁结算等核心规则。
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
