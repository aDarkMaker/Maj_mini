# Architecture

四川麻将（定缺 / 血战到底）是一个「游戏引擎 + AI 训练」双栈项目。

```mermaid
flowchart LR
    subgraph TS["TypeScript Engine (src/)"]
        RULE["rule.ts"]
        PLAY["players.ts"]
        SCORE["score.ts"]
        OVER["gameover.ts"]
        INIT["mahjong_init.ts"]
        SERVE["server.ts"]
    end

    subgraph PY["Python agent (agent/)"]
        GEN["dataset_gen.ts"]
        TRAIN["train.py + model.py"]
        PRED["predict.py"]
        BOT["bot.ts"]
    end

    MODEL["discard_q.pt"]
    GEN --> TRAIN --> MODEL --> BOT
    BOT --> PRED
    BOT --> RULE
    BOT --> PLAY
    BOT --> SCORE
    BOT --> OVER
    BOT --> INIT
    SERVE --> BOT
```

## Engine data flow

```mermaid
sequenceDiagram
    participant S as server.ts
    participant I as mahjong_init
    participant P as players
    participant R as rule
    participant Sco as score
    participant G as gameover

    S->>I: initGame(dealer, seed)
    I-->>S: GameState
    loop while !isRoundOver
        S->>P: draw / discard / pong / kong / win
        P->>R: canWin(hand, melds, ...queSuit?)
        R-->>P: boolean
        P-->>S: new GameState
    end
    S->>G: settleRound(state, summary, base)
    G->>Sco: getWinMultiplierFromOthers(...)
    G-->>S: net / reason
```

## Training pipeline

```mermaid
flowchart LR
    A["sampleHand14"] --> B["handToVec(+queSuit) → 30-dim"]
    B --> C["rollout per discard → reward"]
    C --> D["dataset.jsonl"]
    D --> E["train.py --relative-advantage"]
    E --> F["discard_q.pt"]
    F --> G["bot.ts → predict.py argmax"]
```

- The model is a supervised Q-network: **input** = 30 features (27 tile counts + 3
  que-suit flags), **output** = expected value per discard tile (27 actions). At
  inference the legal-discard mask zeroes invalid tiles, then argmax picks the play.