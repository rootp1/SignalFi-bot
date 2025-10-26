// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";
import "@arcologynetwork/concurrentlib/lib/map/AddressUint256.sol";

/**
 * @title ArcologyPYUSD
 * @notice Arcology-compatible PYUSD token using concurrent data structures
 * @dev Uses Arcology's concurrent library for parallel execution
 */
contract ArcologyPYUSD {
    // Token metadata
    string public constant name = "PayPal USD";
    string public constant symbol = "PYUSD";
    uint8 public constant decimals = 6;

    // Concurrent data structures
    U256Cumulative public totalSupply;
    AddressUint256Map public balances;
    mapping(address => mapping(address => U256Cumulative)) public allowances;

    // Owner and minters
    address public owner;
    mapping(address => bool) public minters;

    // Events - used to return values to frontend
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event BalanceQuery(address indexed account, uint256 balance);
    event AllowanceQuery(address indexed owner, address indexed spender, uint256 allowance);
    event TotalSupplyQuery(uint256 supply);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner, "Only minter");
        _;
    }

    constructor() {
        owner = msg.sender;
        minters[msg.sender] = true; // Owner is also a minter
        totalSupply = new U256Cumulative(0, type(uint256).max);
        balances = new AddressUint256Map();
    }
    
    /**
     * @notice Add a minter
     * @param minter Address to add as minter
     */
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @notice Remove a minter
     * @param minter Address to remove as minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @notice Query balance - returns via event
     * @param account Address to query
     */
    function balanceOf(address account) external {
        uint256 balance = balances.get(account);
        emit BalanceQuery(account, balance);
    }

    /**
     * @notice Query allowance - returns via event
     * @param _owner Owner address
     * @param spender Spender address
     */
    function allowance(address _owner, address spender) external {
        uint256 allowed = 0;
        if (address(allowances[_owner][spender]) != address(0)) {
            allowed = allowances[_owner][spender].get();
        }
        emit AllowanceQuery(_owner, spender, allowed);
    }

    /**
     * @notice Query total supply - returns via event
     */
    function getTotalSupply() external {
        emit TotalSupplyQuery(totalSupply.get());
    }

    /**
     * @notice Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        uint256 fromBalance = balances.get(msg.sender);
        require(fromBalance >= amount, "Insufficient balance");

        balances.set(msg.sender, fromBalance - amount);
        balances.set(to, balances.get(to) + amount);

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve spender
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Approve to zero address");

        if (address(allowances[msg.sender][spender]) == address(0)) {
            allowances[msg.sender][spender] = new U256Cumulative(0, type(uint256).max);
        }
        allowances[msg.sender][spender].add(amount);

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer from approved account
     * @param from Source address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");

        if (from != msg.sender && address(allowances[from][msg.sender]) != address(0)) {
            allowances[from][msg.sender].sub(amount);
        }

        uint256 fromBalance = balances.get(from);
        require(fromBalance >= amount, "Insufficient balance");

        balances.set(from, fromBalance - amount);
        balances.set(to, balances.get(to) + amount);

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Mint to zero address");

        balances.set(to, balances.get(to) + amount);
        totalSupply.add(amount);

        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
}
