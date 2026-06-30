---
summary: "用于安静最终预览编辑的每收件人 Matrix 推送规则"
read_when:
  - 为自托管的 Synapse 或 Tuwunel 设置 Matrix 安静流式传输
  - 用户只想在完成的块上收到通知，而不是每次预览编辑都通知
title: "Matrix 推送规则（安静预览）"
---

当 `channels.matrix.streaming` 为 `"quiet"` 时，OpenClaw 就地编辑单个预览事件，并用自定义内容标志标记最终编辑。Matrix 客户端仅在每用户推送规则匹配该标志时才对最终编辑发出通知。本页面适用于自托管 Matrix 并希望为每个收件人账户安装该规则的操作员。

如果您只想要标准 Matrix 通知行为，请使用 `streaming: "partial"` 或保持流式传输关闭。请参阅 [Matrix 频道设置](/channels/matrix#streaming-previews)。

## 先决条件

- 收件人用户 = 应该接收通知的人
- 机器人用户 = 发送回复的 OpenClaw Matrix 账户
- 对下面的 API 调用使用收件人用户的访问令牌
- 在推送规则中将 `sender` 与机器人用户的完整 MXID 匹配
- 收件人账户必须已经有正常工作的推送器——安静预览规则只有在正常的 Matrix 推送交付健康时才有效

## 步骤

<Steps>
  <Step title="配置安静预览">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="获取收件人的访问令牌">
    在可能的情况下重用现有的客户端会话令牌。要创建新令牌：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

  </Step>

  <Step title="验证推送器存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果没有推送器返回，请在继续之前修复此账户的正常 Matrix 推送交付。

  </Step>

  <Step title="安装覆盖推送规则">
    OpenClaw 使用 `content["com.openclaw.finalized_preview"] = true` 标记最终化的纯文本预览编辑。安装一个与该标记加上机器人 MXID 作为发送者匹配的规则：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    运行前替换：

    - `https://matrix.example.org`：您的主服务器基础 URL
    - `$USER_ACCESS_TOKEN`：收件人用户的访问令牌
    - `openclaw-finalized-preview-botname`：每个机器人每个收件人唯一的规则 ID（模式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：您的 OpenClaw 机器人 MXID，不是收件人的

  </Step>

  <Step title="验证">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然后测试流式回复。在安静模式下，房间显示安静的草稿预览，并在块或轮次完成时通知一次。

  </Step>
</Steps>

要稍后删除规则，请使用收件人的令牌对同一规则 URL 发送 `DELETE`。

## 多机器人说明

推送规则通过 `ruleId` 键控：对同一 ID 重新运行 `PUT` 会更新单个规则。对于通知同一收件人的多个 OpenClaw 机器人，为每个机器人创建一个带有不同发送者匹配的规则。

新的用户定义 `override` 规则插入在默认抑制规则之前，因此不需要额外的排序参数。该规则只影响可以就地最终化的纯文本预览编辑；媒体回退和过期预览回退使用正常的 Matrix 交付。

## 主服务器说明

<AccordionGroup>
  <Accordion title="Synapse">
    不需要特殊的 `homeserver.yaml` 更改。如果正常的 Matrix 通知已经到达此用户，上面的收件人令牌 + `pushrules` 调用是主要的设置步骤。

    如果您在反向代理或工作进程后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 正确到达 Synapse。推送交付由主进程或 `synapse.app.pusher`/配置的推送工作进程处理——确保这些是健康的。

    该规则使用 `event_property_is` 推送规则条件（MSC3758，推送规则 v1.10），于 2023 年添加到 Synapse。较旧的 Synapse 版本接受 `PUT pushrules/...` 调用，但静默地从不匹配该条件——如果在最终化预览编辑上没有通知到达，请升级 Synapse。

  </Accordion>

  <Accordion title="Tuwunel">
    与 Synapse 流程相同；最终化预览标记不需要 Tuwunel 特定的配置。

    如果用户在另一个设备上活跃时通知消失，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 1.4.2（2025 年 9 月）中添加了此选项，当一个设备活跃时，它可以有意地抑制对其他设备的推送。

  </Accordion>
</AccordionGroup>

## 相关文档

- [Matrix 频道设置](/channels/matrix)
- [流式传输概念](/concepts/streaming)
