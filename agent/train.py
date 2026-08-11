import argparse
from pathlib import Path
import numpy as np
import torch  # pyright: ignore[reportMissingImports]
import torch.nn as nn  # pyright: ignore[reportMissingImports]
from torch.utils.data import TensorDataset, DataLoader  # pyright: ignore[reportMissingImports]
from model import DiscardQ
from dataset import load_dataset, advantage_targets


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="dataset.jsonl", help="JSONL path")
    parser.add_argument("--epochs", type=int, default=500)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--batch", type=int, default=128)
    parser.add_argument("--out", type=str, default="discard_q.pt")
    parser.add_argument("--val-frac", type=float, default=0.1, help="validation split fraction")
    parser.add_argument("--patience", type=int, default=30, help="early-stop patience in epochs")
    parser.add_argument("--normalize-reward", action="store_true", help="standardize reward target")
    parser.add_argument("--weight-by-reward", action="store_true", help="up-weight positive-reward samples")
    parser.add_argument("--relative-advantage", action="store_true", help="target = per-hand advantage")
    args = parser.parse_args()

    X, actions, rewards = load_dataset(args.data)
    rewards = [float(r) for r in rewards]
    if args.relative_advantage:
        rewards = advantage_targets(rewards, X)

    X_t = torch.tensor(X, dtype=torch.float32)
    actions_t = torch.tensor(actions, dtype=torch.long)
    dim_in = X_t.shape[1] if X_t.ndim == 2 else X_t.shape[0]
    rewards_np = np.array(rewards, dtype=np.float32)
    if args.normalize_reward:
        r_mean, r_std = rewards_np.mean(), rewards_np.std()
        if r_std > 1e-6:
            rewards_np = (rewards_np - r_mean) / r_std
        print(f"Reward normalize: mean={r_mean:.2f} std={r_std:.2f}")
    rewards_t = torch.tensor(rewards_np, dtype=torch.float32).unsqueeze(1)

    n = len(X_t)
    n_val = max(1, int(n * args.val_frac))
    # deterministic split: take the last n_val samples as validation
    train_ds = TensorDataset(X_t[: n - n_val], actions_t[: n - n_val], rewards_t[: n - n_val])
    val_ds = TensorDataset(X_t[n - n_val :], actions_t[n - n_val :], rewards_t[n - n_val :])

    if args.weight_by_reward:
        base_w = np.clip(rewards_np[: n - n_val] - rewards_np[: n - n_val].min() + 0.1, 0.1, None)
        weight_t = torch.tensor(base_w, dtype=torch.float32)
        sampler = torch.utils.data.WeightedRandomSampler(weight_t, len(weight_t))
        loader = DataLoader(train_ds, batch_size=args.batch, sampler=sampler)
    else:
        loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch)

    model = DiscardQ(dim_in=dim_in)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    mse = nn.MSELoss()

    best_val = float("inf")
    best_state = None
    best_epoch = 0
    for epoch in range(args.epochs):
        model.train()
        total_loss = 0.0
        for x, a, r in loader:
            opt.zero_grad()
            q = model(x)
            q_a = q.gather(1, a.unsqueeze(1)).squeeze(1)
            loss = mse(q_a, r.squeeze(1))
            loss.backward()
            opt.step()
            total_loss += loss.item()
        train_loss = total_loss / len(loader)

        model.eval()
        with torch.no_grad():
            vsum = 0.0
            for x, a, r in val_loader:
                q = model(x).gather(1, a.unsqueeze(1)).squeeze(1)
                vsum += mse(q, r.squeeze(1)).item() * len(a)
            val_loss = vsum / n_val

        print(f"Epoch {epoch + 1}/{args.epochs} loss={train_loss:.4f} val={val_loss:.4f}")
        if val_loss < best_val:
            best_val = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            best_epoch = epoch + 1
        elif epoch - best_epoch >= args.patience:
            print(f"Early stop at epoch {epoch + 1}, best epoch {best_epoch} (val={best_val:.4f})")
            break

    if best_state is not None:
        model.load_state_dict(best_state)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.out)
    print(f"Saved {args.out} (val={best_val:.4f}, epoch {best_epoch})")


if __name__ == "__main__":
    main()