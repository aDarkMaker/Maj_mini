# 快速开始

## 安装

```bash
bun install                # TS 依赖
bun run build:engine       # 编译 Zig 引擎
uv sync --project agent    # Python 依赖
```

## 校验

```bash
bun run typecheck          # 类型检查
bun run test:engine        # Zig 引擎单元测试
bun run test               # 前端单元测试
bun run demo               # 逻辑冒烟（固定牌局）
```

## 跑一局对局

```bash
bun run game               # 终端可视化，bot 走真实模型推理
```

## 数据 → 训练 → 推理

```bash
# 1. 生成可复现训练数据
bun run train:data:repro        # → agent/dataset.jsonl

# 2. 训练 Q 网络
cd agent
uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward --patience 20 \
  --out discard_q.pt

# 3. 用训练好的模型对战
cd ..
bun run game
```

::: tip 首次运行
`bun run game` 首次会较慢——bot 通过子进程调用 `predict.py` 做推理。确保已执行 `uv sync --project agent` 生成 `agent/.venv`。
:::
