// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {OrderveilCommitments} from "../src/OrderveilCommitments.sol";

contract OrderveilCommitmentsTest is Test {
    OrderveilCommitments c;
    bytes32 constant DIGEST = keccak256("record");
    bytes32 constant EXP = bytes32(bytes8(0x7b6a21bd762140e4));
    bytes32 constant SUB = keccak256("sub");
    bytes32 constant EXEC = keccak256("exec");
    string constant RULESET = "orderveil-sim/ruleset/0.1.0";

    event ExperimentCommitted(
        bytes32 indexed recordDigest,
        bytes32 indexed experimentId,
        address indexed submitter,
        bytes32 finalSubBlockHash,
        bytes32 executionHash,
        string rulesetVersion
    );

    function setUp() public {
        c = new OrderveilCommitments();
    }

    function test_commitStoresAndEmits() public {
        vm.roll(1234);
        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, true, true);
        emit ExperimentCommitted(DIGEST, EXP, address(this), SUB, EXEC, RULESET);
        c.commit(DIGEST, EXP, SUB, EXEC, RULESET);

        OrderveilCommitments.Commitment memory m = c.getCommitment(DIGEST);
        assertEq(m.submitter, address(this));
        assertEq(m.blockNumber, 1234);
        assertEq(m.timestamp, 1_700_000_000);
        assertEq(m.experimentId, EXP);
        assertEq(m.finalSubBlockHash, SUB);
        assertEq(m.executionHash, EXEC);
        assertEq(m.rulesetVersion, RULESET);
        assertTrue(c.isCommitted(DIGEST));
        assertEq(c.totalCommitments(), 1);
    }

    function test_rejectsDuplicate() public {
        c.commit(DIGEST, EXP, SUB, EXEC, RULESET);
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(OrderveilCommitments.AlreadyCommitted.selector, DIGEST, address(this), uint64(block.number)));
        c.commit(DIGEST, EXP, SUB, EXEC, RULESET);
        assertEq(c.getCommitment(DIGEST).submitter, address(this));
    }

    function test_rejectsEmptyDigest() public {
        vm.expectRevert(OrderveilCommitments.EmptyDigest.selector);
        c.commit(bytes32(0), EXP, SUB, EXEC, RULESET);
    }

    function test_rejectsLongRuleset() public {
        vm.expectRevert(OrderveilCommitments.RulesetTooLong.selector);
        c.commit(DIGEST, EXP, SUB, EXEC, "0123456789012345678901234567890123456789012345678901234567890123456789");
    }

    function test_unknownDigestIsEmpty() public view {
        assertFalse(c.isCommitted(DIGEST));
        assertEq(c.getCommitment(DIGEST).submitter, address(0));
    }

    function testFuzz_independentDigests(bytes32 a, bytes32 b) public {
        vm.assume(a != bytes32(0) && b != bytes32(0) && a != b);
        c.commit(a, EXP, SUB, EXEC, RULESET);
        vm.prank(address(0xCAFE));
        c.commit(b, EXP, SUB, EXEC, RULESET);
        assertEq(c.getCommitment(b).submitter, address(0xCAFE));
        assertEq(c.totalCommitments(), 2);
    }
}
