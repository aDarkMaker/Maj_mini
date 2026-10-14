# Product

Maj_Mini is a **playground and AI-training framework** for Sichuan Mahjong (que-men / blood battle).

It has three parts:

- **Rule engine** (`backend/`): the full Sichuan-Mahjong ruleset in Zig — a pure, immutable state machine usable standalone for rule checks or game simulation, exposed over a stdio NDJSON protocol.
- **Frontend orchestration** (`src/`): Bun + TypeScript handles round orchestration, terminal display, dataset generation and the inference bridge.
- **AI training** (`src/ai/` + `agent/`): supervised data generated via rollout enumeration, then a PyTorch Q-network learns which tile to discard.

## Core mechanics

- **que-men**: each player is forced into one missing suit at the start; the hand must hold none of that suit to win, and while any missing-suit tile remains it must be played.
- **Blood battle**: after a win the remaining players keep playing until three win or the wall runs out; settled players no longer pay.
- **Liuju settlement**: when the wall is empty and fewer than three have won, the unsettled players are scored by check-called (no-ting pays ting) and hua-zhu (three-suit pays non-hua-zhu).

## Use cases

- Learn/verify Sichuan-Mahjong rule logic
- Train a bot that plays mahjong
- A teaching playground for supervised / reinforcement learning

::: tip
Engine and training are fully decoupled: you can run the engine alone, or use a trained model for inference — they bridge over the NDJSON protocol (engine) and JSON (via `predict.py`).
:::
