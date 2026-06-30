---
summary: "唤醒词和一键通话重叠时的语音叠加层生命周期"
read_when:
  - 调整语音叠加层行为
title: "语音叠加层"
---

# 语音叠加层生命周期（macOS）

受众：macOS 应用贡献者。目标：在唤醒词和一键通话重叠时保持语音叠加层可预测。

## 当前意图

- 如果叠加层已经从唤醒词可见，用户按下快捷键，快捷键会话*采用*现有文本而不是重置它。叠加层在按住快捷键时保持显示。用户释放时：如果有修剪后的文本则发送，否则关闭。
- 单独的唤醒词仍然在静默时自动发送；一键通话在释放时立即发送。

## 已实现（2025 年 12 月 9 日）

- 叠加层会话现在每次捕获（唤醒词或一键通话）携带一个令牌。当令牌不匹配时，部分/最终/发送/关闭/级别更新被丢弃，避免过期回调。
- 一键通话将任何可见的叠加层文本作为前缀采用（因此在唤醒叠加层显示时按快捷键会保留文本并追加新语音）。在回退到当前文本之前，它最多等待 1.5 秒等待最终转录。
- 在 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime` 类别下以 `info` 级别发出铃声/叠加层日志（会话开始、部分、最终、发送、关闭、铃声原因）。

## 后续步骤

1. **VoiceSessionCoordinator（actor）**
   - 一次拥有一个 `VoiceSession`。
   - API（基于令牌）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带过期令牌的回调（防止旧识别器重新打开叠加层）。
2. **VoiceSession（模型）**
   - 字段：`token`、`source`（wakeWord|pushToTalk）、提交/易变文本、铃声标志、计时器（自动发送、空闲）、`overlayMode`（display|editing|sending）、冷却截止时间。
3. **叠加层绑定**
   - `VoiceSessionPublisher`（`ObservableObject`）将活跃会话镜像到 SwiftUI。
   - `VoiceWakeOverlayView` 仅通过发布者渲染；它从不直接修改全局单例。
   - 叠加层用户操作（`sendNow`、`dismiss`、`edit`）使用会话令牌回调到协调器。
4. **统一发送路径**
   - 在 `endCapture` 时：如果修剪后文本为空 → 关闭；否则 `performSend(session:)`（播放一次发送铃声、转发、关闭）。
   - 一键通话：无延迟；唤醒词：可选的自动发送延迟。
   - 一键通话完成后对唤醒运行时应用短暂冷却，以防止唤醒词立即重新触发。
5. **日志**
   - 协调器在子系统 `ai.openclaw`、类别 `voicewake.overlay` 和 `voicewake.chime` 中发出 `.info` 日志。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 调试清单

- 重现粘性叠加层时流式传输日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 验证只有一个活跃的会话令牌；协调器应该丢弃过期的回调。
- 确保一键通话释放始终使用活跃令牌调用 `endCapture`；如果文本为空，期望 `dismiss` 而不是铃声或发送。

## 迁移步骤（建议）

1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime` 以创建/更新/结束会话，而不是直接触碰 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk` 以采用现有会话并在释放时调用 `endCapture`；应用运行时冷却。
4. 将 `VoiceWakeOverlayController` 连接到发布者；删除来自 runtime/PTT 的直接调用。
5. 为会话采用、冷却和空文本关闭添加集成测试。

## 相关

- [macOS 应用](/platforms/macos)
- [语音唤醒（macOS）](/platforms/mac/voicewake)
- [Talk 模式](/nodes/talk)
