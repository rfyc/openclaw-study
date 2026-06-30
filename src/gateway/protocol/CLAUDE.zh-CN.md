# Gateway 协议边界

此目录定义了面向运营商客户端和节点的 Gateway 连线契约。

## 公共契约

- 文档：
  - `docs/gateway/protocol.md`
  - `docs/gateway/bridge-protocol.md`
  - `docs/concepts/architecture.md`
- 定义文件：
  - `src/gateway/protocol/schema.ts`
  - `src/gateway/protocol/schema/*.ts`
  - `src/gateway/protocol/index.ts`

## 边界规则

- 将 schema 变更视为协议变更，而非本地重构。
- 优先采用增量演进。如果变更不兼容，显式处理版本控制并更新所有受影响的客户端。
- 保持 schema、运行时验证器、文档、测试和生成的客户端产物同步。
- 新的 Gateway 方法、事件或负载字段应通过此处的类型化协议定义落地，而非在其他地方使用临时 JSON 结构。
- 保持协议模块以数据为中心且无循环依赖。不要将协议导出通过更重的 gateway 运行时或服务器方法辅助工具路由回去，以免使契约层面在导入时变得昂贵或依赖顺序。
