---
summary: "将网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任代理认证"
sidebarTitle: "受信任代理认证"
read_when:
  - 在身份感知代理后面运行 OpenClaw 时
  - 在 OpenClaw 前面设置 Pomerium、Caddy 或带有 OAuth 的 nginx 时
  - 修复反向代理设置中的 WebSocket 1008 未授权错误时
  - 决定在哪里设置 HSTS 和其他 HTTP 加固标头时
---

<Warning>
**安全敏感功能。** 此模式将认证完全委托给你的反向代理。配置错误可能会使你的网关面临未授权访问。启用之前请仔细阅读此页面。
</Warning>

## 何时使用

在以下情况下使用 `trusted-proxy` 认证模式：

- 你在**身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw。
- 你的代理处理所有认证并通过标头传递用户身份。
- 你在 Kubernetes 或容器环境中，代理是通往网关的唯一路径。
- 你遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 有效载荷中传递令牌。

## 何时不使用

- 如果你的代理不对用户进行身份验证（只是 TLS 终止器或负载均衡器）。
- 如果有任何绕过代理到达网关的路径（防火墙漏洞、内部网络访问）。
- 如果你不确定你的代理是否正确剥离/覆盖转发的标头。
- 如果你只需要个人单用户访问（考虑使用 Tailscale Serve + 环回以获得更简单的设置）。

## 工作原理

<Steps>
  <Step title="代理对用户进行身份验证">
    你的反向代理对用户进行身份验证（OAuth、OIDC、SAML 等）。
  </Step>
  <Step title="代理添加身份标头">
    代理添加一个带有经过身份验证的用户身份的标头（例如 `x-forwarded-user: nick@example.com`）。
  </Step>
  <Step title="网关验证受信任来源">
    OpenClaw 检查请求是否来自**受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）。
  </Step>
  <Step title="网关提取身份">
    OpenClaw 从配置的标头中提取用户身份。
  </Step>
  <Step title="授权">
    如果一切正常，请求被授权。
  </Step>
</Steps>

## Control UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活跃状态且请求通过受信任代理检查时，Control UI WebSocket 会话可以在没有设备配对身份的情况下连接。

影响：

- 在此模式下，配对不再是 Control UI 访问的主要门控。
- 你的反向代理认证策略和 `allowUsers` 成为有效的访问控制。
- 将网关入口锁定为仅受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

## 配置

```json5
{
  gateway: {
    // 受信任代理认证默认期望来自非环回受信任代理源的请求
    bind: "lan",

    // 关键：此处只添加你的代理 IP
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // 包含已验证用户身份的标头（必须）
        userHeader: "x-forwarded-user",

        // 可选：必须存在的标头（代理验证）
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // 可选：限制为特定用户（空 = 允许所有）
        allowUsers: ["nick@example.com", "admin@company.org"],

        // 可选：明确选择加入后允许同主机环回代理
        allowLoopback: false,
      },
    },
  },
}
```

<Warning>
**重要运行时规则**

- 受信任代理认证默认拒绝环回源请求（`127.0.0.1`、`::1`、环回 CIDR）。
- 同主机环回反向代理**不**满足受信任代理认证，除非你明确设置 `gateway.auth.trustedProxy.allowLoopback = true` 并将环回地址包含在 `gateway.trustedProxies` 中。
- `allowLoopback` 以与反向代理相同的程度信任网关主机上的本地进程。只有当网关仍然通过防火墙阻止直接远程访问且本地代理剥离或覆盖客户端提供的身份标头时才启用它。
- 不经过反向代理的内部网关客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是受信任代理身份标头。
- 非环回 Control UI 部署仍然需要明确的 `gateway.controlUi.allowedOrigins`。
- **转发标头证据覆盖本地直接回退的环回局部性。** 如果请求到达环回但携带指向非本地来源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 标头，该证据取消本地直接密码回退和设备身份门控。使用 `allowLoopback: true` 时，受信任代理认证仍然可以接受请求作为同主机代理请求，而 `requiredHeaders` 和 `allowUsers` 继续适用。

</Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址数组。来自其他 IP 的请求被拒绝。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必须为 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已验证用户身份的标头名称。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  请求被信任所必须存在的额外标头。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  用户身份允许列表。空表示允许所有已验证用户。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  同主机环回反向代理的可选加入支持。默认为 `false`。
</ParamField>

<Warning>
只有当本地反向代理是预期的信任边界时才启用 `allowLoopback`。任何可以连接到网关的本地进程都可以尝试发送代理身份标头，因此保持对主机的直接网关访问私有，并在你的代理支持时要求代理拥有的标头（如 `x-forwarded-proto` 或签名断言标头）。
</Warning>

## TLS 终止和 HSTS

使用一个 TLS 终止点并在那里应用 HSTS。

<Tabs>
  <Tab title="代理 TLS 终止（推荐）">
    当你的反向代理处理 `https://control.example.com` 的 HTTPS 时，在代理上为该域设置 `Strict-Transport-Security`。

    - 适合面向互联网的部署。
    - 将证书 + HTTP 加固策略保持在一个地方。
    - OpenClaw 可以在代理后面保持在环回 HTTP 上。

    示例标头值：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="网关 TLS 终止">
    如果 OpenClaw 本身直接提供 HTTPS（没有 TLS 终止代理），请设置：

    ```json5
    {
      gateway: {
        tls: { enabled: true },
        http: {
          securityHeaders: {
            strictTransportSecurity: "max-age=31536000; includeSubDomains",
          },
        },
      },
    }
    ```

    `strictTransportSecurity` 接受字符串标头值，或 `false` 以明确禁用。

  </Tab>
</Tabs>

### 推出指南

- 首先从短的 max age 开始（例如 `max-age=300`）同时验证流量。
- 只有在信心高了之后才增加到长期值（例如 `max-age=31536000`）。
- 只有当每个子域都准备好 HTTPS 时才添加 `includeSubDomains`。
- 只有在你有意满足完整域集的预加载要求时才使用 preload。
- 仅限环回的本地开发不受益于 HSTS。

## 代理设置示例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 在 `x-pomerium-claim-email`（或其他声明标头）和 `x-pomerium-jwt-assertion` 中传递身份。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Pomerium 的 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-pomerium-claim-email",
            requiredHeaders: ["x-pomerium-jwt-assertion"],
          },
        },
      },
    }
    ```

    Pomerium 配置片段：

    ```yaml
    routes:
      - from: https://openclaw.example.com
        to: http://openclaw-gateway:18789
        policy:
          - allow:
              or:
                - email:
                    is: nick@example.com
        pass_identity_headers: true
    ```

  </Accordion>
  <Accordion title="带 OAuth 的 Caddy">
    带有 `caddy-security` 插件的 Caddy 可以对用户进行身份验证并传递身份标头。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Caddy/sidecar 代理 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-forwarded-user",
          },
        },
      },
    }
    ```

    Caddyfile 片段：

    ```
    openclaw.example.com {
        authenticate with oauth2_provider
        authorize with policy1

        reverse_proxy openclaw:18789 {
            header_up X-Forwarded-User {http.auth.user.email}
        }
    }
    ```

  </Accordion>
  <Accordion title="nginx + oauth2-proxy">
    oauth2-proxy 对用户进行身份验证并在 `x-auth-request-email` 中传递身份。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-auth-request-email",
          },
        },
      },
    }
    ```

    nginx 配置片段：

    ```nginx
    location / {
        auth_request /oauth2/auth;
        auth_request_set $user $upstream_http_x_auth_request_email;

        proxy_pass http://openclaw:18789;
        proxy_set_header X-Auth-Request-Email $user;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    ```

  </Accordion>
  <Accordion title="带 forward auth 的 Traefik">
    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["172.17.0.1"], // Traefik 容器 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-forwarded-user",
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 混合令牌配置

OpenClaw 拒绝 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式同时活跃的模糊配置。混合令牌配置可能导致环回请求在错误的认证路径上静默进行身份验证。

如果你在启动时看到 `mixed_trusted_proxy_token` 错误：

- 使用受信任代理模式时删除共享令牌，或
- 如果你打算使用基于令牌的认证，则将 `gateway.auth.mode` 切换为 `"token"`。

环回受信任代理身份标头仍然关闭失败：同主机调用者不会被静默地以代理用户身份进行身份验证。绕过代理的内部 OpenClaw 调用者可以使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 代替进行身份验证。在受信任代理模式下，令牌回退仍然有意不受支持。

## 操作员范围标头

受信任代理认证是**身份承载** HTTP 模式，因此调用者可以选择性地使用 `x-openclaw-scopes` 声明操作员范围。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当标头存在时，OpenClaw 遵循声明的范围集。
- 当标头存在但为空时，请求声明**无**操作员范围。
- 当标头不存在时，正常的身份承载 HTTP API 回退到标准操作员默认范围集。
- 网关认证**插件 HTTP 路由**默认更窄：当 `x-openclaw-scopes` 不存在时，其运行时范围回退到 `operator.write`。
- 浏览器来源的 HTTP 请求在受信任代理认证成功后仍然必须通过 `gateway.controlUi.allowedOrigins`（或有意的 Host 标头回退模式）。

实际规则：当你希望受信任代理请求比默认值更窄时，或当网关认证插件路由需要比写入范围更强的东西时，请明确发送 `x-openclaw-scopes`。

## 安全清单

启用受信任代理认证之前，请验证：

- [ ] **代理是唯一路径**：网关端口对你的代理之外的所有内容都是防火墙保护的。
- [ ] **trustedProxies 是最小的**：只有你实际的代理 IP，而不是整个子网。
- [ ] **环回代理源是有意的**：受信任代理认证对环回源请求关闭失败，除非为同主机代理明确启用了 `gateway.auth.trustedProxy.allowLoopback`。
- [ ] **代理剥离标头**：你的代理覆盖（而不是追加）来自客户端的 `x-forwarded-*` 标头。
- [ ] **TLS 终止**：你的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins 是明确的**：非环回 Control UI 使用明确的 `gateway.controlUi.allowedOrigins`。
- [ ] **allowUsers 已设置**（推荐）：限制为已知用户，而不是允许任何已验证的用户。
- [ ] **无混合令牌配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **本地密码回退是私有的**：如果你为内部直接调用者配置了 `gateway.auth.password`，请保持网关端口防火墙化，以便非代理远程客户端无法直接访问它。

## 安全审计

`openclaw security audit` 将以**严重**严重性发现标记受信任代理认证。这是有意为之的——它提醒你将安全委托给了你的代理设置。

审计检查：

- 基本 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- 空的 `allowUsers`（允许任何已验证用户）
- 同主机代理源的已启用 `allowLoopback`
- 暴露的 Control UI 表面上的通配符或缺少浏览器来源策略

## 故障排除

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求不是来自 `gateway.trustedProxies` 中的 IP。检查：

    - 代理 IP 是否正确？（Docker 容器 IP 可能会更改。）
    - 你的代理前面是否有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒绝了环回源受信任代理请求。

    检查：

    - 代理是否从 `127.0.0.1` / `::1` 连接？
    - 你是否尝试对同主机环回反向代理使用受信任代理认证？

    修复：

    - 对不经过代理的内部同主机客户端优先使用令牌/密码认证，或
    - 通过非环回受信任代理地址路由并将该 IP 保存在 `gateway.trustedProxies` 中，或
    - 对于有意的同主机反向代理，设置 `gateway.auth.trustedProxy.allowLoopback = true`，将环回地址保存在 `gateway.trustedProxies` 中，并确保代理剥离或覆盖身份标头。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用户标头为空或缺失。检查：

    - 你的代理是否配置为传递身份标头？
    - 标头名称是否正确？（不区分大小写，但拼写很重要）
    - 用户是否真的在代理处经过了身份验证？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    必需的标头不存在。检查：

    - 你的代理对这些特定标头的配置。
    - 标头是否在链中的某处被剥离。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用户已验证但不在 `allowUsers` 中。添加他们或删除允许列表。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理认证成功，但浏览器 `Origin` 标头未通过 Control UI 来源检查。

    检查：

    - `gateway.controlUi.allowedOrigins` 是否包含确切的浏览器来源。
    - 你是否没有依赖通配符来源，除非你有意想要允许全部行为。
    - 如果你有意使用 Host 标头回退模式，`gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 是有意设置的。

  </Accordion>
  <Accordion title="WebSocket 仍然失败">
    确保你的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`、`Connection: upgrade`）。
    - 在 WebSocket 升级请求上传递身份标头（而不仅仅是 HTTP）。
    - 没有 WebSocket 连接的单独认证路径。

  </Accordion>
</AccordionGroup>

## 从令牌认证迁移

如果你从令牌认证迁移到受信任代理：

<Steps>
  <Step title="配置代理">
    配置你的代理来对用户进行身份验证并传递标头。
  </Step>
  <Step title="独立测试代理">
    独立测试代理设置（带标头的 curl）。
  </Step>
  <Step title="更新 OpenClaw 配置">
    使用受信任代理认证更新 OpenClaw 配置。
  </Step>
  <Step title="重启网关">
    重启网关。
  </Step>
  <Step title="测试 WebSocket">
    从 Control UI 测试 WebSocket 连接。
  </Step>
  <Step title="审计">
    运行 `openclaw security audit` 并审查发现。
  </Step>
</Steps>

## 相关链接

- [配置](/gateway/configuration) — 配置参考
- [远程访问](/gateway/remote) — 其他远程访问模式
- [安全](/gateway/security) — 完整安全指南
- [Tailscale](/gateway/tailscale) — 仅 tailnet 访问的更简单替代方案
