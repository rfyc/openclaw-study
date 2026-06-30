---
name: clawhub
description: 使用 ClawHub CLI 和注册表搜索、安装、更新、同步或发布代理技能。
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["clawhub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "clawhub",
              "bins": ["clawhub"],
              "label": "Install ClawHub CLI (npm)",
            },
          ],
      },
  }
---

# ClawHub CLI

安装

```bash
npm i -g clawhub
```

认证（发布用）

```bash
clawhub login
clawhub whoami
```

搜索

```bash
clawhub search "postgres backups"
```

安装

```bash
clawhub install my-skill
clawhub install my-skill --version 1.2.3
```

更新（基于哈希匹配 + 升级）

```bash
clawhub update my-skill
clawhub update my-skill --version 1.2.3
clawhub update --all
clawhub update my-skill --force
clawhub update --all --no-input --force
```

列出

```bash
clawhub list
```

发布

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

注意事项

- 默认注册表：https://clawhub.com（可通过 CLAWHUB_REGISTRY 或 --registry 覆盖）
- 默认工作目录：当前目录（回退到 OpenClaw 工作区）；安装目录：./skills（可通过 --workdir / --dir / CLAWHUB_WORKDIR 覆盖）
- update 命令对本地文件进行哈希，解析匹配版本，并升级到最新版本（除非指定了 --version）
