# Maj_Mini

四川麻将（定缺/血战到底）的 playground 与 AI 训练框架。

## 核心机制

- 定缺：开局每人强制绑定一门缺牌，胡牌时手牌不能含该花色
- 血战到底：一家胡牌后，其余玩家继续游戏，直到三家胡牌或流局
- 结算：已胡牌玩家不再参与付钱/被罚款

## 架构

```
maj_mini/
├── src/
│   ├── server.ts           # 游戏入口
│   ├── ts/
│   │   ├── types.ts        # 核心类型（GameState, PlayerState, Suit）
│   │   ├── rule.ts         # 胡牌判定、缺门检查、定缺
│   │   ├── players.ts      # 摸牌、打牌、碰、杠、胡
│   │   ├── score.ts        # 番数与倍数换算
│   │   ├── gameover.ts     # 流局查叫/花猪结算
│   │   └── mahjong_init.ts # 洗牌、发牌、定缺分配
│   ├── ai/
│   │   ├── bot.ts          # 模型推理接口
│   │   ├── display.ts      # 终端牌桌可视化
│   │   ├── dataset_gen.ts  # 训练数据生成（穷举首打）
│   │   ├── rollout.ts      # 模拟对局 rollout
│   │   ├── features.ts     # 手牌向量化
│   │   └── constants.ts    # 牌面索引
│   └── test/demo.ts        # 固定牌局测试
├── agent/
│   ├── train.py            # PyTorch 训练
│   ├── model.py            # Q 网络
│   ├── predict.py          # 推理服务
│   └── dataset.py          # 数据加载
```

## 运行

```bash
# 安装依赖
bun install

# 运行一局游戏（终端可视化）
bun run game

# 生成训练数据（JSONL）
bun run train:data

# 训练模型
cd agent
uv sync
source .venv/bin/active
uv run python train.py --data dataset.jsonl --out discard_q.pt
```

## 训练参数

```bash
python train.py \
  --data dataset.jsonl    # 训练数据路径
  --epochs 100            # 训练轮数
  --lr 1e-3               # 学习率
  --batch 64              # 批次大小
  --out discard_q.pt      # 输出模型
  --normalize-reward      # 标准化 reward
  --weight-by-reward      # 高 reward 样本加权
```

## 训练数据格式

JSONL 文件，每行一条样本：

```json
{
  "hand": [0,2,1,0,3,0,0,1,0,0,2,0,1,0,0,1,0,0,2,0,1,0,0,0,1,0,1],
  "discard_idx": 5,
  "reward": -3.5
}
```

字段说明：

- `hand`: 27 维向量，索引 0-8 对应万 1-9，9-17 对应条 1-9，18-26 对应筒 1-9，值为张数
- `discard_idx`: 0-26，对应要打的那张牌
- `reward`: 该手牌下打这张牌的期望净分（通过 rollout 多局模拟计算）

生成数据时会为每个手牌穷举所有可打牌（定缺约束下），并为每个 (hand, discard) 对运行多次 rollout 取平均 reward。

## 数据结构

- `TileId`: 牌面编码，如 `w1`（一万）、`t5`（五条）、`b9`（九筒）
- `Suit`: 花色，`w` | `t` | `b`，对应定缺字段 `queSuit`
- `GameState`: 包含玩家手牌、副露、弃牌、牌墙、当前玩家、phase
- `RoundSummary`: 记录胡牌历史与赢家列表

## 规则检查

- `canWin(hand, melds, tile, isSelfDraw, queSuit?)`: 胡牌判定
- `getValidDiscards(hand, queSuit)`: 定缺下可打牌（缺门优先）
- `isHuaZhu(hand, melds)`: 花猪检查（三家花色）
- `hasTing(hand, melds)`: 听牌检查
