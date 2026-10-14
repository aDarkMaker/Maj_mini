# Use Case Scenarios

## 1. Verify rule logic

Use the engine client standalone for win detection, no training needed:

```ts
import { engine } from './engine/client';

const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9', 't9'];
await engine.canWin({ hand, melds: [], queSuit: 'b' }); // true
```

## 2. Play a full round

```bash
bun run game
```

Terminal-visualized: four-player que-men, draw/discard/pong/kong/win, bot uses real model inference, final scoreboard.

## 3. Train a stronger AI

```bash
make data-repro          # generate more data (raise params)
make train               # train
bun run game             # play with the new model
```

More data → smarter model. `--relative-advantage` is the recommended combo.

## 4. Reproduce a game

```ts
import { engine } from './engine/client';

const state = await engine.init(0, 42); // fixed seed 42 → identical every run
```

Seeded shuffling makes any game reproducible — useful for debugging and comparison.

## 5. Unit tests

```bash
bun run test:engine      # Zig engine: rules, actions, settlement, init
bun run test             # frontend: feature vectors etc.
```

Engine cases cover rule / players / score / gameover / init; frontend cases cover the features encoding.
