// CLI entry: generates training data. Usage: `bun run train:data [numHands] [rolloutsPerAction] [seed]`.
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDataset } from './dataset_gen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../../agent/dataset.jsonl');

const [numHandsStr, rolloutsStr, seedStr] = process.argv.slice(2);
const numHands = numHandsStr ? parseInt(numHandsStr, 10) : 100;
const rolloutsPerAction = rolloutsStr ? parseInt(rolloutsStr, 10) : 10;
const seed = seedStr ? parseInt(seedStr, 10) : Math.floor(Math.random() * 1000000);

generateDataset(outPath, numHands, rolloutsPerAction, seed);
