---
summary: "如何通过运营商管理的过滤代理路由 OpenClaw 运行时 HTTP 和 WebSocket 流量"
title: "网络代理"
read_when:
  - 您希望针对 SSRF 和 DNS 重绑定攻击进行深度防御
  - 为 OpenClaw 运行时流量配置外部转发代理
---

# 网络代理

OpenClaw 可以通过运营商管理的转发代理路由运行时 HTTP 和 WebSocket 流量。这是可选的深度防御，适用于希望进行集中出口控制、更强 SSRF 保护和更好网络可审计性的部署。

OpenClaw 不附带、下载、启动、配置或认证任何代理。您运行适合您环境的代理技术，OpenClaw 通过它路由正常的进程本地 HTTP 和 WebSocket 客户端。

## 为什么使用代理？

代理为运营商提供一个用于出站 HTTP 和 WebSocket 流量的网络控制点。即使在 SSRF 加固之外，这也很有用：

- 集中策略：维护一个出口策略，而不是依赖每个应用程序 HTTP 调用点来正确处理网络规则。
- 连接时检查：在 DNS 解析后、代理打开上游连接之前立即评估目的地。
- DNS 重绑定防御：减少应用级 DNS 检查与实际出站连接之间的差距。
- 更广泛的 JavaScript 覆盖：通过同一路径路由普通的 `fetch`、`node:http`、`node:https`、WebSocket、axios、got、node-fetch 和类似客户端。
- 可审计性：在出口边界记录允许和拒绝的目的地。
- 运营控制：无需重建 OpenClaw 即可执行目的地规则、网络分段、速率限制或出站允许列表。

代理路由是普通 HTTP 和 WebSocket 出口的进程级防护。它为通过运营商自己的过滤代理路由受支持的 JavaScript HTTP 客户端提供了一个失败关闭的路径，但它不是操作系统级网络沙箱，也不会让 OpenClaw 认证代理的目的地策略。

## OpenClaw 如何路由流量

当 `proxy.enabled=true` 且配置了代理 URL 时，受保护的运行时进程（如 `openclaw gateway run`、`openclaw node run` 和 `openclaw agent --local`）通过配置的代理路由正常的 HTTP 和 WebSocket 出口：

```text
OpenClaw 进程
  fetch                  -> 运营商管理的过滤代理 -> 公共互联网
  node:http 和 https    -> 运营商管理的过滤代理 -> 公共互联网
  WebSocket 客户端      -> 运营商管理的过滤代理 -> 公共互联网
```

公共契约是路由行为，而非用于实现它的内部 Node hooks。当 Gateway URL 使用 `localhost` 或字面回环 IP（如 `127.0.0.1` 或 `[::1]`）时，OpenClaw Gateway 控制平面 WebSocket 客户端对本地回环 Gateway RPC 流量使用狭窄的直接路径。即使运营商代理阻止回环目的地，该控制平面路径也必须能够到达回环 Gateways。正常的运行时 HTTP 和 WebSocket 请求仍然使用配置的代理。

在内部，OpenClaw 为此功能使用两个进程级路由 hooks：

- Undici 调度器路由覆盖 `fetch`、undici 支持的客户端以及提供自己 undici 调度器的传输。
- `global-agent` 路由覆盖 Node 核心 `node:http` 和 `node:https` 调用者，包括许多基于 `http.request`、`https.request`、`http.get` 和 `https.get` 的库。受管理的代理模式强制使用该全局代理，以便显式 Node HTTP 代理不会意外绕过运营商代理。

某些插件拥有自定义传输，即使存在进程级路由，也需要显式代理配置。例如，Telegram 的 Bot API 传输使用自己的 HTTP/1 undici 调度器，因此遵守进程代理环境以及该所有者特定传输路径中的受管理 `OPENCLAW_PROXY_URL` 回退。

代理 URL 本身必须使用 `http://`。通过 HTTP `CONNECT` 仍然支持通过代理的 HTTPS 目的地；这仅意味着 OpenClaw 期望一个普通的 HTTP 转发代理监听器，例如 `http://127.0.0.1:3128`。

当代理处于活动状态时，OpenClaw 清除 `no_proxy`、`NO_PROXY` 和 `GLOBAL_AGENT_NO_PROXY`。这些绕过列表是基于目的地的，因此将 `localhost` 或 `127.0.0.1` 保留在那里会让高风险 SSRF 目标跳过过滤代理。

关闭时，OpenClaw 恢复之前的代理环境并重置缓存的进程路由状态。

## 相关代理术语

- `proxy.enabled` / `proxy.proxyUrl`：OpenClaw 运行时出口的出站转发代理路由。本页面记录了该功能。
- `gateway.auth.mode: "trusted-proxy"`：Gateway 访问的入站身份感知反向代理认证。参见[受信任代理认证](/gateway/trusted-proxy-auth)。
- `openclaw proxy`：用于开发和支持的本地调试代理和捕获检查器。参见 [openclaw proxy](/cli/proxy)。
- 渠道或提供商特定的代理设置：特定传输的所有者特定覆盖。当目标是跨运行时的集中出口控制时，优先使用受管理的网络代理。

## 配置

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

您也可以通过环境变量提供 URL，同时在配置中保持 `proxy.enabled=true`：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 优先于 `OPENCLAW_PROXY_URL`。

如果 `enabled=true` 但没有配置有效的代理 URL，受保护的命令将在启动时失败，而不是回退到直接网络访问。

对于使用 `openclaw gateway start` 启动的受管理 gateway 服务，建议将 URL 存储在配置中：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

环境变量回退最适合前台运行。如果您将其与已安装的服务一起使用，请将 `OPENCLAW_PROXY_URL` 放入服务的持久环境中，例如 `$OPENCLAW_STATE_DIR/.env` 或 `~/.openclaw/.env`，然后重新安装服务，使 launchd、systemd 或计划任务以该值启动 gateway。

对于 `openclaw --container ...` 命令，当设置了 `OPENCLAW_PROXY_URL` 时，OpenClaw 会将其转发到容器目标的子 CLI 中。URL 必须从容器内部可达；`127.0.0.1` 指的是容器本身，而非宿主机。除非您明确覆盖该安全检查，否则 OpenClaw 会拒绝容器目标命令的回环代理 URL。

## 代理要求

代理策略是安全边界。OpenClaw 无法验证代理是否阻止了正确的目标。

配置代理以：

- 仅绑定到回环或私有可信接口。
- 限制访问，使只有 OpenClaw 进程、宿主机、容器或服务账户可以使用它。
- 自行解析目的地并在 DNS 解析后阻止目的地 IP。
- 在连接时对普通 HTTP 请求和 HTTPS `CONNECT` 隧道都应用策略。
- 拒绝回环、私有、链路本地、元数据、多播、保留或文档范围的基于目的地的绕过。
- 避免使用主机名允许列表，除非您完全信任 DNS 解析路径。
- 记录目的地、决定、状态和原因，而不记录请求体、授权头、cookies 或其他秘密。
- 将代理策略保持在版本控制下，并像对待安全敏感配置一样审查更改。

## 推荐的阻止目的地

使用此拒绝列表作为任何转发代理、防火墙或出口策略的起点。

OpenClaw 应用级分类器逻辑位于 `src/infra/net/ssrf.ts` 和 `src/shared/net/ip.ts`。相关的一致性 hooks 是 `BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、`RFC2544_BENCHMARK_PREFIX`，以及针对 NAT64、6to4、Teredo、ISATAP 和 IPv4 映射形式的嵌入式 IPv4 哨兵处理。在维护外部代理策略时，这些文件是有用的参考，但 OpenClaw 不会自动在您的代理中导出或执行这些规则。

| 范围或主机                                                                           | 阻止原因                       |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| `127.0.0.0/8`、`localhost`、`localhost.localdomain`                                  | IPv4 回环                      |
| `::1/128`                                                                            | IPv6 回环                      |
| `0.0.0.0/8`、`::/128`                                                                | 未指定和本网络地址             |
| `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`                                      | RFC1918 私有网络               |
| `169.254.0.0/16`、`fe80::/10`                                                        | 链路本地地址和常见云元数据路径 |
| `169.254.169.254`、`metadata.google.internal`                                        | 云元数据服务                   |
| `100.64.0.0/10`                                                                      | 运营商级 NAT 共享地址空间      |
| `198.18.0.0/15`、`2001:2::/48`                                                       | 基准测试范围                   |
| `192.0.0.0/24`、`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`、`2001:db8::/32` | 特殊用途和文档范围             |
| `224.0.0.0/4`、`ff00::/8`                                                            | 多播                           |
| `240.0.0.0/4`                                                                        | 保留的 IPv4                    |
| `fc00::/7`、`fec0::/10`                                                              | IPv6 本地/私有范围             |
| `100::/64`、`2001:20::/28`                                                           | IPv6 丢弃和 ORCHIDv2 范围      |
| `64:ff9b::/96`、`64:ff9b:1::/48`                                                     | 带嵌入 IPv4 的 NAT64 前缀      |
| `2002::/16`、`2001::/32`                                                             | 带嵌入 IPv4 的 6to4 和 Teredo  |
| `::/96`、`::ffff:0:0/96`                                                             | IPv4 兼容和 IPv4 映射的 IPv6   |

如果您的云提供商或网络平台记录了其他元数据主机或保留范围，也请添加。

## 验证

从运行 OpenClaw 的同一宿主机、容器或服务账户验证代理：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

默认情况下，当没有提供自定义目的地时，命令检查 `https://example.com/` 是否成功，并启动一个代理必须无法到达的临时回环金丝雀。当代理返回非 2xx 拒绝响应或通过传输失败阻止金丝雀时，默认拒绝检查通过；如果成功响应到达金丝雀，则失败。如果没有启用和配置代理，验证会报告配置问题；使用 `--proxy-url` 在更改配置之前进行一次性预检。使用 `--allowed-url` 和 `--denied-url` 测试特定于部署的期望。添加 `--apns-reachable` 还可以验证直接 APNs HTTP/2 传递能否通过代理打开 CONNECT 隧道并接收沙盒 APNs 响应；探测使用故意无效的提供商令牌，因此 `403 InvalidProviderToken` 是预期的，被视为可达。自定义拒绝目的地是失败关闭的：任何 HTTP 响应意味着目的地通过代理可达，任何传输错误都报告为不确定，因为 OpenClaw 无法证明代理阻止了可达的来源。验证失败时，命令以代码 1 退出。

使用 `--json` 进行自动化。JSON 输出包含总体结果、有效的代理配置来源、任何配置错误以及每个目的地检查。代理 URL 凭据在文本和 JSON 输出中均已脱敏：

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    },
    {
      "kind": "apns",
      "url": "https://api.sandbox.push.apple.com",
      "ok": true,
      "status": 403
    }
  ]
}
```

您也可以使用 `curl` 手动验证：

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

公共请求应该成功。代理应该阻止回环和元数据请求。对于 `openclaw proxy validate`，内置回环金丝雀可以区分代理拒绝和可达来源。自定义 `--denied-url` 检查没有该金丝雀，因此除非您的代理公开了可以单独验证的部署特定拒绝信号，否则将 HTTP 响应和模糊的传输失败都视为验证失败。

然后启用 OpenClaw 代理路由：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway run
```

或设置：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

## 限制

- 代理改善了进程本地 JavaScript HTTP 和 WebSocket 客户端的覆盖，但它不是操作系统级网络沙箱。
- 原始 `net`、`tls` 和 `http2` 套接字、本机插件和子进程可能绕过 Node 级代理路由，除非它们继承并遵守代理环境变量。
- IRC 是原始 TCP/TLS 渠道，不在运营商管理的转发代理路由之内。在需要所有出口通过该转发代理的部署中，除非明确批准直接 IRC 出口，否则设置 `channels.irc.enabled=false`。
- 本地调试代理是诊断工具，在受管理代理模式活动时，其对代理请求和 CONNECT 隧道的直接上游转发默认禁用；仅在批准的本地诊断中启用直接转发。
- 当需要时，用户本地 WebUI 和本地模型服务器应在运营商代理策略中加入允许列表；OpenClaw 不为它们公开通用的本地网络绕过。
- Gateway 控制平面代理绕过有意限于 `localhost` 和字面回环 IP URL。对于本地直接 Gateway 控制平面连接，使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789`；其他主机名像普通的基于主机名的流量一样路由。
- OpenClaw 不检查、测试或认证您的代理策略。
- 将代理策略更改视为安全敏感的运营更改。
