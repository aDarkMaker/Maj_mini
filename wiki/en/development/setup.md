# Development Setup

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (game engine, data generation)
- [uv](https://docs.astral.sh/uv/) + Python ≥ 3.13 (training, inference)

## Install

```bash
git clone https://github.com/aDarkMaker/Maj_mini.git
cd Maj_mini

bun install                # TS deps
uv sync --project agent    # Python deps (torch, numpy)
```

## Verify

```bash
bun run typecheck          # type-check passes
bun run test               # 41 cases green
bun run demo               # discard-win / self-draw demo passes
```

## Layout

```
Maj_mini/
├── src/
│   ├── ts/                # engine core
│   ├── ai/                # rollout / inference bridge
│   ├── test/              # unit tests
│   └── server.ts          # game entry
├── agent/                 # Python training and model
├── wiki/                  # VitePress docs site
├── .github/               # CI / issue templates
└── Makefile               # common commands
```