import torch  # pyright: ignore[reportMissingImports]
import torch.nn as nn  # pyright: ignore[reportMissingImports]
from torch import Tensor  # pyright: ignore[reportMissingImports]

NUM_TILES = 27
NUM_FEATURES = 30  # 27 tile counts + 3 que-suit flags
HIDDEN = 128

class DiscardQ(nn.Module):
    def __init__(self, dim_in: int = NUM_FEATURES, hidden: int = HIDDEN, num_actions: int = NUM_TILES):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim_in, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, num_actions),
        )

    def forward(self, x: Tensor) -> Tensor:
        return self.net(x)