import argparse
from pathlib import Path
import numpy as np
import torch  # pyright: ignore[reportMissingImports]
import torch.nn as nn  # pyright: ignore[reportMissingImports]
from torch.utils.data import TensorDataset, DataLoader  # pyright: ignore[reportMissingImports]
from model import DiscardQ
from dataset import load_dataset

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="dataset.jsonl", help="JSONL path")
    parser.add_argument("--epochs", type=int, default=500)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch", type=int, default=128)
    parser.add_argument("--out", type=str, default="discard_q.pt")
    parser.add_argument("--normalize-reward", action="store_true", help="标准化 reward 再训练")
    parser.add_argument("--weight-by-reward", action="store_true", help="正 reward 加权")
    args = parser.parse_args()

    X, actions, rewards = load_dataset(args.data)
    X_t = torch.tensor(X, dtype=torch.float32)
    actions_t = torch.tensor(actions, dtype=torch.long)
    rewards_np = np.array(rewards, dtype=np.float32)
    if args.normalize_reward:
        r_mean, r_std = rewards_np.mean(), rewards_np.std()
        if r_std > 1e-6:
            rewards_np = (rewards_np - r_mean) / r_std
        print(f"Reward normalize: mean={r_mean:.2f} std={r_std:.2f}")
    rewards_t = torch.tensor(rewards_np, dtype=torch.float32).unsqueeze(1)
    if args.weight_by_reward:
        weights = np.clip(rewards_np - rewards_np.min() + 0.1, 0.1, None).astype(np.float32)
        weight_t = torch.tensor(weights, dtype=torch.float32)
        sampler = torch.utils.data.WeightedRandomSampler(weight_t, len(weight_t))
        loader = DataLoader(
            TensorDataset(X_t, actions_t, rewards_t),
            batch_size=args.batch,
            sampler=sampler,
        )
    else:
        loader = DataLoader(
            TensorDataset(X_t, actions_t, rewards_t),
            batch_size=args.batch,
            shuffle=True,
        )

    model = DiscardQ()
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    mse = nn.MSELoss()

    for epoch in range(args.epochs):
        total_loss = 0.0
        for x, a, r in loader:
            opt.zero_grad()
            q = model(x)
            q_a = q.gather(1, a.unsqueeze(1)).squeeze(1)
            loss = mse(q_a, r.squeeze(1))
            loss.backward()
            opt.step()
            total_loss += loss.item()
        print(f"Epoch {epoch + 1}/{args.epochs} loss={total_loss / len(loader):.4f}")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.out)
    print("Saved", args.out)

if __name__ == "__main__":
    main()