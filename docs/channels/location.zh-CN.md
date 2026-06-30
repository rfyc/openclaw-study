---
summary: "入站频道位置解析（Telegram/WhatsApp/Matrix）和上下文字段"
read_when:
  - 添加或修改频道位置解析
  - 在智能体提示或工具中使用位置上下文字段
title: "频道位置解析"
---

OpenClaw 将聊天频道共享的位置规范化为：

- 附加到入站正文的简洁坐标文本，以及
- 自动回复上下文有效负载中的结构化字段。频道提供的标签、地址和标题/注释通过共享的不受信任元数据 JSON 块渲染到提示中，而不是内联在用户正文中。

目前支持：

- **Telegram**（位置图钉 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（带 `geo_uri` 的 `m.location`）

## 文本格式

位置渲染为不带括号的友好行：

- 图钉：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 48.858844, 2.294351 ±12m`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

如果频道包含标签、地址或标题/注释，它将保存在上下文有效负载中，并在提示中显示为围栏的不受信任 JSON：

````text
Location (untrusted metadata):
```json
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
}
```
````

## 上下文字段

当位置存在时，这些字段会添加到 `ctx`：

- `LocationLat`（数字）
- `LocationLon`（数字）
- `LocationAccuracy`（数字，米；可选）
- `LocationName`（字符串；可选）
- `LocationAddress`（字符串；可选）
- `LocationSource`（`pin | place | live`）
- `LocationIsLive`（布尔值）
- `LocationCaption`（字符串；可选）

提示渲染器将 `LocationName`、`LocationAddress` 和 `LocationCaption` 视为不受信任的元数据，并通过用于其他频道上下文的相同有界 JSON 路径序列化它们。

## 频道说明

- **Telegram**：场所映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 填充 `LocationCaption`。
- **Matrix**：`geo_uri` 解析为图钉位置；海拔被忽略，`LocationIsLive` 始终为 false。

## 相关文档

- [位置命令（节点）](/nodes/location-command)
- [摄像头捕获](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
