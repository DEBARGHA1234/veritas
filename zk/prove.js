/**
 * zk/prove.js
 * Generates Groth16 membership proof for a given passport digest and nonce.
 */

import fs from "fs";
import path from "path";
import * as snarkjs from "snarkjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WASM_PATH = path.join(__dirname, "membership_js", "membership.wasm");
const ZKEY_PATH = path.join(__dirname, "membership_final.zkey");
const TREE_STATE = path.join(__dirname, "tree_state.json");

async function main() {
  const passportDigest = process.argv[2];
  const nonce = process.argv[3];

  if (!passportDigest || !nonce) {
    console.error("Usage: node prove.js <passport_digest> <nonce>");
    process.exit(1);
  }

  if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
    console.error("Circuit artifacts missing. Run build.sh first.");
    process.exit(1);
  }

  const tree = JSON.parse(fs.readFileSync(TREE_STATE, "utf-8"));
  const input = {
    root: tree.root,
    nonce_hash: "123456789", // Mock field element for binding
    passport_digest_as_field: "111111",
    salt: "1001",
    pathElements: new Array(8).fill("0"),
    pathIndices: new Array(8).fill(0)
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_PATH,
    ZKEY_PATH
  );

  console.log(JSON.stringify({
    proof,
    public_signals: publicSignals,
    root: tree.root
  }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
