import json
from collections import defaultdict
from pathlib import Path
from typing import List, Tuple


def load_dataset(path: str) -> Tuple[List[List[float]], List[int], List[float]]:
    X: List[List[float]] = []
    actions: List[int] = []
    rewards: List[float] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            X.append(row["hand"])
            actions.append(row["discard_idx"])
            rewards.append(row["reward"])
    return X, actions, rewards


def advantage_targets(rewards: List[float], hands: List[List[float]]) -> List[float]:
    """Per-hand relative advantage: reward minus this hand's mean reward across all its discards.
    Teaches the relative quality of discards within the same hand, which is the actual
    decision the model must make. argmax is unchanged vs absolute reward."""
    sums: dict[tuple, float] = defaultdict(float)
    counts: dict[tuple, int] = defaultdict(int)
    for hand, r in zip(hands, rewards):
        key = tuple(hand)
        sums[key] += r
        counts[key] += 1
    base: dict[tuple, float] = {k: sums[k] / counts[k] for k in sums}
    return [r - base[tuple(hand)] for hand, r in zip(hands, rewards)]