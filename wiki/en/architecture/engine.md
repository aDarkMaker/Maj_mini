# Engine

The engine lives in `backend/`, written in Zig — a pure, immutable state machine with no I/O beyond its stdio protocol. The frontend drives it as a subprocess over NDJSON via `src/engine/client.ts`.

## Module dependencies

```
types.zig → rule.zig → (players.zig / score.zig) → gameover.zig
                            ↘ init.zig / simulate.zig
protocol.zig + main.zig  # stdio NDJSON dispatch
```

## Modules

### types.zig

Core data types: suit, tile index, `PlayerState`, `Game`, `Meld`. The phase state machine: `draw → discard → respond`.

### rule.zig

Win-detection core. `canWin` checks whether 14 tiles decompose into a standard hand (4 sets + 1 pair) or seven pairs, with que-men constraints. `validDiscards` enforces que-men: only the missing suit may be discarded while any remain.

### players.zig

Player actions: `draw`/`discard`/`pong`/`kong` (concealed/exposed/added, with replacement draw)/`win` (self-draw/discard-win). All return a new `Game`.

### score.zig

Fan counting and multipliers. `winMultiplierFromOthers` recognizes qing-yi-se / qi-dui / da-dui-zi / long-qi-dui; the multiplier is `2^(fan-1)` capped at 8; self-draw adds 1.

### gameover.zig

Round-end detection and settlement. `isRoundOver` detects three wins or liuju; `settle` handles blood-battle settlement plus liuju check-called / hua-zhu payouts.

### init.zig

108 tiles (3×9×4) shuffle and deal. A seeded LCG gives reproducible shuffles; `initGame` deals 14 to the dealer, 13 to others, and assigns que-men.

### simulate.zig

Native whole-round rollout fast path: simulates one full game inside the engine and returns the expected net score of the first discard, avoiding per-action round trips.

::: info Immutability
Every action returns a new `Game`; the input is never mutated. This makes replay, rollout and tests naturally safe.
:::
