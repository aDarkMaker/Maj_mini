# Maj_Mini

四川麻将（定缺/血战到底）的 playground 与 AI 训练框架。前端为 Bun/TypeScript，核心规则引擎为 Zig。

## 核心机制

- 定缺：开局每人强制绑定一门缺牌，胡牌时手牌不能含该花色
- 血战到底：一家胡牌后，其余玩家继续游戏，直到三家胡牌或流局
- 结算：已胡牌玩家不再参与付钱/被罚款

## 架构

规则引擎（Zig）以子进程形式运行，通过 stdio 上的 NDJSON 与前端通信；前端（Bun/TS）负责编排、显示、模型推理与训练数据生成。

```
maj_mini/
├── backend/                     # 核心规则引擎（Zig）
│   ├── build.zig
│   ├── build.zig.zon
│   └── src/
│       ├── main.zig             # stdin NDJSON 调度循环
│       ├── protocol.zig         # 请求/响应编解码
│       ├── types.zig            # 牌、玩家、牌局状态
│       ├── rule.zig             # 胡牌判定、缺门检查、可打牌
│       ├── players.zig          # 摸牌、打牌、碰、杠、胡
│       ├── score.zig            # 番数与倍数换算
│       ├── gameover.zig         # 流局查叫/花猪结算
│       ├── init.zig             # 洗牌、发牌、定缺分配
│       ├── simulate.zig         # 原生整局 rollout（快路径）
│       └── tests.zig            # 规则单元测试
├── src/                         # 前端（Bun/TS）
│   ├── engine/client.ts         # 引擎子进程 stdio 客户端
│   ├── server.ts                # 游戏入口（编排）
│   ├── ts/types.ts              # DTO 类型
│   ├── ai/
│   │   ├── bot.ts               # 模型推理接口
│   │   ├── display.ts           # 终端牌桌可视化
│   │   ├── dataset_gen.ts       # 训练数据生成（穷举首打）
│   │   ├── features.ts          # 手牌向量化
│   │   └── constants.ts         # 牌面索引
│   └── test/demo.ts             # 固定牌局测试
└── agent/                       # Python 训练（不变）
    ├── train.py                 # PyTorch 训练
    ├── model.py                 # Q 网络
    ├── predict.py               # 推理服务
    └── dataset.py               # 数据加载
```

## IPC 协议

引擎常驻一个进程，每行一个 JSON 对象。

请求：`{"id":1,"cmd":"can_win","args":{...}}`
响应：`{"id":1,"ok":true,"value":...}` 或 `{"id":1,"ok":false,"error":"..."}`

命令：`init`、`draw`、`discard`、`pong`、`kong`、`win`、`can_win`、`valid_discards`、`next_active`、`pass_to_next`、`is_round_over`、`settle`、`simulate`、`self_play`。

## 运行

```bash
# 安装依赖
bun install

# 编译 Zig 引擎（生成 backend/zig-out/bin/maj_engine）
bun run build:engine

# 引擎单元测试
bun run test:engine

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

> 需要 Zig 0.17+（`brew install zig`）。

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

生成数据时会为每个手牌穷举所有可打牌（定缺约束下），并为每个 (hand, discard) 对运行多次 rollout 取平均 reward；每次 rollout 通过引擎的 `simulate` 命令在 Zig 内整局推进。

## 数据结构

- `TileId`: 牌面编码，如 `w1`（一万）、`t5`（五条）、`b9`（九筒）
- `Suit`: 花色，`w` | `t` | `b`，对应定缺字段 `queSuit`
- `GameState`: 包含玩家手牌、副露、弃牌、牌墙、当前玩家、phase
- `RoundSummary`: 记录胡牌历史与赢家列表

## 规则检查

规则实现位于 Zig 引擎（`backend/src/rule.zig`、`backend/src/gameover.zig`），前端通过引擎命令调用：

- `can_win`: 胡牌判定
- `valid_discards`: 定缺下可打牌（缺门优先）
- `is_round_over` / `settle`: 流局查叫、花猪与听牌结算
