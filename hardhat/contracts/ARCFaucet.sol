// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ARCFaucet {
    uint256 public constant CLAIM_AMOUNT = 10 ether; // 10 ARC per claim
    uint256 public constant COOLDOWN_TIME = 0; // No cooldown for testing (can change to 24 hours = 86400)

    mapping(address => uint256) public lastClaimTime;

    event ARCClaimed(address indexed user, uint256 amount);
    event FaucetFunded(address indexed funder, uint256 amount);

    // Explicit function to fund the faucet
    function fundFaucet() external payable {
        require(msg.value > 0, "Must send ARC");
        emit FaucetFunded(msg.sender, msg.value);
    }

    // Allow contract to receive ARC (fallback)
    receive() external payable {
        emit FaucetFunded(msg.sender, msg.value);
    }

    // Users call this to get free ARC
    function claimARC() external {
        require(address(this).balance >= CLAIM_AMOUNT, "Faucet is empty");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + COOLDOWN_TIME,
            "Please wait before claiming again"
        );

        lastClaimTime[msg.sender] = block.timestamp;

        (bool success, ) = msg.sender.call{value: CLAIM_AMOUNT}("");
        require(success, "Transfer failed");

        emit ARCClaimed(msg.sender, CLAIM_AMOUNT);
    }

    // Check faucet balance
    function getFaucetBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Check time until user can claim again
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[user] + COOLDOWN_TIME;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
}
