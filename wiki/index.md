---
layout: home

hero:
  name: Maj_Mini
  text: 四川麻将 AI 训练框架
  tagline: 定缺 / 血战到底规则的 Zig 纯逻辑引擎 + rollout 监督学习，让 AI 学会「该打哪张」
  image:
    src: /logo.png
    alt: Maj_Mini logo
  actions:
    - theme: brand
      text: 快速开始
      link: /intro/quickstart
    - theme: alt
      text: 产品介绍
      link: /intro/product
    - theme: alt
      text: GitHub
      link: https://github.com/aDarkMaker/Maj_mini

features:
  - title: 纯逻辑引擎
    details: Zig 实现完整川麻规则：胡牌判定、定缺强制、碰杠胡、番数换算、流局查叫花猪结算，全部不可变状态机。
  - title: 血战到底
    details: 一家胡牌后其余玩家继续，直到三家胡牌或流局；已胡玩家不再参与付钱，结算逻辑完整覆盖。
  - title: Rollout 数据生成
    details: 穷举每手牌的可打出牌，引擎内原生模拟多次取平均 reward，自动产出监督训练数据集。
  - title: Q 网络训练
    details: PyTorch 三层 MLP，支持相对优势目标、reward 归一化、验证集早停，跨平台 uv 一键训练。
  - title: 30 维特征
    details: 27 维手牌计数 + 3 维定缺 one-hot，让模型真正「看见」缺哪门花色，跨 TS/Python 全链路一致。
  - title: 跨平台可复现
    details: 种子化洗牌保证对局可复现；bot 自动定位 venv Python（POSIX/Windows），uv run 兜底。
---
