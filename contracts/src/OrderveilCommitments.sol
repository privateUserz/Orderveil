// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title OrderveilCommitments
/// @notice Stores commitments to Orderveil experiment records on BSC Testnet.
/// A commitment proves that a given record digest existed no later than the block it was
/// included in. It says nothing about how BSC itself orders transactions.
contract OrderveilCommitments {
    struct Commitment {
        address submitter;
        uint64 blockNumber;
        uint64 timestamp;
        bytes32 experimentId;
        bytes32 finalSubBlockHash;
        bytes32 executionHash;
        string rulesetVersion;
    }

    /// @dev recordDigest => commitment. First submission wins; records are immutable.
    mapping(bytes32 => Commitment) private _commitments;
    uint256 public totalCommitments;

    event ExperimentCommitted(
        bytes32 indexed recordDigest,
        bytes32 indexed experimentId,
        address indexed submitter,
        bytes32 finalSubBlockHash,
        bytes32 executionHash,
        string rulesetVersion
    );

    error EmptyDigest();
    error AlreadyCommitted(bytes32 recordDigest, address submitter, uint64 blockNumber);
    error RulesetTooLong();

    function commit(
        bytes32 recordDigest,
        bytes32 experimentId,
        bytes32 finalSubBlockHash,
        bytes32 executionHash,
        string calldata rulesetVersion
    ) external {
        if (recordDigest == bytes32(0)) revert EmptyDigest();
        if (bytes(rulesetVersion).length > 64) revert RulesetTooLong();
        Commitment storage existing = _commitments[recordDigest];
        if (existing.submitter != address(0)) {
            revert AlreadyCommitted(recordDigest, existing.submitter, existing.blockNumber);
        }
        _commitments[recordDigest] = Commitment({
            submitter: msg.sender,
            blockNumber: uint64(block.number),
            timestamp: uint64(block.timestamp),
            experimentId: experimentId,
            finalSubBlockHash: finalSubBlockHash,
            executionHash: executionHash,
            rulesetVersion: rulesetVersion
        });
        unchecked {
            totalCommitments += 1;
        }
        emit ExperimentCommitted(recordDigest, experimentId, msg.sender, finalSubBlockHash, executionHash, rulesetVersion);
    }

    function getCommitment(bytes32 recordDigest) external view returns (Commitment memory) {
        return _commitments[recordDigest];
    }

    function isCommitted(bytes32 recordDigest) external view returns (bool) {
        return _commitments[recordDigest].submitter != address(0);
    }
}
