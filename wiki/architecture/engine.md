# 引擎

引擎位于 `backend/`，用 Zig 实现，是纯逻辑、不可变的状态机，无任何 I/O（除了 stdio 协议）。前端通过 `src/engine/client.ts` 以子进程 + NDJSON 调用。

## 模块依赖

```
types.zig → rule.zig → (players.zig / score.zig) → gameover.zig
                            ↘ init.zig / simulate.zig
protocol.zig + main.zig  # stdio NDJSON 调度
```

## 各模块

### types.zig

核心数据结构：花色、牌索引、`PlayerState`、`Game`、`Meld`、phase 三态机：`draw → discard → respond`。

### rule.zig

胡牌判定核心。`canWin` 检查 14 张牌能否分解为标准牌型（4 搭子 + 1 对）或七对，支持定缺约束。`validDiscards` 实现定缺强制：有缺门牌时只能打缺门。

### players.zig

玩家行动：`draw`/`discard`/`pong`/`kong`（暗杠/明杠/加杠，杠后补牌）/`win`（自摸/点炮）。全部返回新的 `Game` 状态。

### score.zig

番数与倍数换算。`winMultiplierFromOthers` 识别清一色/七对/大对子/龙七对；倍数 = `2^(fan-1)` 封顶 8；自摸加 1。

### gameover.zig

终局判定与结算。`isRoundOver` 判定三家胡或流局；`settle` 处理血战胡牌结算 + 流局查叫/花猪赔付。

### init.zig

108 张牌（3×9×4）洗牌发牌。种子化 LCG 实现可复现洗牌；`initGame` 发 14 给庄、13 给闲家并分配定缺。

### simulate.zig

原生整局 rollout 快路径：在引擎内直接模拟一局到结束，返回首打的期望净分，避免逐动作跨进程往返。

::: info 不可变性
所有行动函数返回新的 `Game` 状态，输入永不改变。这让回放、rollout、测试都天然安全。
:::
