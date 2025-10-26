// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockPYUSD.sol";

/**
 * @title PyUSDFaucet
 * @notice Faucet contract for distributing test PYUSD tokens
 * @dev Allows users to claim test PYUSD for development and testing
 */
contract PyUSDFaucet {
    MockPYUSD public pyusd;
    
    // Amount to dispense per claim (100 PYUSD)
    uint256 public constant FAUCET_AMOUNT = 100 * 10**6; // 6 decimals
    
    // Cooldown period between claims (24 hours)
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    
    // Track last claim time for each address
    mapping(address => uint256) public lastClaimTime;
    
    // Contract owner
    address public owner;
    
    // Events
    event PYUSDClaimed(address indexed claimer, uint256 amount, uint256 timestamp);
    event FaucetFunded(address indexed funder, uint256 amount);
    event FaucetWithdrawn(address indexed owner, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /**
     * @notice Constructor
     * @param _pyusd Address of the MockPYUSD contract
     */
    constructor(address _pyusd) {
        pyusd = MockPYUSD(_pyusd);
        owner = msg.sender;
    }
    
    /**
     * @notice Claim PYUSD tokens from the faucet
     * @dev Users can claim once every 24 hours
     */
    function claimPYUSD() external {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + COOLDOWN_PERIOD,
            "Please wait 24 hours between claims"
        );
        
        uint256 faucetBalance = pyusd.balanceOf(address(this));
        require(faucetBalance >= FAUCET_AMOUNT, "Faucet is empty, please contact admin");
        
        // Update last claim time
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer PYUSD to claimer
        require(pyusd.transfer(msg.sender, FAUCET_AMOUNT), "Transfer failed");
        
        emit PYUSDClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
    
    /**
     * @notice Get time remaining until user can claim again
     * @param user Address to check
     * @return Time in seconds until next claim is available (0 if can claim now)
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Check if user can claim right now
     * @param user Address to check
     * @return true if user can claim, false otherwise
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + COOLDOWN_PERIOD;
    }
    
    /**
     * @notice Get faucet balance
     * @return Current PYUSD balance of the faucet
     */
    function getFaucetBalance() external view returns (uint256) {
        return pyusd.balanceOf(address(this));
    }
    
    /**
     * @notice Fund the faucet with PYUSD
     * @param amount Amount of PYUSD to add
     */
    function fundFaucet(uint256 amount) external {
        require(pyusd.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FaucetFunded(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw PYUSD from faucet (owner only)
     * @param amount Amount to withdraw
     */
    function withdrawPYUSD(uint256 amount) external onlyOwner {
        require(pyusd.transfer(owner, amount), "Transfer failed");
        emit FaucetWithdrawn(owner, amount);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
