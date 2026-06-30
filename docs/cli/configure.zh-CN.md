---
summary: "`openclaw configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - 你想以交互方式调整凭证、设备或 agent 默认值
title: "Configure"
---

# `openclaw configure`

交互式提示，用于设置凭证、设备和 agent 默认值。

<Note>
**模型**区段包含 `agents.defaults.models` 允许列表的多选（在 `/model` 和模型选择器中显示的内容）。以提供商为范围的设置选择将其选定的模型合并到现有允许列表中，而不是替换配置中已有的不相关提供商。

从 configure 重新运行提供商认证会保留现有的 `agents.defaults.model.primary`，即使提供商的认证步骤返回带有其自己推荐默认模型的配置修补。这意味着添加或重新认证 xAI、OpenRouter 或其他提供商应使新模型可用，而不会接管你当前的主要模型。当你有意想更改默认模型时，使用 `openclaw models auth login --provider <id> --set-default` 或 `openclaw models set <model>`。
</Note>

当 configure 从提供商认证选择开始时，默认模型和允许列表选择器会自动优先选择该提供商。对于配对提供商（如 Volcengine 和 BytePlus），同样的偏好也匹配它们的编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果偏好的提供商过滤器会产生空列表，configure 会回退到未过滤的目录，而不是显示空选择器。

<Tip>
不带子命令的 `openclaw config` 打开同样的向导。使用 `openclaw config get|set|unset` 进行非交互式编辑。
</Tip>

对于网络搜索，`openclaw configure --section web` 允许你选择提供商并配置其凭证。某些提供商还会显示特定于提供商的后续提示：

- **Grok** 可以提供使用相同 `XAI_API_KEY` 的可选 `x_search` 设置，并允许你选择 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）和默认的 Kimi 网络搜索模型。

相关：

- Gateway 配置参考：[Configuration](/gateway/configuration)
- Config CLI：[Config](/cli/config)

## 选项

- `--section <section>`：可重复的区段过滤器

可用区段：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

备注：

- 选择 Gateway 运行位置始终会更新 `gateway.mode`。如果这就是你所需要的，可以在不选择其他区段的情况下选择"继续"。
- 在本地配置写入后，configure 会在所选设置路径需要时安装所选的可下载插件。远程 gateway 配置不安装本地插件包。
- 面向频道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置期间提示输入频道/房间允许列表。你可以输入名称或 ID；向导会在可能时将名称解析为 ID。
- 如果你运行守护进程安装步骤，令牌认证需要令牌，且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef 但不会将解析后的明文令牌值持久化到监督服务环境元数据中。
- 如果令牌认证需要令牌但配置的令牌 SecretRef 未解析，configure 会以可操作的修复指导阻止守护进程安装。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，configure 会阻止守护进程安装，直到明确设置模式。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## 相关

- [CLI 参考](/cli)
- [配置](/gateway/configuration)
