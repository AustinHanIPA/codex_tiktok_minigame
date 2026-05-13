# 机械球球

竖屏 H5 物理解谜闯关小游戏 MVP。玩家通过点击、拖拽、旋转机关，引导小球穿过机械装置到达终点，并按通关时间获得 1-3 星评价。

## 技术栈

- Vite
- TypeScript
- Phaser 3 / Matter.js
- LocalStorage 本地存档

## 运行

```bash
pnpm install
pnpm dev
```

## 验证

```bash
pnpm lint
pnpm test
```

## MVP 内容

- 首页、关卡选择、游戏主界面、通关/失败弹窗
- 10 个短关卡
- 按钮、旋转平台、滑动挡板、弹射器、传送带 5 类机关
- 计时、三星评价、本地进度存档
- 抖音小游戏平台能力 Mock：广告、分享、震动、登录入口
