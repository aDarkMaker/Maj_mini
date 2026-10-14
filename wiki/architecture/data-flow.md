# 数据流

## 对局主循环

```mermaid
sequenceDiagram
    participant S as server.ts
    participant C as engine/client.ts
    participant E as maj_engine (Zig)

    S->>C: engine.init(dealer, seed)
    C->>E: NDJSON {"cmd":"init"}
    E-->>C: GameState
    C-->>S: GameState
    loop 直到三家胡或流局
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

引擎侧每个请求使用独立 arena 分配器，请求结束后重置，避免内存增长。

## 推理调用

bot 在 `discard` 阶段需要出牌时：

```mermaid
sequenceDiagram
    participant S as server.ts
    participant C as engine/client.ts
    participant B as bot.ts
    participant PY as predict.py

    S->>C: engine.validDiscards(hand, queSuit)
    C-->>S: validTiles
    S->>B: botDiscard(state, who, validDiscards)
    B->>B: handToVec(hand, queSuit) → 30 维
    B->>PY: spawn, JSON over stdin
    PY-->>B: {"discard_idx": N}
    B-->>S: tileId
```

## Rollout 数据生成

```mermaid
flowchart TD
    H[采样 14 张手牌] --> Q[分配定缺]
    Q --> D[engine.validDiscards 穷举合法出牌]
    D --> R[engine.simulate 每张出牌跑 N 次 rollout]
    R --> M[取平均净分 = reward]
    M --> J[写 dataset.jsonl]
```

`engine.simulate` 在 Zig 引擎内一次性模拟整局到结束（原生快路径），避免逐动作跨进程往返。每次 rollout 用种子化随机对手模拟一局，统计玩家 0 的净分；固定 seed 保证数据可复现。
