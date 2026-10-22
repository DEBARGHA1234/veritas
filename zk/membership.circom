pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

// Depth-8 Poseidon Merkle Membership Circuit
// Proves knowledge of leaf = Poseidon([passport_digest, salt])
// with valid Merkle path to public root, bound to public nonce_hash.

template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    signal current[levels + 1];
    current[0] <== leaf;

    component hashers[levels];
    component muxLeft[levels];
    component muxRight[levels];

    for (var i = 0; i < levels; i++) {
        // pathIndices[i] is 0 if current is left, 1 if current is right
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        muxLeft[i] = Mux1();
        muxLeft[i].c[0] <== current[i];
        muxLeft[i].c[1] <== pathElements[i];
        muxLeft[i].s <== pathIndices[i];

        muxRight[i] = Mux1();
        muxRight[i].c[0] <== pathElements[i];
        muxRight[i].c[1] <== current[i];
        muxRight[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxLeft[i].out;
        hashers[i].inputs[1] <== muxRight[i].out;

        current[i + 1] <== hashers[i].out;
    }

    root <== current[levels];
}

template MembershipProof(levels) {
    // Public inputs
    signal input root;
    signal input nonce_hash;

    // Private inputs
    signal input passport_digest_as_field;
    signal input salt;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // 1. Compute leaf = Poseidon([passport_digest_as_field, salt])
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== passport_digest_as_field;
    leafHasher.inputs[1] <== salt;

    // 2. Verify Merkle Path
    component treeVerifier = MerkleTreeInclusionProof(levels);
    treeVerifier.leaf <== leafHasher.out;
    for (var i = 0; i < levels; i++) {
        treeVerifier.pathElements[i] <== pathElements[i];
        treeVerifier.pathIndices[i] <== pathIndices[i];
    }

    // 3. Constrain computed root to public root
    treeVerifier.root === root;

    // 4. Ensure nonce_hash is constrained in circuit
    signal nonce_sq;
    nonce_sq <== nonce_hash * nonce_hash;
}

component main {public [root, nonce_hash]} = MembershipProof(8);
