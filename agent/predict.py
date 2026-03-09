import json
import sys
from pathlib import Path
import torch  # pyright: ignore[reportMissingImports]
from model import DiscardQ

NUM_TILES = 27

def main():
    model_path = Path(__file__).parent / "discard_q.pt"
    model = DiscardQ()
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    model.eval()

    line = sys.stdin.readline()
    if not line:
        return
    row = json.loads(line)
    hand = row.get("hand", [])
    if len(hand) != NUM_TILES:
        hand = hand + [0.0] * (NUM_TILES - len(hand))
    x = torch.tensor([hand], dtype=torch.float32)
    valid_mask = row.get("valid_mask")
    if valid_mask is not None and len(valid_mask) == NUM_TILES:
        valid = torch.tensor(valid_mask, dtype=torch.float32) > 0
    else:
        valid = x.squeeze(0) > 0
    with torch.no_grad():
        q = model(x).squeeze(0)
    q_masked = q.clone()
    q_masked[~valid] = float("-inf")
    discard_idx = int(q_masked.argmax().item())
    if not valid[discard_idx]:
        nonzero = valid.nonzero()
        discard_idx = int(nonzero[0].item()) if len(nonzero) > 0 else 0
    print(json.dumps({"discard_idx": discard_idx}))

if __name__ == "__main__":
    main()