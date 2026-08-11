# Features

## Engine

| Capability | Description |
| --- | --- |
| Win detection | Standard (4 sets + 1 pair) and seven-pairs, recursive enumeration |
| que-men enforcement | `getValidDiscards` allows only the missing suit while it remains |
| Pong / kong / win | Concealed, exposed, added kong with replacement draw; self-draw & discard-win |
| Fan scoring | Qing-yi-se / qi-dui / da-dui-zi / long-qi-dui, capped multiplier |
| Liuju settlement | Check-called (no-ting pays ting), hua-zhu (three-suit pays non-hua-zhu) |
| Reproducible games | Seeded LCG shuffle — same seed → same deal |

## AI training

| Capability | Description |
| --- | --- |
| Rollout data generation | Enumerate legal discards × N simulations → average reward |
| 30-dim features | 27 tile counts + 3 que-suit one-hot |
| Relative-advantage target | `--relative-advantage`, learns within-hand relative quality |
| Validation + early stopping | Prevents overfit, restores best weights |
| Cross-platform inference | Bot auto-locates venv Python, falls back to `uv run` |

## Engineering

- TypeScript strict mode + `bun run typecheck`
- 41 unit tests (`bun run test`) covering six modules
- GitHub Actions CI (typecheck + test + training smoke)
- Mermaid diagrams for architecture and data flow