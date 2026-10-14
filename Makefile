.PHONY: install engine engine-test typecheck test game data data-repro agent train

# --- Zig engine ---
engine:
	cd backend && zig build -Doptimize=ReleaseFast

engine-test:
	cd backend && zig build test

install:
	bun install

typecheck:
	bun run typecheck

test: engine-test
	bun run test

game: engine
	bun run game

# Generate training data; params: $(NUM_HANDS) $(ROLLOUTS) $(SEED)
data:
	bun run src/ai/run_dataset_gen.ts $(NUM_HANDS) $(ROLLOUTS) $(SEED)

# Reproducible dataset with seed 42 (100 hands, 10 rollouts)
data-repro:
	bun run src/ai/run_dataset_gen.ts 100 10 42

# --- Python agent ---
agent-sync:
	cd agent && uv sync

# Train the Q-network with recommended options
train:
	cd agent && uv run python train.py --data dataset.jsonl \
	  --relative-advantage --normalize-reward --patience 20 --out discard_q.pt

# Smoke-test inference with a sample 30-dim hand
infer:
	@printf '{"hand":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],"valid_mask":[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}\n' | cd agent && uv run python predict.py
