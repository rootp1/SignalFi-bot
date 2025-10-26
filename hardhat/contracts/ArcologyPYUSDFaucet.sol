// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ArcologyPYUSD.sol";

/**
 * @title ArcologyPYUSDFaucet
 * @notice Arcology-compatible faucet for PYUSD tokens
 */
contract ArcologyPYUSDFaucet {
    ArcologyPYUSD public pyusd;
    
    uint256 public constant FAUCET_AMOUNT = 100 * 10**6; // 100 PYUSD (6 decimals)
    
    address public owner;
    
    event PYUSDClaimed(address indexed claimer, uint256 amount, uint256 timestamp);
    event FaucetFunded(address indexed funder, uint256 amount);
    event FaucetBalanceQuery(uint256 balance);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _pyusd) {
        pyusd = ArcologyPYUSD(_pyusd);
        owner = msg.sender;
    }
    
    /**
     * @notice Claim PYUSD from faucet - No cooldown!
     */
    function claimPYUSD() external {
        // Transfer using Arcology token
        bool success = pyusd.transfer(msg.sender, FAUCET_AMOUNT);
        require(success, "Transfer failed");
        
        emit PYUSDClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
    
    /**
     * @notice Get faucet balance - returns via event
     */
    function getFaucetBalance() external {
        // This will trigger balanceOf which emits BalanceQuery event
        pyusd.balanceOf(address(this));
    }
    
    /**
     * @notice Fund faucet (owner only)
     */
    function fundFaucet(uint256 amount) external onlyOwner {
        require(pyusd.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FaucetFunded(msg.sender, amount);
    }
}
