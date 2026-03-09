import json
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