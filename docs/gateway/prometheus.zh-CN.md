---
summary: "通过 diagnostics-prometheus 插件将 OpenClaw 诊断作为 Prometheus 文本指标暴露"
title: "Prometheus 指标"
sidebarTitle: "Prometheus"
read_when:
  - 你想让 Prometheus、Grafana、VictoriaMetrics 或其他抓取器收集 OpenClaw 网关指标
  - 你需要 Prometheus 指标名称和标签策略来构建仪表板或警报
  - 你想要不运行 OpenTelemetry 收集器的指标
---

OpenClaw 可以通过官方 `diagnostics-prometheus` 插件暴露诊断指标。它监听受信任的内部诊断并在以下地址渲染 Prometheus 文本端点：

```text
GET /api/diagnostics/prometheus
```

Content type 是 `text/plain; version=0.0.4; charset=utf-8`，即标准的 Prometheus 展示格式。

<Warning>
该路由使用网关认证（操作员范围）。不要将其作为公开的未认证 `/metrics` 端点暴露。通过你用于其他操作员 API 的相同认证路径抓取它。
</Warning>

有关追踪、日志、OTLP 推送和 OpenTelemetry GenAI 语义属性，请参阅 [OpenTelemetry 导出](/gateway/opentelemetry)。

## 快速入门

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install clawhub:@openclaw/diagnostics-prometheus
    ```
  </Step>
  <Step title="启用插件">
    <Tabs>
      <Tab title="配置">
        ```json5
        {
          plugins: {
            allow: ["diagnostics-prometheus"],
            entries: {
              "diagnostics-prometheus": { enabled: true },
            },
          },
          diagnostics: {
            enabled: true,
          },
        }
        ```
      </Tab>
      <Tab title="CLI">
        ```bash
        openclaw plugins enable diagnostics-prometheus
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="重启网关">
    HTTP 路由在插件启动时注册，所以启用后需要重载。
  </Step>
  <Step title="抓取受保护路由">
    发送你的操作员客户端使用的相同网关认证：

    ```bash
    curl -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
      http://127.0.0.1:18789/api/diagnostics/prometheus
    ```

  </Step>
  <Step title="配置 Prometheus">
    ```yaml
    # prometheus.yml
    scrape_configs:
      - job_name: openclaw
        scrape_interval: 30s
        metrics_path: /api/diagnostics/prometheus
        authorization:
          credentials_file: /etc/prometheus/openclaw-gateway-token
        static_configs:
          - targets: ["openclaw-gateway:18789"]
    ```
  </Step>
</Steps>

<Note>
需要 `diagnostics.enabled: true`。没有它，插件仍然注册 HTTP 路由，但没有诊断事件流入导出器，所以响应是空的。
</Note>

## 导出的指标

| 指标                                          | 类型   | 标签                                                                                      |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `openclaw_run_completed_total`                | 计数器 | `channel`、`model`、`outcome`、`provider`、`trigger`                                      |
| `openclaw_run_duration_seconds`               | 直方图 | `channel`、`model`、`outcome`、`provider`、`trigger`                                      |
| `openclaw_model_call_total`                   | 计数器 | `api`、`error_category`、`model`、`outcome`、`provider`、`transport`                      |
| `openclaw_model_call_duration_seconds`        | 直方图 | `api`、`error_category`、`model`、`outcome`、`provider`、`transport`                      |
| `openclaw_model_tokens_total`                 | 计数器 | `agent`、`channel`、`model`、`provider`、`token_type`                                     |
| `openclaw_gen_ai_client_token_usage`          | 直方图 | `model`、`provider`、`token_type`                                                         |
| `openclaw_model_cost_usd_total`               | 计数器 | `agent`、`channel`、`model`、`provider`                                                   |
| `openclaw_tool_execution_total`               | 计数器 | `error_category`、`outcome`、`params_kind`、`tool`                                        |
| `openclaw_tool_execution_duration_seconds`    | 直方图 | `error_category`、`outcome`、`params_kind`、`tool`                                        |
| `openclaw_harness_run_total`                  | 计数器 | `channel`、`error_category`、`harness`、`model`、`outcome`、`phase`、`plugin`、`provider` |
| `openclaw_harness_run_duration_seconds`       | 直方图 | `channel`、`error_category`、`harness`、`model`、`outcome`、`phase`、`plugin`、`provider` |
| `openclaw_message_processed_total`            | 计数器 | `channel`、`outcome`、`reason`                                                            |
| `openclaw_message_processed_duration_seconds` | 直方图 | `channel`、`outcome`、`reason`                                                            |
| `openclaw_message_delivery_total`             | 计数器 | `channel`、`delivery_kind`、`error_category`、`outcome`                                   |
| `openclaw_message_delivery_duration_seconds`  | 直方图 | `channel`、`delivery_kind`、`error_category`、`outcome`                                   |
| `openclaw_queue_lane_size`                    | 量规   | `lane`                                                                                    |
| `openclaw_queue_lane_wait_seconds`            | 直方图 | `lane`                                                                                    |
| `openclaw_session_state_total`                | 计数器 | `reason`、`state`                                                                         |
| `openclaw_session_queue_depth`                | 量规   | `state`                                                                                   |
| `openclaw_memory_bytes`                       | 量规   | `kind`                                                                                    |
| `openclaw_memory_rss_bytes`                   | 直方图 | 无                                                                                        |
| `openclaw_memory_pressure_total`              | 计数器 | `level`、`reason`                                                                         |
| `openclaw_telemetry_exporter_total`           | 计数器 | `exporter`、`reason`、`signal`、`status`                                                  |
| `openclaw_prometheus_series_dropped_total`    | 计数器 | 无                                                                                        |

## 标签策略

<AccordionGroup>
  <Accordion title="有界、低基数标签">
    Prometheus 标签保持有界和低基数。导出器不发出原始诊断标识符，如 `runId`、`sessionKey`、`sessionId`、`callId`、`toolCallId`、消息 ID、聊天 ID 或提供商请求 ID。

    标签值被删减，必须符合 OpenClaw 的低基数字符策略。不符合策略的值被替换为 `unknown`、`other` 或 `none`，取决于指标。

  </Accordion>
  <Accordion title="序列上限和溢出统计">
    导出器将内存中保留的时间序列上限设置为计数器、量规和直方图合计 **2048** 个序列。超过该上限的新序列被丢弃，每次 `openclaw_prometheus_series_dropped_total` 递增一次。

    将此计数器作为上游属性泄露高基数值的硬信号来监控。导出器永远不会自动提升上限；如果它上升，修复来源而不是禁用上限。

  </Accordion>
  <Accordion title="Prometheus 输出中永远不出现的内容">
    - 提示文本、响应文本、工具输入、工具输出、系统提示
    - 原始提供商请求 ID（仅有界哈希，适用时在 span 上 — 从不在指标上）
    - 会话键和会话 ID
    - 主机名、文件路径、密钥值

  </Accordion>
</AccordionGroup>

## PromQL 配方

```promql
# 每分钟令牌，按提供商分割
sum by (provider) (rate(openclaw_model_tokens_total[1m]))

# 过去一小时的花费（USD），按模型
sum by (model) (increase(openclaw_model_cost_usd_total[1h]))

# 第 95 百分位模型运行持续时间
histogram_quantile(
  0.95,
  sum by (le, provider, model)
    (rate(openclaw_run_duration_seconds_bucket[5m]))
)

# 队列等待时间 SLO（95p 低于 2s）
histogram_quantile(
  0.95,
  sum by (le, lane) (rate(openclaw_queue_lane_wait_seconds_bucket[5m]))
) < 2

# 丢弃的 Prometheus 序列（基数警报）
increase(openclaw_prometheus_series_dropped_total[15m]) > 0
```

<Tip>
对于跨提供商仪表板，优先使用 `gen_ai_client_token_usage`：它遵循 OpenTelemetry GenAI 语义约定，与来自非 OpenClaw GenAI 服务的指标一致。
</Tip>

## 在 Prometheus 和 OpenTelemetry 导出之间选择

OpenClaw 独立支持两种接口。你可以运行其中一个、两个，或都不运行。

<Tabs>
  <Tab title="diagnostics-prometheus">
    - **拉取**模型：Prometheus 抓取 `/api/diagnostics/prometheus`。
    - 不需要外部收集器。
    - 通过正常的网关认证进行认证。
    - 接口仅限于指标（无追踪或日志）。
    - 最适合已经在 Prometheus + Grafana 上标准化的技术栈。

  </Tab>
  <Tab title="diagnostics-otel">
    - **推送**模型：OpenClaw 通过 OTLP/HTTP 发送到收集器或 OTLP 兼容后端。
    - 接口包括指标、追踪和日志。
    - 当你需要两者时，通过 OpenTelemetry Collector（`prometheus` 或 `prometheusremotewrite` 导出器）桥接到 Prometheus。
    - 完整目录参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

  </Tab>
</Tabs>

## 故障排除

<AccordionGroup>
  <Accordion title="响应体为空">
    - 检查配置中的 `diagnostics.enabled: true`。
    - 使用 `openclaw plugins list --enabled` 确认插件已启用并加载。
    - 生成一些流量；计数器和直方图仅在至少一个事件后才发出行。

  </Accordion>
  <Accordion title="401 / 未授权">
    端点需要网关操作员范围（带 `gatewayRuntimeScopeSurface: "trusted-operator"` 的 `auth: "gateway"`）。使用 Prometheus 用于任何其他网关操作员路由的相同令牌或密码。没有公开的未认证模式。
  </Accordion>
  <Accordion title="`openclaw_prometheus_series_dropped_total` 正在上升">
    新属性超过了 **2048** 序列上限。检查最近的指标以查找意外高基数标签，并在来源修复它。导出器有意丢弃新序列而不是悄悄重写标签。
  </Accordion>
  <Accordion title="Prometheus 在重启后显示过时序列">
    插件仅在内存中保持状态。网关重启后，计数器重置为零，量规从下一个报告值重新开始。使用 PromQL `rate()` 和 `increase()` 来干净地处理重置。
  </Accordion>
</AccordionGroup>

## 相关链接

- [诊断导出](/gateway/diagnostics) — 用于支持捆绑包的本地诊断 zip
- [健康和就绪性](/gateway/health) — `/healthz` 和 `/readyz` 探测
- [日志](/logging) — 基于文件的日志记录
- [OpenTelemetry 导出](/gateway/opentelemetry) — 用于追踪、指标和日志的 OTLP 推送
