# 环境搭建

## 前置依赖

- [Bun](https://bun.sh) ≥ 1.3（游戏引擎、数据生成）
- [uv](https://docs.astral.sh/uv/) + Python ≥ 3.13（训练、推理）

## 安装

```bash
git clone https://github.com/aDarkMaker/Maj_mini.git
cd Maj_mini

bun install                # TS 依赖
uv sync --project agent    # Python 依赖（torch、numpy）
```

## 验证

```bash
bun run typecheck          # 类型检查通过
bun run test               # 41 用例全绿
bun run demo               # 点炮/自摸 demo 通过
```

## 目录结构

```
Maj_mini/
├── src/
│   ├── ts/                # 引擎核心
│   ├── ai/                # rollout / 推理桥接
│   ├── test/              # 单元测试
│   └── server.ts          # 对局入口
├── agent/                 # Python 训练与模型
├── wiki/                  # VitePress 文档站
├── .github/               # CI / issue 模板
└── Makefile               # 常用命令
```