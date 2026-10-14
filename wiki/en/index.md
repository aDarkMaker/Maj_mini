---
layout: home

hero:
  name: Maj_Mini
  text: Sichuan Mahjong AI Training Framework
  tagline: A pure-logic engine for que-men / blood-battle rules plus rollout-based supervised learning that teaches an AI which tile to discard.
  image:
    src: /logo.png
    alt: Maj_Mini logo
  actions:
    - theme: brand
      text: Quick Start
      link: /en/intro/quickstart
    - theme: alt
      text: Product
      link: /en/intro/product
    - theme: alt
      text: GitHub
      link: https://github.com/aDarkMaker/Maj_mini

features:
  - title: Pure-logic engine
    details: 'A Zig implementation of the full Sichuan-Mahjong ruleset: win detection, forced que-men, pong/kong/win, fan scoring and liuju settlement, all immutable.'
  - title: Blood battle
    details: After a win the remaining players keep playing until three win or the wall runs out; settled players no longer pay, fully covered by the settlement logic.
  - title: Rollout data generation
    details: Enumerates every legal discard per hand and averages rewards over native in-engine simulations to produce supervised training data automatically.
  - title: Q-network training
    details: A PyTorch 3-layer MLP with relative-advantage targets, reward normalization and validation early-stopping, trained cross-platform via uv.
  - title: 30-dim features
    details: 27 tile counts + 3 que-suit one-hot flags let the model actually see the missing suit; kept consistent across TS and Python.
  - title: Cross-platform & reproducible
    details: Seeded shuffling makes games reproducible; the bot auto-locates the venv Python (POSIX/Windows) and falls back to uv run.
---
