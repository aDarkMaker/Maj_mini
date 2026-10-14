import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { GameState, KongType, PlayerIndex, RoundSummary, Suit } from '@/ts/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_BIN = path.resolve(__dirname, '../../backend/zig-out/bin/maj_engine');

type Pending = {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
};

type Response = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };

type SettleResult = { net: number[]; reason: 'normal' | 'liuju' };

class EngineClient {
	private proc: Bun.Subprocess<'pipe', 'pipe', 'inherit'> | null = null;
	private nextId = 1;
	private readonly pending = new Map<number, Pending>();
	private buffer = '';

	private ensure(): Bun.Subprocess<'pipe', 'pipe', 'inherit'> {
		if (this.proc) return this.proc;
		if (!existsSync(ENGINE_BIN)) {
			throw new Error(`Engine binary not found at ${ENGINE_BIN}. Run: bun run build:engine`);
		}
		const proc = Bun.spawn([ENGINE_BIN], {
			stdin: 'pipe',
			stdout: 'pipe',
			stderr: 'inherit',
		});
		this.proc = proc;
		void this.readLoop(proc);
		return proc;
	}

	private async readLoop(proc: Bun.Subprocess<'pipe', 'pipe', 'inherit'>): Promise<void> {
		const decoder = new TextDecoder();
		const reader = proc.stdout.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				this.buffer += decoder.decode(value, { stream: true });
				let index = this.buffer.indexOf('\n');
				while (index >= 0) {
					const line = this.buffer.slice(0, index).trim();
					this.buffer = this.buffer.slice(index + 1);
					if (line.length > 0) this.dispatch(line);
					index = this.buffer.indexOf('\n');
				}
			}
		} finally {
			const error = new Error('Engine process exited');
			for (const pending of this.pending.values()) pending.reject(error);
			this.pending.clear();
			this.proc = null;
		}
	}

	private dispatch(line: string): void {
		const res = JSON.parse(line) as Response;
		const pending = this.pending.get(res.id);
		if (!pending) return;
		this.pending.delete(res.id);
		if (res.ok) pending.resolve(res.value);
		else pending.reject(new Error(res.error));
	}

	private request<T>(cmd: string, args: unknown): Promise<T> {
		const proc = this.ensure();
		const id = this.nextId++;
		const payload = JSON.stringify({ id, cmd, args }) + '\n';
		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
			proc.stdin.write(payload);
			proc.stdin.flush();
		});
	}

	init(dealer: PlayerIndex = 0, seed?: number): Promise<GameState> {
		return this.request<GameState>('init', { dealer, seed });
	}

	draw(state: GameState, who: PlayerIndex): Promise<GameState> {
		return this.request<GameState>('draw', { state, who });
	}

	discard(state: GameState, tile: string, who: PlayerIndex): Promise<GameState> {
		return this.request<GameState>('discard', { state, tile, who });
	}

	pong(state: GameState, who: PlayerIndex, tile: string): Promise<GameState> {
		return this.request<GameState>('pong', { state, who, tile });
	}

	kong(state: GameState, who: PlayerIndex, tile: string, kind: KongType): Promise<GameState> {
		return this.request<GameState>('kong', { state, who, tile, kind });
	}

	win(state: GameState, who: PlayerIndex, tile: string, isSelfDraw: boolean): Promise<GameState> {
		return this.request<GameState>('win', { state, who, tile, isSelfDraw });
	}

	canWin(state: { hand: string[]; melds: GameState['players'][number]['melds']; queSuit: Suit | null }): Promise<boolean> {
		return this.request<boolean>('can_win', { state });
	}

	validDiscards(hand: string[], queSuit: Suit | null): Promise<string[]> {
		return this.request<string[]>('valid_discards', { state: { hand, queSuit } });
	}

	nextActive(from: PlayerIndex, winners: PlayerIndex[]): Promise<PlayerIndex | null> {
		return this.request<PlayerIndex | null>('next_active', { from, winners });
	}

	passToNext(state: GameState, winners: PlayerIndex[]): Promise<GameState> {
		return this.request<GameState>('pass_to_next', { state, winners });
	}

	isRoundOver(state: GameState, summary: RoundSummary): Promise<boolean> {
		return this.request<boolean>('is_round_over', { state, summary });
	}

	settle(state: GameState, summary: RoundSummary, baseMoney?: number): Promise<SettleResult> {
		return this.request<SettleResult>('settle', { state, summary, baseMoney });
	}

	simulate(hand: string[], firstDiscard: string, rolloutsPerAction: number, baseSeed: number, queSuit: Suit | null): Promise<number> {
		return this.request<number>('simulate', { hand, firstDiscard, rolloutsPerAction, baseSeed, queSuit });
	}
}

export const engine = new EngineClient();
