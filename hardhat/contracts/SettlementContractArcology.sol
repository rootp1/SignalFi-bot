// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Arcology-compatible Settlement Contract
// Simplified version without Multiprocess - Arcology handles concurrency automatically
contract SettlementContractArcology {
    IERC20 public usdc;
    IERC20 public weth;
    address public ammAddress;

    address public relayerAddress;
    address public broadcasterAddress;

    // Standard mapping for deposits - Arcology handles concurrency
    mapping(address => uint256) public deposits;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event TradeSettled(address indexed trader, bool isBuy, uint256 amount);

    error OnlyRelayer();
    error InsufficientDeposit();

    constructor(
        address _usdc,
        address _weth,
        address _amm,
        address _relayer,
        address _broadcaster
    ) {
        usdc = IERC20(_usdc);
        weth = IERC20(_weth);
        ammAddress = _amm;
        relayerAddress = _relayer;
        broadcasterAddress = _broadcaster;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayerAddress) revert OnlyRelayer();
        _;
    }

    // Deposit USDC into the settlement contract
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update deposit balance
        deposits[msg.sender] += amount;

        emit Deposit(msg.sender, amount);
    }

    // Get deposit balance for a user
    function getDeposit(address user) public view returns (uint256) {
        return deposits[user];
    }

    // Withdraw USDC from the settlement contract
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        
        deposits[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit Withdraw(msg.sender, amount);
    }
}
