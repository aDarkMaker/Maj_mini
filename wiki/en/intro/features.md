# Features

## Engine

| Capability          | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| Win detection       | Standard (4 sets + 1 pair) and seven-pairs, recursive enumeration                |
| que-men enforcement | `validDiscards` allows only the missing suit while it remains                    |
| Pong / kong / win   | Concealed, exposed, added kong with replacement draw; self-draw & discard-win    |
| Fan scoring         | Qing-yi-se / qi-dui / da-dui-zi / long-qi-dui, capped multiplier                 |
| Liuju settlement    | Check-called (no-ting pays ting), hua-zhu (three-suit pays non-hua-zhu)          |
| Reproducible games  | Seeded LCG shuffle — same seed → same deal                                       |
| Native rollout      | `simulate` plays a whole game inside the engine, avoiding per-action round trips |

## AI training

| Capability                  | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| Rollout data generation     | Enumerate legal discards × N simulations → average reward   |
| 30-dim features             | 27 tile counts + 3 que-suit one-hot                         |
| Relative-advantage target   | `--relative-advantage`, learns within-hand relative quality |
| Validation + early stopping | Prevents overfit, restores best weights                     |
| Cross-platform inference    | Bot auto-locates venv Python, falls back to `uv run`        |

## Engineering

- The Zig engine is decoupled from the frontend via a subprocess + NDJSON protocol
- TypeScript strict mode + `bun run typecheck`
- Engine tests (`bun run test:engine`) and frontend tests (`bun run test`)
- GitHub Actions CI (Zig engine build/test + typecheck + test + training smoke)
- Mermaid diagrams for architecture and data flow
