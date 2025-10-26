// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AmmContract.sol";

/**
 * @title ParallelBatchExecutor
 * @notice Executes copy trading batches in parallel on Arcology Network
 * @dev Uses standard mappings - Arcology handles concurrency automatically
 *      This is the core innovation enabling fair pricing for all users
 */
contract ParallelBatchExecutor {
    // Standard mappings - Arcology handles concurrency automatically
    mapping(address => uint256) public pyusdBalances;
    mapping(address => uint256) public wethBalances;
    
    // Token references
    IERC20 public pyusd;
    IERC20 public weth;
    
    // AMM for swaps
    AmmContract public amm;
    
    // Authorized relayer (can execute batches)
    address public relayerAddress;
    
    // Contract owner
    address public owner;
    
    // Minimum balance required for trades
    uint256 public constant MIN_BALANCE = 1 * 10**6; // 1 PYUSD
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed user, uint256 amount, uint256 timestamp);
    event TradeExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );
    event BatchExecuted(
        uint256 indexed batchId,
        uint256 userCount,
        uint256 totalAmountIn,
        uint256 totalAmountOut,
        uint256 timestamp
    );
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyRelayer() {
        require(msg.sender == relayerAddress, "Only relayer");
        _;
    }
    
    /**
     * @notice Constructor
     * @param _pyusd MockPYUSD token address
     * @param _weth WETH token address
     * @param _amm AMM contract address
     * @param _relayer Authorized relayer address
     */
    constructor(
        address _pyusd,
        address _weth,
        address _amm,
        address _relayer
    ) {
        pyusd = IERC20(_pyusd);
        weth = IERC20(_weth);
        amm = AmmContract(_amm);
        relayerAddress = _relayer;
        owner = msg.sender;
    }
    
    /**
     * @notice Deposit PYUSD to start copy trading
     * @param amount Amount of PYUSD to deposit (6 decimals)
     */
    function deposit(uint256 amount) external {
        require(amount >= MIN_BALANCE, "Amount too small");
        require(pyusd.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Arcology handles concurrent updates automatically
        pyusdBalances[msg.sender] += amount;
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Withdraw PYUSD from the contract
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(pyusdBalances[msg.sender] >= amount, "Insufficient balance");
        
        // Arcology handles concurrent updates automatically
        pyusdBalances[msg.sender] -= amount;
        
        require(pyusd.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdraw(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Execute a batch of trades in parallel (PYUSD → WETH)
     * @dev This is called by the relayer when a broadcaster posts a BUY signal
     * @param users Array of user addresses to execute trades for
     * @param amounts Array of PYUSD amounts each user is trading
     * @return totalOutput Total WETH received from the batch
     */
    function executeBatchBuy(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyRelayer returns (uint256 totalOutput) {
        require(users.length == amounts.length, "Length mismatch");
        require(users.length > 0, "Empty batch");
        
        uint256 totalInput = 0;
        uint256 batchId = block.number;
        
        // Step 1: Deduct PYUSD from all users (PARALLEL SAFE!)
        for (uint i = 0; i < users.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            require(pyusdBalances[users[i]] >= amounts[i], "Insufficient balance");
            
            pyusdBalances[users[i]] -= amounts[i];
            totalInput += amounts[i];
        }
        
        // Step 2: Execute SINGLE swap on AMM with aggregated amount
        pyusd.approve(address(amm), totalInput);
        totalOutput = amm.swap(address(pyusd), totalInput, address(weth), 0);
        
        // Step 3: Distribute WETH proportionally to users (PARALLEL SAFE!)
        for (uint i = 0; i < users.length; i++) {
            // Calculate user's share of output
            uint256 userOutput = (totalOutput * amounts[i]) / totalInput;
            
            // Credit WETH to user
            wethBalances[users[i]] += userOutput;
            
            emit TradeExecuted(
                users[i],
                address(pyusd),
                address(weth),
                amounts[i],
                userOutput,
                block.timestamp
            );
        }
        
        emit BatchExecuted(batchId, users.length, totalInput, totalOutput, block.timestamp);
        return totalOutput;
    }
    
    /**
     * @notice Execute a batch of trades in parallel (WETH → PYUSD)
     * @dev This is called by the relayer when a broadcaster posts a SELL signal
     * @param users Array of user addresses to execute trades for
     * @param amounts Array of WETH amounts each user is trading
     * @return totalOutput Total PYUSD received from the batch
     */
    function executeBatchSell(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyRelayer returns (uint256 totalOutput) {
        require(users.length == amounts.length, "Length mismatch");
        require(users.length > 0, "Empty batch");
        
        uint256 totalInput = 0;
        uint256 batchId = block.number;
        
        // Step 1: Deduct WETH from all users (PARALLEL SAFE!)
        for (uint i = 0; i < users.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            require(wethBalances[users[i]] >= amounts[i], "Insufficient balance");
            
            wethBalances[users[i]] -= amounts[i];
            totalInput += amounts[i];
        }
        
        // Step 2: Execute SINGLE swap on AMM with aggregated amount
        weth.approve(address(amm), totalInput);
        totalOutput = amm.swap(address(weth), totalInput, address(pyusd), 0);
        
        // Step 3: Distribute PYUSD proportionally to users (PARALLEL SAFE!)
        for (uint i = 0; i < users.length; i++) {
            // Calculate user's share of output
            uint256 userOutput = (totalOutput * amounts[i]) / totalInput;
            
            // Credit PYUSD to user
            pyusdBalances[users[i]] += userOutput;
            
            emit TradeExecuted(
                users[i],
                address(weth),
                address(pyusd),
                amounts[i],
                userOutput,
                block.timestamp
            );
        }
        
        emit BatchExecuted(batchId, users.length, totalInput, totalOutput, block.timestamp);
        return totalOutput;
    }
    
    /**
     * @notice Get user's PYUSD balance
     * @param user Address to query
     * @return PYUSD balance
     */
    function getPYUSDBalance(address user) external view returns (uint256) {
        return pyusdBalances[user];
    }
    
    /**
     * @notice Get user's WETH balance
     * @param user Address to query
     * @return WETH balance
     */
    function getWETHBalance(address user) external view returns (uint256) {
        return wethBalances[user];
    }
    
    /**
     * @notice Get user's portfolio value in PYUSD
     * @param user Address to query
     * @return Total portfolio value
     */
    function getPortfolioValue(address user) external view returns (uint256) {
        uint256 pyusdBal = pyusdBalances[user];
        uint256 wethBal = wethBalances[user];
        
        if (wethBal == 0) {
            return pyusdBal;
        }
        
        // Get WETH value in PYUSD terms
        (uint256 reserveUSDC, uint256 reserveWETH) = amm.getReserves();
        if (reserveWETH == 0) {
            return pyusdBal;
        }
        
        uint256 wethValueInPYUSD = (wethBal * reserveUSDC) / reserveWETH;
        return pyusdBal + wethValueInPYUSD;
    }
    
    /**
     * @notice Update relayer address
     * @param newRelayer New relayer address
     */
    function updateRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid address");
        address oldRelayer = relayerAddress;
        relayerAddress = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }
    
    /**
     * @notice Emergency withdraw tokens (owner only)
     * @dev Only for emergencies, should not be used in normal operation
     */
    function emergencyWithdrawTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner, amount), "Transfer failed");
    }
}
