# Data Flow

## Game main loop

```mermaid
sequenceDiagram
    participant S as server.ts
    participant C as engine/client.ts
    participant E as maj_engine (Zig)

    S->>C: engine.init(dealer, seed)
    C->>E: NDJSON {"cmd":"init"}
    E-->>C: GameState
    C-->>S: GameState
    loop until three wins or liuju
        S->>C: draw / discard / pong / kong / win
        C->>E: NDJSON request
        E-->>C: new GameState
        C-->>S: new GameState
    end
    S->>C: engine.settle(state, summary, base)
    C->>E: NDJSON {"cmd":"settle"}
    E-->>C: net / reason
    C-->>S: net / reason
```

Each request gets its own arena allocator on the engine side, reset afterwards to keep memory flat.

## Inference call

When the bot must discard during the `discard` phase:

```mermaid
sequenceDiagram
    participant S as server.ts
    participant C as engine/client.ts
    participant B as bot.ts
    participant PY as predict.py

    S->>C: engine.validDiscards(hand, queSuit)
    C-->>S: validTiles
    S->>B: botDiscard(state, who, validDiscards)
    B->>B: handToVec(hand, queSuit) → 30-dim
    B->>PY: spawn, JSON over stdin
    PY-->>B: {"discard_idx": N}
    B-->>S: tileId
```

## Rollout data generation

```mermaid
flowchart TD
    H[Sample 14-tile hand] --> Q[Assign que-suit]
    Q --> D[engine.validDiscards enumerates legal discards]
    D --> R[engine.simulate runs N rollouts per discard]
    R --> M[Average net score = reward]
    M --> J[Write dataset.jsonl]
```

`engine.simulate` plays a whole game to completion inside the Zig engine (a native fast path), avoiding per-action round trips. Each rollout uses seeded random opponents and records player 0's net score; a fixed seed makes the data reproducible.
