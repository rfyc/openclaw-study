---
name: weather
description: "获取地点的当前天气、降雨、温度和预报，或用于出行规划。"
homepage: https://wttr.in/:help
metadata:
  {
    "openclaw":
      {
        "emoji": "☔",
        "requires": { "bins": ["curl"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "curl",
              "bins": ["curl"],
              "label": "Install curl (brew)",
            },
          ],
      },
  }
---

# 天气 Skill

获取当前天气状况和预报。

## 使用时机

适用情况：

- "天气怎么样？"
- "今天/明天会下雨吗？"
- "[城市] 的气温"
- "本周天气预报"
- 出行规划天气查询

## 不适用时机

不适用情况：

- 历史天气数据 → 使用天气档案/API
- 气候分析或趋势 → 使用专业数据源
- 超本地微气候数据 → 使用本地传感器
- 恶劣天气预警 → 查看官方 NWS 来源
- 航空/海事天气 → 使用专业服务（METAR 等）

## 位置

天气查询时务必包含城市、地区或机场代码。

## 命令

### 当前天气

```bash
# 单行摘要
curl "wttr.in/London?format=3"

# 详细当前状况
curl "wttr.in/London?0"

# 指定城市
curl "wttr.in/New+York?format=3"
```

### 预报

```bash
# 3 天预报
curl "wttr.in/London"

# 一周预报
curl "wttr.in/London?format=v2"

# 指定天（0=今天，1=明天，2=后天）
curl "wttr.in/London?1"
```

### 格式选项

```bash
# 单行
curl "wttr.in/London?format=%l:+%c+%t+%w"

# JSON 输出
curl "wttr.in/London?format=j1"

# PNG 图片
curl "wttr.in/London.png"
```

### 格式代码

- `%c` — 天气状况 emoji
- `%t` — 温度
- `%f` — "体感温度"
- `%w` — 风速风向
- `%h` — 湿度
- `%p` — 降水量
- `%l` — 位置

## 快捷查询

**"天气怎么样？"**

```bash
curl -s "wttr.in/London?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity"
```

**"会下雨吗？"**

```bash
curl -s "wttr.in/London?format=%l:+%c+%p"
```

**"周末预报"**

```bash
curl "wttr.in/London?format=v2"
```

## 说明

- 无需 API 密钥（使用 wttr.in）
- 有频率限制；不要频繁发送请求
- 支持大多数全球城市
- 支持机场代码：`curl wttr.in/ORD`
