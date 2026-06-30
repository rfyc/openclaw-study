# 更新日志

## 2026.5.4

### 变更

- 与核心 OpenClaw 版本号对齐。

## 2026.5.3

### 变更

- 与核心 OpenClaw 版本号对齐。

## 2026.5.2

### 变更

- 与核心 OpenClaw 版本号对齐。

## 未发布

### 变更

- Matrix/E2EE：添加 `openclaw matrix encryption setup` 命令，从一个设置流程中启用 Matrix 加密、引导恢复并打印验证状态。感谢 @gumadeiras。

### 修复

- Matrix/E2EE：关闭通过 CLI 实现 SAS 时所有者端设备验证循环。`verify confirm-sas` 现在（1）等待 rust-crypto 验证器 promise，以便 done-exchange 和 `crossSignDevice` 触发的任何交叉签名上传在该命令返回之前完成，（2）在自动确认的入站 SAS 路径上交叉签名 bot 设备（之前跳过），（3）从独立的 `confirmMatrixVerificationSas` 操作中调用 `trustOwnIdentityAfterSelfVerification`，以便操作员的 Element X 清除"验证"提示，而无需等待被动同步周期 [AI 辅助]。感谢 @nklock。
- Matrix/E2EE：稳定恢复和损坏设备 QA 流程，同时避免可能在关机时留下运行加密工作的设备清理同步竞争。感谢 @gumadeiras。

## 2026.4.25

### 变更

- 与核心 OpenClaw 版本号对齐。

## 2026.4.20

### 变更

- 与核心 OpenClaw 版本号对齐。

## 2026.4.19-beta.1

### 变更

- 与核心 OpenClaw 版本号对齐。

此文件跟踪自 `matrix-js-sdk` 迁移以来本地 `@openclaw/matrix` 插件的 Matrix 相关发布说明。源发布说明位于 `../../changelog.md`；同一版本内的精确重复条目在此处折叠。

## 2026.4.15-beta.2

### 修复

- Matrix/配对：阻止 DM 配对存储条目授权房间控制命令 [AI 辅助]。(#67294) 感谢 @pgondhi987。
- Docker/构建：使用 `find` 在 `node_modules` 下验证 `@matrix-org/matrix-sdk-crypto-nodejs` 本地绑定，而不是硬编码的 `.pnpm/...` 路径，以便 pnpm v10+ 虚拟存储布局不再导致镜像构建失败。(#67143) 感谢 @ly85206559。
- Matrix/E2EE：对于无密码令牌认证的 bot，保持启动引导保守，仍尝试受保护的修复传递，无需 `channels.matrix.password`，并记录剩余的 password-UIA 限制。(#66228) 感谢 @SARAMALI15792。
- Matrix/命令：由于房间控制命令授权现已忽略配对存储条目，跳过房间流量上的 DM 配对存储读取，在不更改房间认证行为的情况下保持房间路径更窄。(#67325) 感谢 @gumadeiras。

## 2026.4.15-beta.1

### 变更

- QA/Matrix：将 Matrix 实时 QA 拆分为源链接的 `qa-matrix` 运行器，并将仓库私有 `qa-*` 表面保留在打包和已发布构建之外。(#66723) 感谢 @gumadeiras。

### 修复

- Matrix/安全：规范化沙盒配置文件头像参数，保留 `mxc://` 头像 URL，并在重新加载期间暴露 gmail 监视器停止失败。(#64701) 感谢 @slepybear。
- Docker/构建：使用 `find` 在 `node_modules` 下验证 `@matrix-org/matrix-sdk-crypto-nodejs` 本地绑定，而不是硬编码的 `.pnpm/...` 路径，以便 pnpm v10+ 虚拟存储布局不再导致镜像构建失败。(#67143) 感谢 @ly85206559。
- Matrix/E2EE：对于无密码令牌认证的 bot，保持启动引导保守，仍尝试受保护的修复传递，无需 `channels.matrix.password`，并记录剩余的 password-UIA 限制。(#66228) 感谢 @SARAMALI15792。
- Matrix/命令：由于房间控制命令授权现已忽略配对存储条目，跳过房间流量上的 DM 配对存储读取，在不更改房间认证行为的情况下保持房间路径更窄。(#67325) 感谢 @gumadeiras。
- Matrix/安全：阻止 DM 配对存储条目授权房间控制命令。(#67294) 感谢 @pgondhi987。

## 2026.4.12

### 变更

- Matrix/部分流式传输：向草稿预览发送和编辑添加 MSC4357 实时标记，以便支持的 Matrix 客户端可以渲染实时/打字机动画，并在最终编辑到达时停止它。(#63513) 感谢 @TigerInYourDream。

### 修复

- Matrix/提及：在接受可见 `@displayName` Matrix URI 标签的同时保持房间提及门控严格，以便 `requireMention` 再次为非 OpenClaw Matrix 客户端工作。(#64796) 感谢 @hclsys。
- 频道/重放去重：标准化 Telegram、Discord、Slack、Mattermost、WhatsApp、Matrix、LINE、飞书、Zalo、Nextcloud Talk、TLON、Nostr、Voice Call 和共享插件交互回调的重放声明、可重试失败释放和成功后提交行为，以便重复传递在成功后保持仅回复一次，但在传递前失败后干净地重试。感谢 @vincentkoc。

## 2026.4.10

### 变更

- QA/Matrix：添加由一次性 Matrix 家庭服务器支持的实时 `openclaw qa matrix` 通道，共享实时传输接缝，以及针对线程、反应、重启和允许列表行为的 Matrix 特定传输覆盖。(#64489) 感谢 @gumadeiras。
- Matrix/部分流式传输：向草稿预览发送和编辑添加 MSC4357 实时标记，以便支持的 Matrix 客户端可以渲染实时/打字机动画，并在最终编辑到达时停止它。(#63513) 感谢 @TigerInYourDream。

### 修复

- 网关/线程路由：保留 Slack、Telegram、Mattermost、Matrix、ACP、重启哨兵和代理通知传递目标，以便子代理、cron、流中继、会话回退和重启消息返回到原始线程、主题或房间大小写中。(#54840, #57056, #63143, #63228, #63506, #64343, #64391)
- Matrix：保持多账户房间范围一致，在适当时保持打包的加密迁移仅警告，保留有序块流式传输，添加显式 Matrix 块流式传输选择加入，并从打包的运行时入口解析验证/引导。(#58449, #59249, #59266, #64373) 感谢 @gumadeiras。
- Matrix/迁移：防止仅警告的打包加密迁移在只存在辅助块时被误分类为可操作，以便启动和 doctor 保持在仅警告路径上，而不是创建不必要的迁移快照。(#64373) 感谢 @gumadeiras。
- Matrix/ACP 线程绑定：在 ACP 会话生成期间保留规范房间大小写和父对话路由，以便混合大小写房间 ID 从顶级房间和现有 Matrix 线程正确绑定。(#64343) 感谢 @gumadeiras。

## 2026.4.9

### 修复

- Matrix/网关：在将启动标记为成功之前等待 Matrix 同步就绪，保持 Matrix 后台处理程序失败的隔离性，并通过频道级重启处理路由致命 Matrix 同步停止，而不是崩溃整个网关。(#62779) 感谢 @gumadeiras。
- Matrix/doctor：在 `openclaw doctor --fix` 期间将旧版 `channels.matrix.dm.policy: "trusted"` 配置迁移回兼容的 DM 策略，将显式 `allowFrom` 边界保留为 `allowlist`，并将空旧版配置默认为 `pairing`。(#62942) 感谢 @lukeboyett。

## 2026.4.8

### 修复

- 打包频道/设置：通过 BlueBubbles、飞书、Google Chat、IRC、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Slack 和 Zalo 的打包顶级附属文件加载共享密钥契约，以便已安装的 npm 构建在网关启动期间不再依赖缺失的 `dist/extensions/*/src/*` 文件。

## 2026.4.7

### 修复

- Matrix/引导：添加邀请自动加入设置步骤，包含明确的关闭警告和严格的稳定目标验证，以便新 Matrix 账户停止静默忽略受邀房间和新鲜 DM 样式邀请，除非操作员选择加入。(#62168) 感谢 @gumadeiras。
- Matrix/格式化：保留 Element 中的多段落和松散列表渲染，以便编号和项目符号 Markdown 保持其内容附加到正确的列表项。(#60997) 感谢 @gucasbrg。
- Matrix/代理：从嵌入式代理频道操作发现中隐藏仅所有者的 `set-profile`，以便非所有者运行停止宣传它们无法执行的配置文件更新。(#62662) 感谢 @eleqtrizit。

## 2026.4.5

### 变更

- Matrix/exec 审批：添加 Matrix 原生 exec 审批提示，包含账户范围的审批人、频道或 DM 传递以及房间线程感知解析处理。(#58635) 感谢 @gumadeiras。
- Matrix/exec 审批：澄清不可用审批回复，以便当本地 exec 审批仅未配置时，Matrix 不再声称聊天审批不受支持。(#61424) 感谢 @gumadeiras。

### 修复

- Matrix/exec 审批：将种子审批反应锚定到主 Matrix 提示事件，从事件元数据而不是提示文本解析它们，并正确清理分块审批提示。(#60931) 感谢 @gumadeiras。
- Matrix：在密钥存储或恢复密钥缺失时更可靠地恢复，通过在修复和备份重置期间重新创建密钥存储，在持久化期间持有加密快照锁，并暴露明确的太大附件标记。(#59846, #59851, #60599, #60289) 感谢 @al3mart、@emonty 和 @efe-arv。
- Matrix/DM 会话：添加 `channels.matrix.dm.sessionScope`、共享会话冲突通知以及对齐的出站会话重用，以便独立的 Matrix DM 房间在配置时可以保持不同的上下文。(#61373) 感谢 @gumadeiras。
- Matrix：在多账户升级期间将旧版顶级 `avatarUrl` 移至默认账户，并保持环境支持的账户设置头像配置持久化。(#61437) 感谢 @gumadeiras。
- Matrix/流式传输：为流式 Matrix 回复添加安静预览模式，保留旧版 `partial` 预览优先行为，并正确完成安静媒体标题，以便预览停止提前通知而不丢失最终文本语义。(#61450) 感谢 @gumadeiras。
- Matrix：通过 undici 运行时 fetch 将直接传输请求路由到固定调度器，使 Matrix 客户端在较新的运行时上恢复同步，而不会丢失已验证的地址绑定。(#61595) 感谢 @gumadeiras。
- Matrix：避免在令牌认证已知用户 ID 但仍需要可选设备元数据时启动失败，重试瞬态认证引导请求，并在启动后回填缺失的设备 ID，同时在元数据修复之前保持未知设备存储重用保守。(#61383) 感谢 @gumadeiras。
- Matrix：通过健康探针传递配置的 `deviceId`，并将仅探针的客户端设置保留在持久 Matrix 存储之外，以便健康检查保留正确的设备身份，而不在磁盘上重写 `storage-meta.json` 或相关探针状态。(#61581) 感谢 @MoerAI。
- Matrix/插件加载：正确发布和源加载加密引导运行时附属文件，以便当前 `main` 在每次调用时停止警告失败的 Matrix 引导加载和 `matrix/index` 插件 ID 不匹配。(#53298) 感谢 @keithce。
- 插件/Matrix：将 Matrix 加密 WASM 运行时依赖镜像到根打包安装中，并强制执行根/插件依赖关系一致性，以便打包的 Matrix E2EE 加密在发布构建中正确解析。(#57163) 感谢 @gumadeiras。
- 插件/CLI：添加描述符支持的懒加载插件 CLI 注册，以便 Matrix 可以保持其 CLI 模块懒加载，而不从解析时命令注册中删除 `openclaw matrix ...`。(#57165) 感谢 @gumadeiras。
- Matrix/传递恢复：在启动恢复期间将 Synapse `User not in room` 重放失败视为永久性，以便中毒的排队消息移至 `failed/`，而不是在重启后使 Matrix 崩溃循环。(#57426) 感谢 @dlardo。
- Doctor/插件：在没有迁移计划存在时跳过错误的 Matrix 旧版辅助警告，并在网关启动集中保留打包的 `enabledByDefault` 插件。(#57931) 感谢 @dinakars777。
- Matrix/CLI 发送：在出站传递之前启动一次性 Matrix 发送客户端，以便 `openclaw message send --channel matrix` 在加密房间中恢复 E2EE，而不是发送普通事件。(#57936) 感谢 @gumadeiras。
- Matrix/直接房间：停止信任远程 `is_direct`，对发现的 DM 候选者遵守明确的本地 `is_direct: false`，并避免对共享房间进行额外的成员状态查找，以便 DM 路由和修复保持对齐。(#57124) 感谢 @w-sss。
- Matrix/直接房间：在不急切持久化仅邀请 `m.direct` 映射的情况下恢复新鲜的自动加入 1:1 DM，同时将命名、别名和显式配置的房间保留在房间路径上。(#58024) 感谢 @gumadeiras。

## 2026.4.2

### 变更

- Matrix/插件：在文本发送、媒体标题、编辑、投票回退文本和操作驱动的编辑中发送符合规范的 `m.mentions` 元数据，以便 Matrix 提及在 Element 等客户端中可靠地通知。(#59323) 感谢 @gumadeiras。

## 2026.4.1-beta.1

### 说明

- Matrix/引导：在 `openclaw channels add` 和 `openclaw configure --section channels` 中恢复引导设置，同时在共享 `setupWizard` 接缝上保留自定义插件向导。(#59462) 感谢 @gumadeiras。
- Matrix/流式传输：在 `channels.matrix.blockStreaming` 启用时，保持当前助手块的实时部分预览，同时将已完成的块更新保留为独立消息。(#59384) 感谢 @gumadeiras。

## 2026.3.31

### 变更

- Matrix/历史：通过 `channels.matrix.historyLimit` 为 Matrix 群组触发器添加可选房间历史上下文，包含每代理水印和重试安全快照，以便失败的触发器重试不会漂移到较新的房间消息。(#57022) 感谢 @chain710。
- Matrix/网络：添加显式 `channels.matrix.proxy` 配置，用于通过 HTTP(S) 代理路由 Matrix 流量，包括账户级覆盖和匹配的探针/运行时行为。(#56931) 感谢 @patrick-yingxi-pan。
- Matrix/流式传输：添加草稿流式传输，以便部分 Matrix 回复就地更新同一消息，而不是为每个块发送新消息。(#56387) 感谢 @jrusz。
- Matrix/线程：添加每 DM `threadReplies` 覆盖，并从触发消息开始保持线程会话隔离与有效房间或 DM 线程策略对齐。(#57995) 感谢 @teconomix。

### 修复

- Doctor/插件：在没有迁移计划存在时跳过错误的 Matrix 旧版辅助警告，并在网关启动集中保留打包的 `enabledByDefault` 插件。(#57931) 感谢 @dinakars777。

## 2026.3.31-beta.1

### 修复

- Matrix/CLI 发送：在出站传递之前启动一次性 Matrix 发送客户端，以便 `openclaw message send --channel matrix` 在加密房间中恢复 E2EE，而不是发送普通事件。(#57936) 感谢 @gumadeiras。
- Matrix/上下文：按发送者允许列表过滤获取的房间上下文，以便回复和线程上下文查找不再将非允许列表消息拉入代理上下文。(#58376) 感谢 @jacobtomlinson。
- Matrix/传递恢复：在启动恢复期间将 Synapse `User not in room` 重放失败视为永久性，以便中毒的排队消息移至 `failed/`，而不是在重启后使 Matrix 崩溃循环。(#57426) 感谢 @dlardo。
- Matrix/直接房间：在不急切持久化仅邀请 `m.direct` 映射的情况下恢复新鲜的自动加入 1:1 DM，同时将命名、别名和显式配置的房间保留在房间路径上。(#58024) 感谢 @gumadeiras。
- Matrix/直接房间：停止信任远程 `is_direct`，对发现的 DM 候选者遵守明确的本地 `is_direct: false`，并避免对共享房间进行额外的成员状态查找，以便 DM 路由和修复保持对齐。(#57124) 感谢 @w-sss。
- Matrix/DM 线程：即使 Matrix 省略可选直接提示，也保持严格的未命名新鲜邀请房间可升级，在仍然重新验证稍后的房间元数据时保留修复失败的本地 DM 升级，并保持已绑定和线程隔离的 Matrix 会话报告正确的路由策略。(#58099) 感谢 @gumadeiras。
- Matrix/插件加载：正确发布和源加载加密引导运行时附属文件，以便当前 `main` 在每次调用时停止警告失败的 Matrix 引导加载和 `matrix/index` 插件 ID 不匹配。(#53298) 感谢 @keithce。
- 插件/CLI：添加描述符支持的懒加载插件 CLI 注册，以便 Matrix 可以保持其 CLI 模块懒加载，而不从解析时命令注册中删除 `openclaw matrix ...`。(#57165) 感谢 @gumadeiras。
- 插件/Matrix：将 Matrix 加密 WASM 运行时依赖镜像到根打包安装中，并强制执行根/插件依赖关系一致性，以便打包的 Matrix E2EE 加密在发布构建中正确解析。(#57163) 感谢 @gumadeiras。

## 2026.3.28

### 变更

- 插件/Matrix TTS：将自动 TTS 回复作为原生 Matrix 语音气泡发送，而不是通用音频附件。(#37080) 感谢 @Matthew19990919。

### 修复

- Matrix/回复：在入站回复上下文中包含引用的投票问题/选项，以便代理在用户回复 Matrix 投票消息时看到原始投票内容。(#55056) 感谢 @alberthild。
- Matrix/插件：防止插件引导在构建运行时混合裸和深度 `matrix-js-sdk` 入口点时崩溃，以便无关频道在插件加载期间不会被波及。(#56273) 感谢 @aquaright1。
- Matrix：在 `m.direct` 成功种子后，将独立的 2 人房间保留在 DM 路由之外，同时仍然遵守明确的 `is_direct` 状态和启动回退恢复。(#54890) 感谢 @private-peter。
- 插件/Matrix：通过将 `originalFilename` 转发给 `saveMediaBuffer` 为入站媒体保留发送者文件名。(#55692) 感谢 @esrehmki。
- Matrix/提及：识别可见标签使用 bot 房间显示名称的 `matrix.to` 提及，以便 `requireMention: true` 房间在现代 Matrix 客户端中正确响应。(#55393) 感谢 @nickludlam。
- 插件/Matrix：在选择出站直接房间和路由未映射验证摘要时优先使用明确的 DM 信号，以便严格的 2 人回退房间不会超过真实 DM。(#56076) 感谢 @gumadeiras。
- 插件/Matrix：在启动期间针对活动 Matrix 配置环境路径解析环境支持的 `accessToken` 和 `password` SecretRefs，并正式接受 SecretRef `accessToken` 配置值。(#54980) 感谢 @kakahu2015。
- 插件/Matrix：通过 `createRequire(...)` 加载打包的 `@matrix-org/matrix-sdk-crypto-nodejs`，以便 E2EE 媒体发送和接收在打包的 ESM 构建中保持包本地原生绑定查找工作。(#54566) 感谢 @joelnishanth。
- 插件/Matrix：用 `thumbnail_file` 加密 E2EE 图像缩略图，同时在未加密房间预览上保留 `thumbnail_url`，以便加密的 Matrix 图像事件保留缩略图元数据而不泄露明文预览。(#54711) 感谢 @frischeDaten。

## 2026.3.23

### 修复

- 插件/打包运行时：再次在 npm 包中发布打包插件运行时附属文件，如 WhatsApp `light-runtime-api.js`、Matrix `runtime-api.js` 和其他插件运行时入口文件，以便全局安装停止在缺失的打包插件运行时表面上失败。
- 插件/Matrix：避免在源加载器下重复 `resolveMatrixAccountStringValues` 运行时 API 导出，以便打包的 Matrix 安装不再在启动时崩溃并显示 `Cannot redefine property: resolveMatrixAccountStringValues`。修复 #52909 和 #52891。感谢 @vincentkoc。

## 2026.3.22

### 重大变更

- 插件/Matrix：添加由官方 `matrix-js-sdk` 支持的新 Matrix 插件。如果你正在从之前的公共 Matrix 插件升级，请遵循迁移指南：https://docs.openclaw.ai/install/migrating-matrix 感谢 @gumadeiras。
- 插件/Matrix：停止提及门控或以其他方式丢弃的房间聊天在消息实际路由之前刷新聚焦的线程绑定，以便空闲的 ACP 和会话绑定在需要提及的房间中仍然可以正常过期。感谢 @vincentkoc、@dinakars777 和 @mvanhorn。
- 插件/Matrix：跨网关重启持久去重入站房间事件，以便之前处理的 Matrix 消息不会作为新消息重放，同时保留对未见事件的干净重启积压传递。(#50922) 感谢 @gumadeiras。

### 变更

- 插件/Matrix：添加 `allowBots` 房间策略，以便配置的 Matrix bot 账户可以相互通话，带有可选的仅提及门控。感谢 @gumadeiras。
- 插件/Matrix：添加每账户 `allowPrivateNetwork` 选择加入，用于私有/内部家庭服务器，同时保持公共明文家庭服务器被阻止。感谢 @gumadeiras。

### 修复

- 插件/Matrix：将打包插件 `KeyedAsyncQueue` 导入移至稳定的 `plugin-sdk/core` 表面，以便 Matrix Docker/运行时构建不依赖于脆弱的 keyed-async-queue 子路径。感谢 @ecohash-co 和 @vincentkoc。
- Doctor/插件：将 Matrix DM `allowFrom` 修复保留在规范的 `dm.allowFrom` 路径上，并停止将 Zalo 用户组发送者门控视为回退到 `allowFrom`，以便 doctor 警告和 `--fix` 与运行时访问控制保持对齐。感谢 @vincentkoc。
- Matrix：使引导状态运行时安全 (#49995) 感谢 @joshavant。
- 插件/Matrix：接受共享发送工具媒体别名（`mediaUrl`、`filePath`、`path`），并通过 Matrix 操作调度保留 `asVoice` / `audioAsVoice`，以便仅媒体发送和语音消息意图正确到达插件发送层。感谢 @psacc 和 @vincentkoc。
