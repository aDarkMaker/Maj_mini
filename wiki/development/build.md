# 构建与测试

## Zig 引擎

```bash
bun run build:engine       # 编译引擎（ReleaseFast）
bun run test:engine        # 引擎单元测试
```

## 前端

```bash
bun run typecheck          # 类型检查
bun run test               # 前端单元测试
bun run demo               # 固定牌局冒烟
bun run game               # 终端对局
```

## 数据生成

```bash
bun run train:data                  # 100 手 × 10 rollout，随机种子
bun run train:data:repro            # 固定种子 42，可复现
bun run src/ai/run_dataset_gen.ts 200 8 42   # 自定义参数
```

## Python 训练

```bash
cd agent
uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward \
  --epochs 100 --batch 128 --patience 20 \
  --out discard_q.pt
```

## 推理验证

```bash
echo '{"hand":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],"valid_mask":[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}' \
  | uv run python predict.py
```

## Makefile 快捷命令

```bash
make install      # bun install
make engine       # 编译 Zig 引擎
make engine-test  # 引擎单测
make typecheck
make test
make game
make data-repro   # 生成可复现数据
make train        # 训练
```
