# HANDOFF

## 当前目标

基于需求文档完成《机械球球》H5 物理解谜闯关小游戏 MVP，并保持后续迁移抖音小游戏的结构预留。

## 已完成项

- 搭建 Vite + TypeScript + Phaser 3 / Matter.js 项目骨架。
- 实现首页、关卡选择页、游戏主场景、暂停、提示、失败和通关结算流程。
- 实现小球物理运动、终点判定、掉落/超时失败、计时和三星评分。
- 实现 10 个 MVP 关卡配置。
- 实现 5 类机关：按钮、旋转平台、滑动挡板、弹射器、传送带。
- 实现 LocalStorage 存档：解锁进度、最佳时间、最高星级、音效/震动设置。
- 实现 PlatformService 浏览器 Mock，预留广告、分享、震动、登录、启动参数接口。
- 添加基础单元测试、ESLint、TypeScript 严格检查和 README。
- 保存 UI 验证截图：`screenshots/menu.png`、`screenshots/level-select.png`、`screenshots/gameplay.png`。

## 待办

- 逐关实玩调参，重点检查第 6-10 关的通过率、机关手感和球速。
- 增加真实音效、碰撞粒子、通关星级动画和失败反馈细节。
- 补充移动端真机测试，尤其是拖拽旋转平台和滑块的误触情况。
- 接入抖音小游戏真实 SDK，替换 `PlatformService` 的浏览器 Mock。
- 增加埋点上报实现，目前仅通过 `EventTracker` 输出到 console。
- 控制首包体积，必要时把 Phaser 或后续素材拆包/懒加载。

## 关键文件

- `src/main.ts`：游戏入口。
- `src/game/Game.ts`：Phaser 游戏配置，包含 9:16 画布和 Matter.js 参数。
- `src/game/scenes/`：Boot、Menu、LevelSelect、Play 四个核心场景。
- `src/game/levels/index.ts`：10 个 MVP 关卡配置。
- `src/game/mechanisms/`：机关基类与 5 类机关实现。
- `src/game/physics/Ball.ts`：小球物理与视觉同步。
- `src/game/data/SaveManager.ts`：本地存档读写。
- `src/game/platform/PlatformService.ts`：抖音能力预留层。
- `src/game/utils/types.ts`：核心 TypeScript 数据结构。
- `src/game/utils/scoring.ts`：计时、星级和默认存档逻辑。

## 注意事项

- 使用 `pnpm`，不要使用 `npm`。
- 交付前运行 `pnpm lint` 和 `pnpm test`。
- UI 修改需要补充或更新截图。
- 不要编辑 `src/gen` 下的生成文件；当前项目尚未创建该目录。
- 当前远端为 `origin`：`https://github.com/AustinHanIPA/codex_tiktok_minigame.git`。
- 当前开发分支为 `main`，已直接推送首个 MVP 提交到 `origin/main`。
