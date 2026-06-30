.PHONY: help install setup dev run build check test format lint clean

# 默认目标
help:
	@echo "OpenClaw 源码运行工具"
	@echo ""
	@echo "用法:"
	@echo "  make dev         启动开发模式（自动安装依赖、初始化配置）"
	@echo "  make run         运行 openclaw CLI（可传 ARGS=\"--help\"）"
	@echo "  make build       构建项目"
	@echo "  make check       增量检查（类型/格式/架构）"
	@echo "  make test        增量测试"
	@echo "  make format      格式化代码"
	@echo "  make lint        代码检查"
	@echo "  make clean       清理构建产物"

# pnpm-lock.yaml 变化时才重新安装，其他情况跳过
node_modules/.modules.yaml: pnpm-lock.yaml
	pnpm install
	@touch $@

install: node_modules/.modules.yaml

setup: node_modules/.modules.yaml
	pnpm openclaw setup

# make dev 自动完成：安装依赖 → 初始化配置 → 启动热重载 → 打开浏览器
dev: node_modules/.modules.yaml
	pnpm openclaw setup
	@(sleep 7 && open "http://127.0.0.1:$${OPENCLAW_GATEWAY_PORT:-18789}/?token=$$(node -e "process.stdout.write(require(require('os').homedir()+'/.openclaw/openclaw.json').gateway.auth.token)")") &
	OPENCLAW_DEBUG_PROXY_ENABLED=1 pnpm gateway:watch:raw

# 传参运行，例: make run ARGS="--help"
run:
	pnpm openclaw $(ARGS)

build:
	pnpm build

check:
	pnpm check:changed

test:
	pnpm test:changed

format:
	pnpm format

lint:
	pnpm lint

clean:
	rm -rf dist
