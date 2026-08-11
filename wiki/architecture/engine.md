# 引擎

引擎位于 `src/ts/`，是纯逻辑、不可变的状态机，无任何 I/O。

## 模块依赖

```
types → rule → (players / score) → gameover
                     ↘ mahjong_init
```

## 各模块

### types.ts
核心数据结构：`Suit`、`TileId`、`PlayerState`、`GameState`、`Meld`、`Result<T,E>`。phase 三态机：`draw → discard → respond`。

### rule.ts
胡牌判定核心。`canWin` 检查 14 张牌能否分解为标准牌型（4 搭子 + 1 对）或七对，支持定缺约束。`getValidDiscards` 实现定缺强制：有缺门牌时只能打缺门。

### players.ts
玩家行动：`draw`/`discard`/`pong`/`kong`（暗杠/明杠/加杠，杠后补牌）/`win`（自摸/点炮）。全部通过 immer `produce` 返回新状态。

### score.ts
番数与倍数换算。`getBaseFan` 识别清一色/七对/大对子/龙七对；`fanToMultiplier` = `2^(fan-1)` 封顶 8；自摸加 1。

### gameover.ts
终局判定与结算。`isRoundOver` 判定三家胡或流局；`settleRound` 处理血战胡牌结算 + 流局查叫/花猪赔付。

### mahjong_init.ts
108 张牌（3×9×4）洗牌发牌。`shuffleWithSeed` 用 LCG 实现可复现洗牌；`initGame` 发 14 给庄、13 给闲家并分配定缺。

::: info 不可变性
所有行动函数返回新 `GameState`，输入永不改变。这让回放、rollout、测试都天然安全。
:::