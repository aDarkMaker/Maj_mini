import path from 'path';
import { fileURLToPath } from 'url';
import { generateDataset } from './dataset_gen.js';
import _ from 'lodash';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../../agent/dataset.jsonl');

generateDataset(outPath, 100, 10, Math.floor(Math.random() * 1000000));
