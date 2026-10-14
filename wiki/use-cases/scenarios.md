# 使用场景

## 1. 验证规则逻辑

直接用引擎客户端跑胡牌判定，无需训练：

```ts
import { engine } from './engine/client';

const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9', 't9'];
await engine.canWin({ hand, melds: [], queSuit: 'b' }); // true
```

## 2. 跑一局完整对局

```bash
bun run game
```

终端可视化四家定缺、摸打碰杠胡，bot 走真实模型推理，最后结算积分。

## 3. 训练更强的 AI

```bash
make data-repro          # 生成更多数据（增大参数）
make train               # 训练
bun run game             # 用新模型对战
```

数据量越大，模型越聪明。`--relative-advantage` 是推荐组合。

## 4. 复现对局

```ts
import { engine } from './engine/client';

const state = await engine.init(0, 42); // 固定 seed 42，每次完全相同
```

种子化洗牌让任何对局可复现，便于调试与对比。

## 5. 单元测试

```bash
bun run test:engine      # Zig 引擎：规则、行动、结算、初始化
bun run test             # 前端：特征向量等
```

引擎用例覆盖 rule / players / score / gameover / init 五大模块；前端用例覆盖 features 特征编码。
