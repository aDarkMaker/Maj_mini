# Maj_Mini

**中文** | [English](./README.en.md)

一个以**四川麻将**（缺门 / 血战到底）为场景的 playground 与 AI 训练框架。

- **游戏引擎**：Zig 实现完整规则（胡牌判定、缺门强制、碰杠胡、番数、流局结算），以子进程 + NDJSON 协议暴露给前端
- **前端编排**：Bun + TypeScript 负责对局编排、终端显示、训练数据生成
- **AI 训练**：通过 rollout 模拟生成监督数据，由 PyTorch Q 网络学习「该打哪张」

## 概览

```mermaid
flowchart LR
    TS[Bun/TS 前端] -->|NDJSON/stdio| ZIG[Zig 引擎]
    TS --> Gen[rollout 数据]
    Gen --> Data[dataset.jsonl]
    Data --> Train[PyTorch Q 网络]
    Train --> Model[discard_q.pt]
    Model --> Predict[predict.py]
    Predict --> TS
```

## 快速开始

```bash
bun install                # 安装 TS 依赖
bun run build:engine       # 编译 Zig 引擎
uv sync --project agent    # 安装 Python 依赖

bun run typecheck          # 类型检查
bun run test:engine        # Zig 引擎单元测试
bun run test               # 前端单元测试
bun run demo               # 逻辑冒烟
bun run game               # 终端对局（bot vs bot）
```

## 数据 → 训练 → 推理

```bash
bun run train:data:repro        # 生成可复现数据集（seed 42）→ agent/dataset.jsonl
cd agent && uv run python train.py \
  --data dataset.jsonl \
  --relative-advantage --normalize-reward --patience 20 \
  --out discard_q.pt
bun run game                    # 使用训练好的模型对战
```

## 核心概念

- **Tile**：`w1` `t5` `b9` —— 27 种牌。
- **queSuit**：缺门花色，必须清光才能胡。
- **特征向量**：30 维 = 27 维手牌计数 + 3 维缺门 one-hot。
- **reward / advantage**：rollout 估计的期望净分；`--relative-advantage` 学习
  同一手内最优出牌。

## 目录结构

```
Maj_mini/
├── backend/            # Zig 规则引擎（子进程 + NDJSON）
├── src/
│   ├── engine/         # 引擎 stdio 客户端
│   ├── ai/             # 数据生成 / 特征 / 推理桥接 / 显示
│   ├── ts/             # 共享 DTO 类型
│   └── server.ts       # 对局入口
├── agent/              # Python 训练与模型
├── wiki/               # VitePress 文档站
└── .github/            # CI / issue 模板
```

## 文档索引

- [docs/architecture.md](./docs/architecture.md) — 架构设计
- [docs/deployment.md](./docs/deployment.md) — 部署 & 运行指南

## License

MIT — 见 [LICENSE](../LICENSE)。© 2026 aDarkMaker
