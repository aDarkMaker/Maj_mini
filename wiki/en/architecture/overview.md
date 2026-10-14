# Architecture Overview

Maj_Mini is a Zig rule engine + Bun/TS frontend + AI training project.

```mermaid
flowchart LR
    subgraph ZIG["Zig engine"]
        E[Rules engine]
    end
    subgraph TS["Bun/TS frontend"]
        C[engine/client.ts] --> E
        S[server.ts] --> C
        G[dataset_gen.ts] --> C
    end
    subgraph Data["Data"]
        D1[rollout sim] --> D2[dataset.jsonl]
    end
    subgraph AI["Python agent"]
        T[train.py] --> M[discard_q.pt]
        M --> P[predict.py]
    end
    S --> D1
    D2 --> T
    P --> S
```

## Modules

| Layer         | Path                                  | Responsibility                                                |
| ------------- | ------------------------------------- | ------------------------------------------------------------- |
| Engine core   | `backend/src/`                        | Types, rules, actions, scoring, settlement, init, rollout     |
| Engine client | `src/engine/`                         | Subprocess + NDJSON protocol client                           |
| AI layer      | `src/ai/`                             | Data generation, features, inference bridge, terminal display |
| Shared types  | `src/ts/`                             | DTO types shared across the boundary                          |
| Training      | `agent/`                              | PyTorch model, training, inference server                     |
| Entry         | `src/server.ts`                       | Terminal game main loop                                       |
| Tests         | `backend/src/tests.zig` + `src/test/` | Engine unit tests and frontend fixed-hand demo                |

## Stack

- **Engine**: Zig 0.17 (pure logic plus a stdio NDJSON protocol)
- **Frontend**: Bun + TypeScript + lodash
- **Training**: Python + PyTorch + numpy, env managed by uv
- **Bridge**: `engine/client.ts` drives the Zig subprocess; `bot.ts` spawns `predict.py`, JSON over stdin/stdout
