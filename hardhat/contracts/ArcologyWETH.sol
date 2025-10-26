// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";
import "@arcologynetwork/concurrentlib/lib/map/AddressUint256.sol";

/**
 * @title ArcologyWETH
 * @notice Arcology-compatible WETH token using concurrent data structures
 */
contract ArcologyWETH {
    string public constant name = "Wrapped Ether";
    string public constant symbol = "WETH";
    uint8 public constant decimals = 18;

    U256Cumulative public totalSupply;
    AddressUint256Map public balances;
    mapping(address => mapping(address => U256Cumulative)) public allowances;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event BalanceQuery(address indexed account, uint256 balance);
    event AllowanceQuery(address indexed owner, address indexed spender, uint256 allowance);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = new U256Cumulative(0, type(uint256).max);
        balances = new AddressUint256Map();
    }

    function balanceOf(address account) external {
        emit BalanceQuery(account, balances.get(account));
    }

    function allowance(address _owner, address spender) external {
        uint256 allowed = 0;
        if (address(allowances[_owner][spender]) != address(0)) {
            allowed = allowances[_owner][spender].get();
        }
        emit AllowanceQuery(_owner, spender, allowed);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        uint256 fromBalance = balances.get(msg.sender);
        require(fromBalance >= amount, "Insufficient balance");

        balances.set(msg.sender, fromBalance - amount);
        balances.set(to, balances.get(to) + amount);

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Approve to zero address");
        
        if (address(allowances[msg.sender][spender]) == address(0)) {
            allowances[msg.sender][spender] = new U256Cumulative(0, type(uint256).max);
        }
        allowances[msg.sender][spender].add(amount);
        
        emit Approval(msg.sender, spender, amount);
        return true;
    }

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

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Mint to zero address");
        balances.set(to, balances.get(to) + amount);
        totalSupply.add(amount);
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
}
