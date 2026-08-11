# Engine

The engine lives in `src/ts/` — a pure, immutable state machine with no I/O.

## Module dependencies

```
types → rule → (players / score) → gameover
                     ↘ mahjong_init
```

## Modules

### types.ts
Core data types: `Suit`, `TileId`, `PlayerState`, `GameState`, `Meld`, `Result<T,E>`. The phase state machine: `draw → discard → respond`.

### rule.ts
Win-detection core. `canWin` checks whether 14 tiles decompose into a standard hand (4 sets + 1 pair) or seven pairs, with que-men constraints. `getValidDiscards` enforces que-men: only the missing suit may be discarded while any remain.

### players.ts
Player actions: `draw`/`discard`/`pong`/`kong` (concealed/exposed/added, with replacement draw)/`win` (self-draw/discard-win). All return new state via immer `produce`.

### score.ts
Fan counting and multipliers. `getBaseFan` recognizes qing-yi-se / qi-dui / da-dui-zi / long-qi-dui; `fanToMultiplier` = `2^(fan-1)` capped at 8; self-draw adds 1.

### gameover.ts
Round-end detection and settlement. `isRoundOver` detects three wins or liuju; `settleRound` handles blood-battle settlement plus liuju check-called / hua-zhu payouts.

### mahjong_init.ts
108 tiles (3×9×4) shuffle and deal. `shuffleWithSeed` uses an LCG for reproducible shuffles; `initGame` deals 14 to the dealer, 13 to others, and assigns que-men.

::: info Immutability
Every action returns a new `GameState`; the input is never mutated. This makes replay, rollout and tests naturally safe.
:::