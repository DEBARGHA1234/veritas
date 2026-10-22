#!/bin/bash
# zk/build.sh
# Compiles membership.circom and runs local Groth16 ceremony
# DEMO CEREMONY ONLY - NOT FOR PRODUCTION USE

set -e

echo "=== VERITAS ZK Build Pipeline ==="
echo "Note: DEMO CEREMONY ONLY (BN254, Groth16)"

if ! command -v circom &> /dev/null; then
    echo "circom compiler not found in PATH. Exiting."
    exit 1
fi

echo "1. Compiling membership.circom..."
circom membership.circom --r1cs --wasm --sym

echo "2. Ceremony Phase 1 (Powers of Tau)..."
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="some random text"
npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

echo "3. Ceremony Phase 2 (Circuit Specific)..."
npx snarkjs groth16 setup membership.r1cs pot12_final.ptau membership_0000.zkey
npx snarkjs zkey contribute membership_0000.zkey membership_final.zkey --name="Demo Contributor" -v -e="another random entropy"
npx snarkjs zkey export verification_key membership_final.zkey verification_key.json

echo "=== ZK Circuit Build Complete ==="
