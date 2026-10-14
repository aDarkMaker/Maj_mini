# Development Setup

## Prerequisites

- [Zig](https://ziglang.org/) 0.17.0 (rule engine)
- [Bun](https://bun.sh) ≥ 1.3 (frontend orchestration, data generation)
- [uv](https://docs.astral.sh/uv/) + Python ≥ 3.13 (training, inference)

## Install

```bash
git clone https://github.com/aDarkMaker/Maj_mini.git
cd Maj_mini

bun install                # TS deps
bun run build:engine       # compile the Zig engine
uv sync --project agent    # Python deps (torch, numpy)
```

## Verify

```bash
bun run typecheck          # type-check passes
bun run test:engine        # Zig engine tests pass
bun run test               # frontend tests pass
bun run demo               # discard-win / self-draw demo passes
```

## Layout

```
Maj_mini/
├── backend/               # Zig rule engine
│   └── src/               # rule / players / score / gameover / init / simulate / protocol
├── src/
│   ├── engine/            # stdio engine client
│   ├── ai/                # dataset gen / features / inference bridge / display
│   ├── ts/                # shared DTO types
│   ├── test/              # frontend tests and fixed-hand demo
│   └── server.ts          # game entry
├── agent/                 # Python training and model
├── wiki/                  # VitePress docs site
├── .github/               # CI / issue templates
└── Makefile               # common commands
```
