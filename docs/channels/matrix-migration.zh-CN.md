---
summary: "OpenClaw 如何就地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - 升级现有 Matrix 安装
  - 迁移加密的 Matrix 历史和设备状态
title: "Matrix 迁移"
---

从之前的公开 `matrix` 插件升级到当前实现。

对于大多数用户，升级是就地进行的：

- 插件保持 `@openclaw/matrix`
- 频道保持 `matrix`
- 您的配置保持在 `channels.matrix` 下
- 缓存的凭据保持在 `~/.openclaw/credentials/matrix/` 下
- 运行时状态保持在 `~/.openclaw/matrix/` 下

您无需重命名配置键或以新名称重新安装插件。

## 迁移自动执行的操作

当网关启动时，以及当您运行 [`openclaw doctor --fix`](/gateway/doctor) 时，OpenClaw 会尝试自动修复旧的 Matrix 状态。
在任何可执行的 Matrix 迁移步骤改变磁盘状态之前，OpenClaw 会创建或重用一个专注的恢复快照。

当您使用 `openclaw update` 时，确切的触发器取决于 OpenClaw 的安装方式：

- 源代码安装在更新流程中运行 `openclaw doctor --fix`，然后默认重启网关
- 包管理器安装更新包，运行非交互式 doctor 传递，然后依靠默认的网关重启，以便启动可以完成 Matrix 迁移
- 如果您使用 `openclaw update --no-restart`，基于启动的 Matrix 迁移将延迟，直到您稍后运行 `openclaw doctor --fix` 并重启网关

自动迁移涵盖：

- 在 `~/Backups/openclaw-migrations/` 下创建或重用迁移前快照
- 重用您缓存的 Matrix 凭据
- 保持相同的账户选择和 `channels.matrix` 配置
- 将最旧的平面 Matrix 同步存储移到当前账户范围的位置
- 当目标账户可以安全解析时，将最旧的平面 Matrix 加密存储移到当前账户范围的位置
- 当本地存在该密钥时，从旧的 rust 加密存储中提取之前保存的 Matrix 房间密钥备份解密密钥
- 当访问令牌稍后更改时，为同一 Matrix 账户、主服务器和用户重用最完整的现有令牌哈希存储根
- 当 Matrix 访问令牌更改但账户/设备身份保持不变时，扫描同级令牌哈希存储根以获取待处理的加密状态恢复元数据
- 在下一次 Matrix 启动时自动将备份的房间密钥恢复到新的加密存储中

快照详情：

- OpenClaw 在成功快照后在 `~/.openclaw/matrix/migration-snapshot.json` 写入标记文件，以便后续启动和修复传递可以重用同一存档。
- 这些自动 Matrix 迁移快照仅备份配置 + 状态（`includeWorkspace: false`）。
- 如果 Matrix 只有仅警告的迁移状态，例如因为 `userId` 或 `accessToken` 仍然缺失，OpenClaw 尚不创建快照，因为没有 Matrix 变更是可执行的。
- 如果快照步骤失败，OpenClaw 跳过该运行的 Matrix 迁移，而不是在没有恢复点的情况下改变状态。

关于多账户升级：

- 最旧的平面 Matrix 存储（`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`）来自单存储布局，因此 OpenClaw 只能将其迁移到一个已解析的 Matrix 账户目标
- 已经账户范围的旧版 Matrix 存储按配置的 Matrix 账户检测和准备

## 迁移无法自动执行的操作

之前的公开 Matrix 插件**不会**自动创建 Matrix 房间密钥备份。它持久化本地加密状态并请求设备验证，但不保证您的房间密钥备份到主服务器。

这意味着某些加密安装只能部分迁移。

OpenClaw 无法自动恢复：

- 从未备份的仅本地房间密钥
- 当目标 Matrix 账户无法解析时的加密状态，因为 `homeserver`、`userId` 或 `accessToken` 仍不可用
- 当配置了多个 Matrix 账户但未设置 `channels.matrix.defaultAccount` 时，一个共享平面 Matrix 存储的自动迁移
- 固定到仓库路径而不是标准 Matrix 包的自定义插件路径安装
- 当旧存储有备份密钥但未在本地保留解密密钥时的缺失恢复密钥

当前警告范围：

- 网关启动和 `openclaw doctor` 都会显示自定义 Matrix 插件路径安装

如果您的旧安装有从未备份的仅本地加密历史，升级后某些旧的加密消息可能仍然无法读取。

## 推荐升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
   优先使用不带 `--no-restart` 的普通 `openclaw update`，以便启动可以立即完成 Matrix 迁移。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可执行的迁移工作，doctor 将首先创建或重用迁移前快照并打印存档路径。

3. 启动或重启网关。
4. 检查当前验证和备份状态：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 将您正在修复的 Matrix 账户的恢复密钥放在账户特定的环境变量中。对于单个默认账户，`MATRIX_RECOVERY_KEY` 就可以了。对于多个账户，每个账户使用一个变量，例如 `MATRIX_RECOVERY_KEY_ASSISTANT`，并在命令中添加 `--account assistant`。

6. 如果 OpenClaw 告诉您需要恢复密钥，请为匹配的账户运行命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. 如果此设备仍未验证，请为匹配的账户运行命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   如果恢复密钥被接受且备份可用，但 `Cross-signing verified` 仍然是 `no`，请从另一个 Matrix 客户端完成自我验证：

   ```bash
   openclaw matrix verify self
   ```

   在另一个 Matrix 客户端接受请求，比较表情符号或十进制数，仅当它们匹配时才输入 `yes`。命令仅在 `Cross-signing verified` 变为 `yes` 后才成功退出。

8. 如果您有意放弃无法恢复的旧历史，并希望为未来消息建立一个新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

9. 如果还没有服务器端密钥备份，请为未来的恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密迁移的工作原理

加密迁移是一个两阶段过程：

1. 启动或 `openclaw doctor --fix` 如果加密迁移可执行，则创建或重用迁移前快照。
2. 启动或 `openclaw doctor --fix` 通过活动的 Matrix 插件安装检查旧的 Matrix 加密存储。
3. 如果找到备份解密密钥，OpenClaw 将其写入新的恢复密钥流程并标记房间密钥恢复为待处理。
4. 在下一次 Matrix 启动时，OpenClaw 自动将备份的房间密钥恢复到新的加密存储中。

如果旧存储报告从未备份的房间密钥，OpenClaw 会发出警告，而不是假装恢复成功。

## 常见消息及其含义

### 升级和检测消息

`Matrix plugin upgraded in place.`

- 含义：检测到旧的磁盘上 Matrix 状态并将其迁移到当前布局。
- 该做什么：除非同一输出还包含警告，否则什么都不做。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含义：OpenClaw 在改变 Matrix 状态之前创建了恢复存档。
- 该做什么：在确认迁移成功之前保留打印的存档路径。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含义：OpenClaw 找到现有的 Matrix 迁移快照标记，并重用了该存档而不是创建重复备份。
- 该做什么：在确认迁移成功之前保留打印的存档路径。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含义：旧的 Matrix 状态存在，但 OpenClaw 无法将其映射到当前 Matrix 账户，因为 Matrix 尚未配置。
- 该做什么：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：OpenClaw 找到旧状态，但仍无法确定确切的当前账户/设备根目录。
- 该做什么：使用有效的 Matrix 登录启动网关一次，或在缓存的凭据存在后重新运行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 找到一个共享的平面 Matrix 存储，但它拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 该做什么：将 `channels.matrix.defaultAccount` 设置为目标账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含义：新的账户范围位置已有同步或加密存储，因此 OpenClaw 不会自动覆盖它。
- 该做什么：在手动删除或移动冲突目标之前，验证当前账户是否正确。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 含义：OpenClaw 尝试移动旧的 Matrix 状态，但文件系统操作失败。
- 该做什么：检查文件系统权限和磁盘状态，然后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 含义：OpenClaw 找到旧的加密 Matrix 存储，但没有当前的 Matrix 配置可以附加到它。
- 该做什么：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：加密存储存在，但 OpenClaw 无法安全决定它属于哪个当前账户/设备。
- 该做什么：使用有效的 Matrix 登录启动网关一次，或在缓存的凭据可用后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 找到一个共享的平面旧版加密存储，但它拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 该做什么：将 `channels.matrix.defaultAccount` 设置为目标账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含义：OpenClaw 检测到旧的 Matrix 状态，但迁移仍然受阻于缺失的身份或凭据数据。
- 该做什么：完成 Matrix 登录或配置设置，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含义：OpenClaw 找到旧的加密 Matrix 状态，但它无法从通常检查该存储的 Matrix 插件加载辅助入口点。
- 该做什么：重新安装或修复 Matrix 插件（`openclaw plugins install @openclaw/matrix`，或对于仓库检出 `openclaw plugins install ./path/to/local/matrix-plugin`），然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含义：OpenClaw 找到一个逃逸插件根目录或未通过插件边界检查的辅助文件路径，因此拒绝导入它。
- 该做什么：从受信任路径重新安装 Matrix 插件，然后重新运行 `openclaw doctor --fix` 或重启网关。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含义：OpenClaw 拒绝改变 Matrix 状态，因为它无法先创建恢复快照。
- 该做什么：解决备份错误，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端端回退找到旧的平面存储，但移动失败。OpenClaw 现在中止该回退，而不是静默地以新存储启动。
- 该做什么：检查文件系统权限或冲突，保持旧状态完整，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 固定到路径安装，因此主线更新不会自动将其替换为仓库的标准 Matrix 包。
- 该做什么：当您想返回默认 Matrix 插件时，使用 `openclaw plugins install @openclaw/matrix` 重新安装。

### 加密状态恢复消息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含义：备份的房间密钥已成功恢复到新的加密存储中。
- 该做什么：通常什么都不做。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含义：一些旧的房间密钥只存在于旧的本地存储中，从未上传到 Matrix 备份。
- 该做什么：除非您可以从另一个已验证的客户端手动恢复这些密钥，否则预计一些旧的加密历史将无法访问。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key-stdin" after upgrade if they have the recovery key.`

- 含义：备份存在，但 OpenClaw 无法自动恢复恢复密钥。
- 该做什么：运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含义：OpenClaw 找到旧的加密存储，但无法安全检查它以准备恢复。
- 该做什么：重新运行 `openclaw doctor --fix`。如果重复出现，保持旧的状态目录完整，并使用另一个已验证的 Matrix 客户端加上 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 进行恢复。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含义：OpenClaw 检测到备份密钥冲突，拒绝自动覆盖当前恢复密钥文件。
- 该做什么：在重试任何恢复命令之前验证哪个恢复密钥是正确的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含义：这是旧存储格式的硬限制。
- 该做什么：备份的密钥仍然可以恢复，但仅本地的加密历史可能仍然无法访问。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含义：新插件尝试恢复但 Matrix 返回错误。
- 该做什么：运行 `openclaw matrix verify backup status`，然后如果需要，使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 重试。

### 手动恢复消息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含义：OpenClaw 知道您应该有备份密钥，但它在此设备上不活跃。
- 该做什么：运行 `openclaw matrix verify backup restore`，或设置 `MATRIX_RECOVERY_KEY` 并根据需要运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

`Store a recovery key with 'openclaw matrix verify device --recovery-key-stdin', then run 'openclaw matrix verify backup restore'.`

- 含义：此设备当前没有存储恢复密钥。
- 该做什么：设置 `MATRIX_RECOVERY_KEY`，运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`，然后恢复备份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin' with the matching recovery key.`

- 含义：存储的密钥与活动的 Matrix 备份不匹配。
- 该做什么：将 `MATRIX_RECOVERY_KEY` 设置为正确的密钥，并运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

如果您接受丢失无法恢复的旧加密历史，您可以使用 `openclaw matrix verify backup reset --yes` 重置当前备份基线。当存储的备份密钥损坏时，该重置也可能重新创建密钥存储，以便新备份密钥在重启后可以正确加载。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin'.`

- 含义：备份存在，但此设备尚未足够强烈地信任交叉签名链。
- 该做什么：设置 `MATRIX_RECOVERY_KEY` 并运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Matrix recovery key is required`

- 含义：您在需要恢复密钥时尝试了恢复步骤而没有提供恢复密钥。
- 该做什么：使用 `--recovery-key-stdin` 重新运行命令，例如 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Invalid Matrix recovery key: ...`

- 含义：提供的密钥无法解析或与预期格式不匹配。
- 该做什么：使用来自 Matrix 客户端或恢复密钥文件的精确恢复密钥重试。

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- 含义：OpenClaw 可以应用恢复密钥，但 Matrix 仍未为此设备建立完整的交叉签名身份信任。检查命令输出中的 `Recovery key accepted`、`Backup usable`、`Cross-signing verified` 和 `Device verified by owner`。
- 该做什么：运行 `openclaw matrix verify self`，在另一个 Matrix 客户端接受请求，比较 SAS，仅当它们匹配时才输入 `yes`。该命令在报告成功之前等待完整的 Matrix 身份信任。仅在您有意想要替换当前交叉签名身份时才使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing`。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含义：密钥存储未在此设备上产生活跃的备份会话。
- 该做什么：首先验证设备，然后使用 `openclaw matrix verify backup status` 重新检查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device --recovery-key-stdin' first.`

- 含义：此设备在设备验证完成之前无法从密钥存储恢复。
- 该做什么：首先运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

### 自定义插件安装消息

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：您的插件安装记录指向一个已不存在的本地路径。
- 该做什么：使用 `openclaw plugins install @openclaw/matrix` 重新安装，或者如果您从仓库检出运行，`openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密历史仍然没有回来

按顺序运行这些检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

如果备份恢复成功但一些旧房间仍然缺少历史，这些缺失的密钥可能从未被之前的插件备份。

## 如果您想为未来的消息重新开始

如果您接受丢失无法恢复的旧加密历史，只想要一个干净的备份基线以供未来使用，请按顺序运行这些命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之后设备仍未验证，请从您的 Matrix 客户端通过比较 SAS 表情符号或十进制代码并确认它们匹配来完成验证。

## 相关文档

- [Matrix](/channels/matrix)：频道设置和配置。
- [Matrix 推送规则](/channels/matrix-push-rules)：通知路由。
- [Doctor](/gateway/doctor)：健康检查和自动迁移触发器。
- [迁移指南](/install/migrating)：所有迁移路径（机器迁移、跨系统导入）。
- [插件](/tools/plugin)：插件安装和注册。
