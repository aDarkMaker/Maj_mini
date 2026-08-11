# Architecture

四川麻将（定缺 / 血战到底）是一个「游戏引擎 + AI 训练」双栈项目。

```mermaid
flowchart LR
    subgraph TS["TypeScript Engine (src/)"]
        ERR[types.ts — GameState / actions]
        RULE["rule.ts — win / que-men"]
        PLAY["players.ts — draw/discard/pong/kong/win"]
        SCORE["score.ts — fan & multiplier"]
        OVER["gameover.ts — settlement / 流局"]
        INIT["mahjong_init.ts — deck / deal"]
        SERVE["server.ts — terminal game loop"]
    end

    subgraph PY["Python agent (agent/)"]
        GEN["dataset_gen.ts → dataset.jsonl"]
        TRAIN["train.py + model.py (Q-Net)"]
        PRED["predict.py (inference)"]
        BOT["bot.ts spawns predict.py"]
    end

    TRAIN --> MODEL["discard_q.pt"]
    MODEL --> BOT
    BOT --> ENGAG
    ENGAG --> RULE & PLAY & SCORE & OVER & INIT
    GEN --> TRAIN
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
    S->>OVER: settleRound(state, summary, base)
    OVER->>Sco: getWinMultiplierFromOthers(...)
    OVER-->>S: net / reason
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