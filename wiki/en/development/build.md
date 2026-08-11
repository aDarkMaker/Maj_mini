# Build & Test

## TypeScript

```bash
bun run typecheck          # type-check
bun run test               # unit tests
bun run demo               # fixed-hand smoke
bun run game               # terminal game
```

## Data generation

```bash
bun run train:data                  # 100 hands × 10 rollouts, random seed
bun run train:data:repro            # fixed seed 42, reproducible
bun run src/ai/run_dataset_gen.ts 200 8 42   # custom params
```

## Python training

```bash
cd agent
uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward \
  --epochs 100 --batch 128 --patience 20 \
  --out discard_q.pt
```

## Inference check

```bash
echo '{"hand":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],"valid_mask":[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}' \
  | uv run python predict.py
```

## Makefile shortcuts

```bash
make install      # bun install
make typecheck
make test
make game
make data-repro   # reproducible data
make train        # training
```