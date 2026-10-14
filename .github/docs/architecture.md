# Architecture

四川麻将（定缺 / 血战到底）是一个「Zig 规则引擎 + Bun/TS 前端 + AI 训练」的项目。

```mermaid
flowchart LR
    subgraph ZIG["Zig Engine (backend/)"]
        RULE["rule.zig"]
        PLAY["players.zig"]
        SCORE["score.zig"]
        OVER["gameover.zig"]
        INIT["init.zig"]
        SIM["simulate.zig"]
    end

    subgraph TS["Frontend (src/)"]
        CLIENT["engine/client.ts"]
        SERVE["server.ts"]
        GEN["ai/dataset_gen.ts"]
        DISP["ai/display.ts"]
        BOT["ai/bot.ts"]
    end

    subgraph PY["Python agent (agent/)"]
        TRAIN["train.py + model.py"]
        PRED["predict.py"]
    end

    MODEL["discard_q.pt"]
    CLIENT -->|NDJSON/stdio| ZIG
    SERVE --> CLIENT
    GEN --> CLIENT
    GEN --> TRAIN
    DISP --> CLIENT
    TRAIN --> MODEL --> PRED
    BOT --> PRED
    SERVE --> BOT
```

## Engine data flow

```mermaid
sequenceDiagram
    participant S as server.ts
    participant C as engine/client.ts
    participant E as maj_engine (Zig)

    S->>C: engine.init(dealer, seed)
    C->>E: {"id":1,"cmd":"init",...}
    E-->>C: GameState
    C-->>S: GameState
    loop while !isRoundOver
        S->>C: draw / discard / pong / kong / win
        C->>E: NDJSON request
        E-->>C: new GameState
        C-->>S: new GameState
    end
    S->>C: engine.settle(state, summary, base)
    C->>E: {"cmd":"settle",...}
    E-->>C: net / reason
    C-->>S: net / reason
```

每个请求在引擎侧使用独立 arena 分配器，请求结束后重置，避免内存增长。

## Training pipeline

```mermaid
flowchart LR
    A["sampleHand14"] --> B["handToVec(hand, queSuit) → 30-dim"]
    B --> C["engine.simulate per discard → reward"]
    C --> D["dataset.jsonl"]
    D --> E["train.py --relative-advantage"]
    E --> F["discard_q.pt"]
    F --> G["bot.ts → predict.py argmax"]
```

- The model is a supervised Q-network: **input** = 30 features (27 tile counts + 3
  que-suit flags), **output** = expected value per discard tile (27 actions). At
  inference the legal-discard mask zeroes invalid tiles, then argmax picks the play.
