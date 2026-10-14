# 环境搭建

## 前置依赖

- [Zig](https://ziglang.org/) 0.17.0（规则引擎）
- [Bun](https://bun.sh) ≥ 1.3（前端编排、数据生成）
- [uv](https://docs.astral.sh/uv/) + Python ≥ 3.13（训练、推理）

## 安装

```bash
git clone https://github.com/aDarkMaker/Maj_mini.git
cd Maj_mini

bun install                # TS 依赖
bun run build:engine       # 编译 Zig 引擎
uv sync --project agent    # Python 依赖（torch、numpy）
```

## 验证

```bash
bun run typecheck          # 类型检查通过
bun run test:engine        # Zig 引擎单测通过
bun run test               # 前端单测通过
bun run demo               # 点炮/自摸 demo 通过
```

## 目录结构

```
Maj_mini/
├── backend/               # Zig 规则引擎
│   └── src/               # rule / players / score / gameover / init / simulate / protocol
├── src/
│   ├── engine/            # 引擎 stdio 客户端
│   ├── ai/                # 数据生成 / 特征 / 推理桥接 / 显示
│   ├── ts/                # 共享 DTO 类型
│   ├── test/              # 前端单测与固定牌局 demo
│   └── server.ts          # 对局入口
├── agent/                 # Python 训练与模型
├── wiki/                  # VitePress 文档站
├── .github/               # CI / issue 模板
└── Makefile               # 常用命令
```
