// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OrderveilCommitments} from "../src/OrderveilCommitments.sol";

/// forge script script/Deploy.s.sol --rpc-url bsc_testnet --private-key $DEPLOYER_PRIVATE_KEY --broadcast --legacy --with-gas-price 200000000
/// (BSC Testnet has base fee 0; without --legacy forge may price the tx at 1 wei and it never gets mined.)
contract Deploy is Script {
    function run() external returns (OrderveilCommitments c) {
        require(block.chainid == 97 || block.chainid == 31337, "BSC Testnet (97) or local only");
        vm.startBroadcast();
        c = new OrderveilCommitments();
        vm.stopBroadcast();
        console2.log("OrderveilCommitments deployed at", address(c));
    }
}
