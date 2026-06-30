---
name: parallels-discord-roundtrip
description: 运行 macOS Parallels 冒烟测试，包含 Discord 发送、宿主机验证、宿主机回复以及访客回读的端到端证明。
---

# Parallels Discord 往返测试

当 macOS Parallels 冒烟测试需要端到端证明 Discord 双向消息传递时使用。

## 目标

覆盖以下场景：

- 在全新 macOS 快照上安装
- 入门配置 + 网关健康检查
- 访客 `message send` 发送到 Discord
- 宿主机在 Discord 上看到该消息
- 宿主机发布新的 Discord 消息
- 访客 `message read` 能看到该新消息

## 输入参数

- 宿主机环境变量中的 Discord 机器人令牌
- Discord 服务器 ID
- Discord 频道 ID
- `OPENAI_API_KEY`

## 推荐运行方式

```bash
export OPENCLAW_PARALLELS_DISCORD_TOKEN="$(
  ssh peters-mac-studio-1 'jq -r ".channels.discord.token" ~/.openclaw/openclaw.json' | tr -d '\n'
)"

pnpm test:parallels:macos \
  --discord-token-env OPENCLAW_PARALLELS_DISCORD_TOKEN \
  --discord-guild-id 1456350064065904867 \
  --discord-channel-id 1456744319972282449 \
  --json
```

## 注意事项

- 快照目标：最接近 `macOS 26.3.1 fresh` 的版本。
- 快照解析器现在在基础提示也匹配时，优先匹配 `*-poweroff*` 克隆。这让测试框架可以重用仅磁盘恢复快照，而无需传递更长的提示。
- 如果 Windows/Linux 快照恢复日志显示 `PET_QUESTION_SNAPSHOT_STATE_INCOMPATIBLE_CPU`，先放弃挂起状态，创建一个 `*-poweroff*` 替换快照，然后重新运行。冒烟脚本现在会自动启动还原后的关机快照。
- 测试框架在访客内部配置 Discord；不使用已检入的令牌/配置。
- 访客中使用 `openclaw` 封装器执行 `message send/read`；`node openclaw.mjs message ...` 不以同样的方式暴露惰性消息子命令。
- 使用一个 JSON 对象（`--strict-json`）写入 `channels.discord.guilds`，而不是使用点分 `config set channels.discord.guilds.<snowflake>...` 路径；数字雪花 ID 会被当作数组索引处理。
- 避免在长 Discord 设置脚本中使用 `prlctl enter`/expect；它会换行/损坏长命令。Discord 配置阶段使用 `prlctl exec --current-user /bin/sh -lc ...`。
- 完整 3 操作系统扫描：共享构建锁可以并行安全运行，但快照恢复仍是 Parallels 的瓶颈。如果宿主机已经处于高负载，优先串行化 Windows/Linux 恢复密集型重新运行。
- 测试框架清理时会删除临时 Discord 冒烟消息。
- 成功完成 Discord 往返测试后，在移交前关闭 macOS 访客（`prlctl stop "macOS Tahoe"`）。macOS 冒烟测试框架应在成功的 Discord 证明后自动执行此操作；临时 Discord 检查后仍需手动停止 VM。不要让配置了 Discord 的 VM 保持运行；它可能在证明完成后继续在 `#maintainer` 中读取/发布，导致 Discord 垃圾消息。
- 每阶段日志：`/tmp/openclaw-parallels-smoke.*`
- 机器摘要：传递 `--json`
- 如果往返测试失败，首先检查运行目录中的 `fresh.discord-roundtrip.log` 和 `discord-last-readback.json`。

## 通过标准

- 请求的全新通道或升级通道通过
- 摘要为该通道报告 `discord=pass`
- 访客出站 nonce 出现在频道历史记录中
- 宿主机入站 nonce 出现在 `openclaw message read` 输出中
