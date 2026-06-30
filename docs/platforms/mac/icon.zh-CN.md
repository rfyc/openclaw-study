---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态和动画"
read_when:
  - 更改菜单栏图标行为
title: "菜单栏图标"
---

# 菜单栏图标状态

作者：steipete · 更新：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **空闲：** 正常图标动画（闪烁，偶尔晃动）。
- **暂停：** 状态项使用 `appearsDisabled`；无动作。
- **语音触发（大耳朵）：** 语音唤醒检测器在听到唤醒词时调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获语音期间保持 `earBoostActive=true`。耳朵缩放（1.9x），获得圆形耳孔以提高可读性，然后在 1 秒静默后通过 `stopVoiceEars()` 下降。仅从应用内语音管道触发。
- **工作中（智能体运行）：** `AppState.isWorking=true` 驱动"尾巴/腿部奔跑"微动作：在工作进行时更快的腿部晃动和轻微偏移。目前围绕 WebChat 智能体运行切换；当连接其他长任务时，在它们周围添加相同的切换。

接线点

- 语音唤醒：运行时/测试器在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，在 1 秒静默后调用 `stopVoiceEars()` 以匹配捕获窗口。
- 智能体活动：在工作跨度周围设置 `AppStateStore.shared.setWorking(true/false)`（已在 WebChat 智能体调用中完成）。保持跨度短并在 `defer` 块中重置以避免动画卡住。

形状和尺寸

- 基础图标在 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 中绘制。
- 耳朵缩放默认为 `1.0`；语音增强设置 `earScale=1.9` 并切换 `earHoles=true`，不改变整体框架（18×18 pt 模板图像渲染到 36×36 px Retina 后备存储）。
- 奔跑使用腿部晃动最大约 1.0 和小的水平抖动；它是对任何现有空闲晃动的叠加。

行为说明

- 没有外部 CLI/broker 切换耳朵/工作状态；保持其内部于应用自身信号以避免意外抖动。
- 保持 TTL 短（&lt;10s），以便图标在任务挂起时快速返回基准。

## 相关

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
