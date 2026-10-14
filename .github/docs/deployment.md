# Deployment

The project has **no web frontend yet** — it runs as a CLI game + Python training agent.
This deployment guide keeps things lightweight: no container runtime is required.

## Prerequisites

- [Zig](https://ziglang.org/) 0.17.0 (rule engine)
- [Bun](https://bun.sh) ≥ 1.3 (frontend orchestration / data generation)
- [uv](https://docs.astral.sh/uv/) + Python ≥ 3.13 (training + inference)

## Quick start

```bash
bun install            # install TS deps
bun run build:engine   # compile the Zig engine
bun run typecheck      # type-check
bun run test:engine    # engine unit tests
bun run demo           # logic smoke test
bun run game           # play one bot-vs-bot round (terminal)

cd agent
uv sync                # install Python deps (torch, numpy)
```

## Generate training data

```bash
bun run train:data             # 100 hands × 10 rollouts, random seed
bun run train:data:repro       # fixed seed 42 → reproducible
```

## Train the model

```bash
cd agent
uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward --patience 20 \
  --out discard_q.pt
```

## Run inference / play

```bash
bun run game   # bot automatically locates agent/.venv python
```

The bot locates the interpreter portably (POSIX `bin/python`, Windows `Scripts/python.exe`,
falling back to `uv run python`).

## CI

`.github/workflows/ci.yml` runs `typecheck`, `demo`, and a training smoke-test on every
push/PR to `main`.

## Layout

```
README.md                     # bilingual project README (GitHub auto-renders this)
backend/                      # Zig rule engine
.github/
├── docs/                     # extra documentation
│   ├── architecture.md       # internal design
│   └── deployment.md         # this guide
├── ISSUE_TEMPLATE/           # GitHub issue templates
└── workflows/               # CI + docs pipelines
Makefile                      # common task shortcuts
```
