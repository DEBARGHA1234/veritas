/**
 * zk/verify.js
 * Verifies Groth16 proof from stdin against verification_key.json.
 */

import fs from "fs";
import path from "path";
import * as snarkjs from "snarkjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VKEY_PATH = path.join(__dirname, "verification_key.json");

async function main() {
  if (!fs.existsSync(VKEY_PATH)) {
    console.error("verification_key.json not found.");
    process.exit(1);
  }

  const vKey = JSON.parse(fs.readFileSync(VKEY_PATH, "utf-8"));
  
  // Read stdin
  let inputStr = "";
  for await (const chunk of process.stdin) {
    inputStr += chunk;
  }

  const { proof, public_signals } = JSON.parse(inputStr);
  const isValid = await snarkjs.groth16.verify(vKey, public_signals, proof);

  console.log(JSON.stringify({
    valid: isValid,
    message: isValid ? "Groth16 proof verified successfully" : "Invalid Groth16 proof"
  }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
