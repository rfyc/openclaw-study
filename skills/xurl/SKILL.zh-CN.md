---
name: xurl
description: 使用 xurl 进行已认证的 X API 发帖、回复、搜索、私信、媒体上传、关注者管理或原始 v2 调用。
metadata:
  {
    "openclaw":
      {
        "emoji": "🐦",
        "requires": { "bins": ["xurl"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "xdevplatform/tap/xurl",
              "bins": ["xurl"],
              "label": "Install xurl (brew)",
            },
            {
              "id": "npm",
              "kind": "npm",
              "package": "@xdevplatform/xurl",
              "bins": ["xurl"],
              "label": "Install xurl (npm)",
            },
          ],
      },
  }
---

# xurl — 智能体 Skill 参考

`xurl` 是用于 X API 的 CLI 工具。它支持**快捷命令**（人类/智能体友好的单行命令）和**原始 curl 风格**访问任何 v2 端点。所有命令将 JSON 输出到标准输出。

---

## 安装

### Homebrew（macOS）

```bash
brew install --cask xdevplatform/tap/xurl
```

### npm

```bash
npm install -g @xdevplatform/xurl
```

### Shell 脚本

```bash
curl -fsSL https://raw.githubusercontent.com/xdevplatform/xurl/main/install.sh | bash
```

安装到 `~/.local/bin`。如果不在 PATH 中，脚本会告知需要添加的内容。

### Go

```bash
go install github.com/xdevplatform/xurl@latest
```

---

## 前提条件

此 skill 需要 `xurl` CLI 工具：<https://github.com/xdevplatform/xurl>。

使用任何命令前必须先完成认证。运行 `xurl auth status` 检查状态。

### 密钥安全（强制要求）

- 不得读取、打印、解析、摘要、上传或发送 `~/.xurl`（或其副本）到 LLM 上下文中。
- 不得要求用户在聊天中粘贴凭据/令牌。
- 用户必须在其自己的机器上手动填写 `~/.xurl` 中的所需密钥。
- 不得在智能体/LLM 会话中执行带有内联密钥的认证命令。
- 警告：在智能体会话中使用 CLI 密钥选项可能导致凭据泄露（提示/上下文、日志、shell 历史）。
- 在智能体/LLM 会话中不得使用 `--verbose` / `-v`；它可能在输出中暴露敏感头信息/令牌。
- 在智能体命令中绝不使用的敏感参数：`--bearer-token`、`--consumer-key`、`--consumer-secret`、`--access-token`、`--token-secret`、`--client-id`、`--client-secret`。
- 要验证是否已至少注册一个带凭据的应用，运行：`xurl auth status`。

### 注册应用（推荐）

应用凭据注册必须由用户在智能体/LLM 会话外手动完成。
凭据注册后，使用以下命令认证：

```bash
xurl auth oauth2
```

对于多个预配置的应用，在它们之间切换：

```bash
xurl auth default prod-app          # 设置默认应用
xurl auth default prod-app alice    # 设置默认应用 + 用户
xurl --app dev-app /2/users/me      # 单次覆盖
```

### 其他认证方式

带内联密钥参数的示例被有意省略。如需 OAuth1 或仅应用认证，用户必须在智能体/LLM 上下文外手动运行这些命令。

令牌以 YAML 格式持久化到 `~/.xurl`。每个应用有其独立的令牌。不要通过智能体/LLM 读取此文件。认证完成后，以下每个命令都会自动附加正确的 `Authorization` 头。

---

## 快速参考

| 操作             | 命令                                           |
| ---------------- | ---------------------------------------------- |
| 发帖             | `xurl post "Hello world!"`                     |
| 回复             | `xurl reply POST_ID "Nice post!"`              |
| 引用             | `xurl quote POST_ID "My take"`                 |
| 删除帖子         | `xurl delete POST_ID`                          |
| 读取帖子         | `xurl read POST_ID`                            |
| 搜索帖子         | `xurl search "QUERY" -n 10`                    |
| 我是谁           | `xurl whoami`                                  |
| 查询用户         | `xurl user @handle`                            |
| 主页时间线       | `xurl timeline -n 20`                          |
| 提及             | `xurl mentions -n 10`                          |
| 点赞             | `xurl like POST_ID`                            |
| 取消点赞         | `xurl unlike POST_ID`                          |
| 转发             | `xurl repost POST_ID`                          |
| 取消转发         | `xurl unrepost POST_ID`                        |
| 书签             | `xurl bookmark POST_ID`                        |
| 删除书签         | `xurl unbookmark POST_ID`                      |
| 列出书签         | `xurl bookmarks -n 10`                         |
| 列出点赞         | `xurl likes -n 10`                             |
| 关注             | `xurl follow @handle`                          |
| 取消关注         | `xurl unfollow @handle`                        |
| 列出正在关注     | `xurl following -n 20`                         |
| 列出粉丝         | `xurl followers -n 20`                         |
| 屏蔽             | `xurl block @handle`                           |
| 取消屏蔽         | `xurl unblock @handle`                         |
| 静音             | `xurl mute @handle`                            |
| 取消静音         | `xurl unmute @handle`                          |
| 发送私信         | `xurl dm @handle "message"`                    |
| 列出私信         | `xurl dms -n 10`                               |
| 上传媒体         | `xurl media upload path/to/file.mp4`           |
| 媒体状态         | `xurl media status MEDIA_ID`                   |
| **应用管理**     |                                                |
| 注册应用         | 手动，在智能体外操作（不要通过智能体传递密钥） |
| 列出应用         | `xurl auth apps list`                          |
| 更新应用凭据     | 手动，在智能体外操作（不要通过智能体传递密钥） |
| 删除应用         | `xurl auth apps remove NAME`                   |
| 交互式设置默认   | `xurl auth default`                            |
| 命令式设置默认   | `xurl auth default APP_NAME [USERNAME]`        |
| 单次请求指定应用 | `xurl --app NAME /2/users/me`                  |
| 认证状态         | `xurl auth status`                             |

> **帖子 ID vs URL：** 上面任何出现 `POST_ID` 的地方都可以粘贴完整的帖子 URL（例如 `https://x.com/user/status/1234567890`）—— xurl 会自动提取 ID。

> **用户名：** 前导 `@` 是可选的。`@elonmusk` 和 `elonmusk` 均可使用。

---

## 命令详情

### 发帖

```bash
# 简单发帖
xurl post "Hello world!"

# 带媒体发帖（先上传，再附加）
xurl media upload photo.jpg          # → 记录响应中的 media_id
xurl post "Check this out" --media-id MEDIA_ID

# 多个媒体
xurl post "Thread pics" --media-id 111 --media-id 222

# 回复帖子（通过 ID 或 URL）
xurl reply 1234567890 "Great point!"
xurl reply https://x.com/user/status/1234567890 "Agreed!"

# 带媒体回复
xurl reply 1234567890 "Look at this" --media-id MEDIA_ID

# 引用帖子
xurl quote 1234567890 "Adding my thoughts"

# 删除自己的帖子
xurl delete 1234567890
```

### 读取

```bash
# 读取单条帖子（返回作者、文本、指标、实体）
xurl read 1234567890
xurl read https://x.com/user/status/1234567890

# 搜索最近帖子（默认 10 条结果）
xurl search "golang"
xurl search "from:elonmusk" -n 20
xurl search "#buildinpublic lang:en" -n 15
```

### 用户信息

```bash
# 自己的个人资料
xurl whoami

# 查询任意用户
xurl user elonmusk
xurl user @XDevelopers
```

### 时间线与提及

```bash
# 主页时间线（逆时间序）
xurl timeline
xurl timeline -n 25

# 你的提及
xurl mentions
xurl mentions -n 20
```

### 互动

```bash
# 点赞 / 取消点赞
xurl like 1234567890
xurl unlike 1234567890

# 转发 / 撤销
xurl repost 1234567890
xurl unrepost 1234567890

# 书签 / 删除
xurl bookmark 1234567890
xurl unbookmark 1234567890

# 列出书签 / 点赞
xurl bookmarks -n 20
xurl likes -n 20
```

### 社交图谱

```bash
# 关注 / 取消关注
xurl follow @XDevelopers
xurl unfollow @XDevelopers

# 列出你关注的人 / 你的粉丝
xurl following -n 50
xurl followers -n 50

# 列出其他用户的关注/粉丝
xurl following --of elonmusk -n 20
xurl followers --of elonmusk -n 20

# 屏蔽 / 取消屏蔽
xurl block @spammer
xurl unblock @spammer

# 静音 / 取消静音
xurl mute @annoying
xurl unmute @annoying
```

### 私信

```bash
# 发送私信
xurl dm @someuser "Hey, saw your post!"

# 列出最近私信事件
xurl dms
xurl dms -n 25
```

### 媒体上传

```bash
# 上传文件（自动检测图片/视频类型）
xurl media upload photo.jpg
xurl media upload video.mp4

# 明确指定类型和分类
xurl media upload --media-type image/jpeg --category tweet_image photo.jpg

# 检查处理状态（视频需要服务器端处理）
xurl media status MEDIA_ID
xurl media status --wait MEDIA_ID    # 轮询直到完成

# 完整工作流：上传后发帖
xurl media upload meme.png           # 响应中包含 media id
xurl post "lol" --media-id MEDIA_ID
```

---

## 全局参数

这些参数适用于所有命令：

| 参数         | 简写 | 描述                                           |
| ------------ | ---- | ---------------------------------------------- |
| `--app`      |      | 为此次请求使用特定的已注册应用（覆盖默认值）   |
| `--auth`     |      | 强制使用认证类型：`oauth1`、`oauth2` 或 `app`  |
| `--username` | `-u` | 使用哪个 OAuth2 账户（如果有多个）             |
| `--verbose`  | `-v` | 在智能体/LLM 会话中禁用（可能暴露认证头/令牌） |
| `--trace`    | `-t` | 添加 `X-B3-Flags: 1` 追踪头                    |

---

## 原始 API 访问

快捷命令涵盖了最常见的操作。对于其他需求，使用 xurl 的原始 curl 风格模式——它适用于**任何** X API v2 端点：

```bash
# GET 请求（默认）
xurl /2/users/me

# 带 JSON 正文的 POST
xurl -X POST /2/tweets -d '{"text":"Hello world!"}'

# PUT、PATCH、DELETE
xurl -X DELETE /2/tweets/1234567890

# 自定义头
xurl -H "Content-Type: application/json" /2/some/endpoint

# 强制流式模式
xurl -s /2/tweets/search/stream

# 完整 URL 也可使用
xurl https://api.x.com/2/users/me
```

---

## 流式传输

流式端点会被自动检测。已知的流式端点包括：

- `/2/tweets/search/stream`
- `/2/tweets/sample/stream`
- `/2/tweets/sample10/stream`

可以使用 `-s` 强制任何端点使用流式模式：

```bash
xurl -s /2/some/endpoint
```

---

## 输出格式

所有命令将 **JSON** 输出到标准输出，并带有语法高亮的美化格式。输出结构与 X API v2 响应格式一致。典型响应如下：

```json
{
  "data": {
    "id": "1234567890",
    "text": "Hello world!"
  }
}
```

错误也以 JSON 形式返回：

```json
{
  "errors": [
    {
      "message": "Not authorized",
      "code": 403
    }
  ]
}
```

---

## 常见工作流

### 发帖带图片

```bash
# 1. 上传图片
xurl media upload photo.jpg
# 2. 从响应中复制 media_id，然后发帖
xurl post "Check out this photo!" --media-id MEDIA_ID
```

### 回复对话

```bash
# 1. 读取帖子以了解上下文
xurl read https://x.com/user/status/1234567890
# 2. 回复
xurl reply 1234567890 "Here are my thoughts..."
```

### 搜索并互动

```bash
# 1. 搜索相关帖子
xurl search "topic of interest" -n 10
# 2. 点赞一条有趣的
xurl like POST_ID_FROM_RESULTS
# 3. 回复它
xurl reply POST_ID_FROM_RESULTS "Great point!"
```

### 查看你的活动

```bash
# 查看你是谁
xurl whoami
# 检查你的提及
xurl mentions -n 20
# 查看你的时间线
xurl timeline -n 20
```

### 设置多个应用

```bash
# 应用凭据必须已在智能体/LLM 上下文外手动配置。
# 在每个预配置的应用上认证用户
xurl auth default prod
xurl auth oauth2                       # 在 prod 应用上认证

xurl auth default staging
xurl auth oauth2                       # 在 staging 应用上认证

# 在它们之间切换
xurl auth default prod alice           # prod 应用，alice 用户
xurl --app staging /2/users/me         # 针对 staging 的单次请求
```

---

## 错误处理

- 出现任何错误时返回非零退出码。
- API 错误以 JSON 格式输出到标准输出（因此你仍然可以解析它们）。
- 认证错误建议重新运行 `xurl auth oauth2` 或检查令牌。
- 如果某个命令需要你的用户 ID（点赞、转发、书签、关注等），xurl 会通过 `/2/users/me` 自动获取。如果失败，你会看到认证错误。

---

## 说明

- **频率限制：** X API 对每个端点强制执行频率限制。如果收到 429 错误，等待后重试。写操作端点（发帖、回复、点赞、转发）的限制比读操作更严格。
- **权限范围：** OAuth 2.0 令牌请求了广泛的权限范围。如果在某个特定操作上收到 403 错误，你的令牌可能缺少所需权限——重新运行 `xurl auth oauth2` 获取新令牌。
- **令牌刷新：** OAuth 2.0 令牌过期时自动刷新。无需手动干预。
- **多个应用：** 每个应用有其独立的凭据和令牌。在智能体/LLM 上下文外手动配置凭据，然后使用 `xurl auth default` 或 `--app` 切换。
- **多个账户：** 每个应用可以认证多个 OAuth 2.0 账户，并使用 `--username` / `-u` 切换，或通过 `xurl auth default APP USER` 设置默认值。
- **默认用户：** 未指定 `-u` 参数时，xurl 使用活跃应用的默认用户（通过 `xurl auth default` 设置）。如果没有设置默认用户，则使用第一个可用令牌。
- **令牌存储：** `~/.xurl` 为 YAML 格式。每个应用存储其独立的凭据和令牌。不得通过 LLM 读取或发送此文件。
