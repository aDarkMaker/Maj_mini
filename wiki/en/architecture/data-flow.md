# Data Flow

## Game main loop

```mermaid
sequenceDiagram
    participant S as server.ts
    participant I as mahjong_init
    participant P as players
    participant R as rule
    participant G as gameover

    S->>I: initGame(dealer, seed)
    I-->>S: GameState
    loop until three wins or liuju
        S->>P: draw / discard / pong / kong / win
        P->>R: canWin(hand, melds, queSuit?)
        R-->>P: boolean
        P-->>S: new GameState
    end
    S->>G: settleRound(state, summary, base)
    G-->>S: net / reason
```

## Inference call

When the bot must discard during the `discard` phase:

```mermaid
sequenceDiagram
    participant S as server.ts
    participant B as bot.ts
    participant PY as predict.py

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
    Q --> D[Enumerate legal discards]
    D --> R[Run N rollouts per discard]
    R --> M[Average net score = reward]
    M --> J[Write dataset.jsonl]
```

Each rollout uses seeded random opponents to simulate a full game, then records player 0's net score. A fixed seed makes the data reproducible.