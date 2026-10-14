# Quick Start

## Install

```bash
bun install                # TS deps
bun run build:engine       # compile the Zig engine
uv sync --project agent    # Python deps
```

## Verify

```bash
bun run typecheck          # type-check
bun run test:engine        # Zig engine unit tests
bun run test               # frontend unit tests
bun run demo               # logic smoke (fixed hands)
```

## Play a round

```bash
bun run game               # terminal-visualized, bot uses real model inference
```

## Data → train → inference

```bash
# 1. Generate reproducible training data
bun run train:data:repro        # → agent/dataset.jsonl

# 2. Train the Q-network
cd agent
uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward --patience 20 \
  --out discard_q.pt

# 3. Play with the trained model
cd ..
bun run game
```

::: tip First run
`bun run game` is slower at first — the bot calls `predict.py` via a subprocess. Make sure you ran `uv sync --project agent` to create `agent/.venv`.
:::
