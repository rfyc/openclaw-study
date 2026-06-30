---
summary: "技能配置模式和示例"
read_when:
  - 添加或修改技能配置
  - 调整内置允许列表或安装行为
title: "技能配置"
---

大多数技能加载/安装配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。代理特定的技能可见性位于 `agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun（Gateway 运行时仍为 Node；不建议使用 bun）
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或纯文本字符串
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

对于内置图像生成/编辑，建议使用 `agents.defaults.imageGenerationModel` 加上核心 `image_generate` 工具。`skills.entries.*` 仅适用于自定义或第三方技能工作流。

如果你选择了特定的图像提供商/模型，还需要配置该提供商的认证/API 密钥。典型示例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用于 `google/*`，`OPENAI_API_KEY` 用于 `openai/*`，`FAL_KEY` 用于 `fal/*`。

示例：

- 原生 Nano Banana Pro 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 代理技能允许列表

当你想要在相同的机器/工作区技能根路径下，但每个代理的可见技能集不同时，使用代理配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承默认值 -> github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

规则：

- `agents.defaults.skills`：省略 `agents.list[].skills` 的代理的共享基线允许列表。
- 省略 `agents.defaults.skills` 以默认不限制技能。
- `agents.list[].skills`：该代理的显式最终技能集；它不与默认值合并。
- `agents.list[].skills: []`：该代理不暴露任何技能。

## 字段

- 内置技能根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、`<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅**内置**技能的可选允许列表。设置后，只有列表中的内置技能才有资格（托管、代理和工作区技能不受影响）。
- `load.extraDirs`：要扫描的额外技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间（毫秒）（默认：250）。
- `install.preferBrew`：优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：节点安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。这只影响**技能安装**；Gateway 运行时仍应为 Node（不建议 WhatsApp/Telegram 使用 Bun）。
  - `openclaw setup --node-manager` 范围更窄，目前接受 `npm`、`pnpm` 或 `bun`。如果你想要 Yarn 支持的技能安装，请手动设置 `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：每个技能的覆盖设置。
- `agents.defaults.skills`：省略 `agents.list[].skills` 的代理继承的可选默认技能允许列表。
- `agents.list[].skills`：可选的每代理最终技能允许列表；显式列表替换继承的默认值而非合并。

每个技能的字段：

- `enabled`：设置 `false` 以禁用技能，即使它是内置/已安装的。
- `env`：注入代理运行的环境变量（仅在尚未设置的情况下）。
- `apiKey`：声明主要环境变量的技能的可选便捷项。支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意事项

- `entries` 下的键默认映射到技能名称。如果技能定义了 `metadata.openclaw.skillKey`，请使用该键。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置技能 → `skills.load.extraDirs`。
- 启用监视器后，技能更改在下一个代理轮次中生效。

### 沙盒技能 + 环境变量

当会话处于**沙盒**模式时，技能进程在配置的沙盒后端内运行。沙盒**不**继承主机 `process.env`。

使用以下方式之一：

- `agents.defaults.sandbox.docker.env` 用于 Docker 后端（或每代理 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到你的自定义沙盒镜像或远程沙盒环境中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。

## 相关链接

- [技能](/tools/skills)
- [创建技能](/tools/creating-skills)
- [Slash 命令](/tools/slash-commands)
