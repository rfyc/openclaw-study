---
name: openhue
description: 通过 OpenHue CLI 控制 Philips Hue 灯光和场景。
homepage: https://www.openhue.io/cli
metadata:
  {
    "openclaw":
      {
        "emoji": "💡",
        "requires": { "bins": ["openhue"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "openhue/cli/openhue-cli",
              "bins": ["openhue"],
              "label": "Install OpenHue CLI (brew)",
            },
          ],
      },
  }
---

# OpenHue CLI

使用 `openhue` 通过 Hue Bridge 控制 Philips Hue 灯光和场景。

## 适用场景

适合使用本技能的情况：

- "打开/关闭灯光"
- "调暗客厅灯光"
- "设置场景"或"电影模式"
- 控制特定的 Hue 房间或区域
- 调整亮度、颜色或色温

## 不适用场景

不适合使用本技能的情况：

- 非 Hue 智能设备（其他品牌）→ 不支持
- HomeKit 场景或快捷方式 → 使用 Apple 生态系统
- 电视或娱乐系统控制
- 恒温器或暖通空调
- 智能插座（除非是 Hue 智能插座）

## 常用命令

### 列出资源

```bash
openhue get light       # 列出所有灯光
openhue get room        # 列出所有房间
openhue get scene       # 列出所有场景
```

### 控制灯光

```bash
# 打开/关闭
openhue set light "Bedroom Lamp" --on
openhue set light "Bedroom Lamp" --off

# 亮度（0-100）
openhue set light "Bedroom Lamp" --on --brightness 50

# 色温（暖到冷：153-500 mirek）
openhue set light "Bedroom Lamp" --on --temperature 300

# 颜色（按名称或十六进制）
openhue set light "Bedroom Lamp" --on --color red
openhue set light "Bedroom Lamp" --on --rgb "#FF5500"
```

### 控制房间

```bash
# 关闭整个房间
openhue set room "Bedroom" --off

# 设置房间亮度
openhue set room "Bedroom" --on --brightness 30
```

### 场景

```bash
# 激活场景
openhue set scene "Relax" --room "Bedroom"
openhue set scene "Concentrate" --room "Office"
```

## 快速预设

```bash
# 睡前（暖光调暗）
openhue set room "Bedroom" --on --brightness 20 --temperature 450

# 工作模式（明亮冷光）
openhue set room "Office" --on --brightness 100 --temperature 250

# 电影模式（调暗）
openhue set room "Living Room" --on --brightness 10
```

## 注意事项

- Bridge 必须在本地网络上
- 首次运行需要按下 Hue Bridge 上的按钮进行配对
- 颜色仅适用于支持彩色的灯泡（不适用于纯白灯泡）
