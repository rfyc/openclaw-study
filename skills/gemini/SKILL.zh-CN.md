---
name: gemini
description: Gemini CLI，用于一次性问答、摘要生成和内容生成。
homepage: https://ai.google.dev/
metadata:
  {
    "openclaw":
      {
        "emoji": "✨",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---

# Gemini CLI

以一次性模式使用 Gemini，通过位置参数传入提示（避免使用交互模式）。

快速开始

- `gemini "Answer this question..."`
- `gemini --model <name> "Prompt..."`
- `gemini --output-format json "Return JSON"`

扩展

- 列表：`gemini --list-extensions`
- 管理：`gemini extensions <command>`

注意事项

- 如需身份验证，请先交互式运行一次 `gemini` 并完成登录流程。
- 出于安全考虑，避免使用 `--yolo`。
