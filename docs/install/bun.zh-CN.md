---
summary: "Bun 工作流（实验性）：与 pnpm 相比的安装方式和注意事项"
read_when:
  - 您想要最快的本地开发循环（bun + watch）
  - 您遇到了 Bun 安装/补丁/生命周期脚本问题
title: "Bun（实验性）"
---

<Warning>
**不推荐**将 Bun 用于网关运行时（WhatsApp 和 Telegram 存在已知问题）。生产环境请使用 Node。
</Warning>

Bun 是一个可选的本地运行时，用于直接运行 TypeScript（`bun run ...`、`bun --watch ...`）。默认包管理器仍然是 `pnpm`，完全受支持，并被文档工具使用。Bun 不能使用 `pnpm-lock.yaml`，会忽略它。

## 安装

<Steps>
  <Step title="安装依赖">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 gitignore，因此不会产生仓库变动。要完全跳过锁文件写入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖项生命周期脚本，除非明确信任。对于此仓库，通常被阻止的脚本不是必需的：

- `@whiskeysockets/baileys` `preinstall` -- 检查 Node 主版本 >= 20（OpenClaw 默认使用 Node 24，仍然支持 Node 22 LTS，当前 `22.14+`）
- `protobufjs` `postinstall` -- 发出关于不兼容版本方案的警告（无构建产物）

如果您遇到需要这些脚本的运行时问题，显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

某些脚本仍然硬编码使用 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前请通过 pnpm 运行这些脚本。

## 相关

- [安装概述](/install)
- [Node.js](/install/node)
- [更新](/install/updating)
