# Maj_Mini

[中文](./README.md) | **English**

A playground and AI-training framework for **Sichuan Mahjong** (川麻) with two
signature rules: 缺门 (que-men / forced missing suit) and 血战到底 (blood battle).

- **Game engine**: Zig full rules (win detection, que-men, pong/kong/win, fan, 流局), exposed over an NDJSON stdio protocol.
- **Frontend**: Bun + TypeScript orchestrates rounds, terminal display and dataset generation.
- **AI**: rollout-simulated supervised data trained by a PyTorch Q-network.

## Overview

```mermaid
flowchart LR
    TS[Bun/TS frontend] -->|NDJSON/stdio| ZIG[Zig engine]
    TS --> Gen[rollout data]
    Gen --> Data[dataset.jsonl]
    Data --> Train[PyTorch Q-Net]
    Train --> Model[discard_q.pt]
    Model --> Predict[predict.py]
    Predict --> TS
```

## Quick start

```bash
bun install
bun run build:engine   # compile the Zig engine
uv sync --project agent
bun run typecheck      # type-check
bun run test:engine    # Zig engine unit tests
bun run test           # frontend unit tests
bun run demo           # logic smoke test
bun run game           # bot-vs-bot round (terminal)
```

## Data → train → inference

```bash
bun run train:data:repro        # reproducible dataset (seed 42)
cd agent && uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward --patience 20 \
  --out discard_q.pt
bun run game
```

## Concepts

- **TileId**: `w1` `t5` `b9` — the 27 tile kinds.
- **queSuit**: the missing suit to clear before a win.
- **Feature vector**: 30 dims = 27 tile counts + 3 que-suit one-hot.
- **advantage**: rollout-estimated expected score; learn which discard relative to the hand.

## Layout

```
Maj_mini/
├── backend/            # Zig rule engine (subprocess + NDJSON)
├── src/
│   ├── engine/         # stdio engine client
│   ├── ai/             # dataset gen / features / inference bridge / display
│   ├── ts/             # shared DTO types
│   └── server.ts       # round entry point
├── agent/              # Python training and model
├── wiki/               # VitePress docs site
└── .github/            # CI / issue templates
```

## Doc index

- [docs/architecture.md](./docs/architecture.md) — internal design
- [docs/deployment.md](./docs/deployment.md) — deployment guide

## License

MIT — see [LICENSE](../LICENSE). © 2026 aDarkMaker
