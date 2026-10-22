/**
 * zk/tree.js
 * Builds depth-8 Poseidon Merkle tree from registered passports.
 * Exports tree state and root.
 */

import { buildPoseidon } from "circomlibjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SEED_FILE = path.join(ROOT_DIR, "data", "seed.json");
const TREE_OUT = path.join(__dirname, "tree_state.json");

const DEPTH = 8;
const NUM_LEAVES = 1 << DEPTH; // 256

export async function buildRegistryTree() {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Read seed data to get base models
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  const leaves = new Array(NUM_LEAVES).fill(F.e(0));

  console.log(`Building depth-${DEPTH} Poseidon tree for ${seed.models.length} registered models...`);

  const modelMap = {};
  for (let i = 0; i < seed.models.length; i++) {
    const m = seed.models[i];
    // Hash model identifier/digest into field element
    const salt = BigInt(1001 + i);
    const mockDigestField = BigInt("0x" + Buffer.from(m.dir).toString("hex").padEnd(64, "0").slice(0, 60));
    const leaf = poseidon([mockDigestField, salt]);
    leaves[i] = leaf;
    modelMap[m.dir] = {
      index: i,
      salt: salt.toString(),
      digestField: mockDigestField.toString(),
      leaf: F.toString(leaf)
    };
  }

  // Build Merkle tree levels
  let currentLevel = leaves;
  const levels = [currentLevel];

  for (let d = 0; d < DEPTH; d++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || F.e(0);
      const parent = poseidon([left, right]);
      nextLevel.push(parent);
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = F.toString(currentLevel[0]);
  const treeState = {
    depth: DEPTH,
    root: root,
    models: modelMap,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(TREE_OUT, JSON.stringify(treeState, null, 2));
  console.log(`Poseidon Merkle Tree Root: ${root}`);
  return treeState;
}

if (process.argv[1] && process.argv[1].endsWith("tree.js")) {
  buildRegistryTree().catch(console.error);
}
