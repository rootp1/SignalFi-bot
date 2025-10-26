// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IArcologyPYUSD {
    function mint(address to, uint256 amount) external;
}

/**
 * @title ArcologyPYUSDFaucetUnlimited
 * @notice Unlimited PYUSD faucet with no cooldown restrictions
 * @dev Follows Arcology event-based pattern for compatibility
 */
contract ArcologyPYUSDFaucetUnlimited {
    IArcologyPYUSD public pyusdToken;
    uint256 public constant FAUCET_AMOUNT = 100 * 10**6; // 100 PYUSD (6 decimals)
    
    event PYUSDClaimed(address indexed claimer, uint256 amount, uint256 timestamp);
    
    constructor(address _pyusdToken) {
        pyusdToken = IArcologyPYUSD(_pyusdToken);
    }
    
    /**
     * @notice Claim PYUSD tokens - unlimited claims, no cooldown
     */
    function claimPYUSD() external {
        pyusdToken.mint(msg.sender, FAUCET_AMOUNT);
        emit PYUSDClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
}
