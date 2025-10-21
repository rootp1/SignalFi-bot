// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";
import "./AmmContract.sol";

contract SettlementContract {
    IERC20 public usdc;
    IERC20 public weth;
    AmmContract public amm;

    address public relayerAddress;
    address public broadcasterAddress;

    // CONCURRENT-SAFE: Use concurrent data structure for deposits
    mapping(address => U256Cumulative) private depositsMap;

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
        amm = AmmContract(_amm);
        relayerAddress = _relayer;
        broadcasterAddress = _broadcaster;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayerAddress) revert OnlyRelayer();
        _;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Concurrent-safe deposit update
        if (address(depositsMap[msg.sender]) == address(0)) {
            depositsMap[msg.sender] = new U256Cumulative(0, type(uint256).max);
        }
        depositsMap[msg.sender].add(amount);

        emit Deposit(msg.sender, amount);
    }

    function getDeposit(address user) public view returns (uint256) {
        if (address(depositsMap[user]) == address(0)) return 0;
        return depositsMap[user].get();
    }

    function settleTrades(bytes[] calldata bundled_agreements) external onlyRelayer {
        // Decode agreement structure: (address trader, bool isBuy, uint256 amount, uint8 v, bytes32 r, bytes32 s)

        // Step 1: Signature Validation
        uint256 validTradeCount = 0;
        address[] memory traders = new address[](bundled_agreements.length);
        bool[] memory isBuyFlags = new bool[](bundled_agreements.length);
        uint256[] memory amounts = new uint256[](bundled_agreements.length);

        for (uint256 i = 0; i < bundled_agreements.length; i++) {
            (address trader, bool isBuy, uint256 amount, uint8 v, bytes32 r, bytes32 s) =
                abi.decode(bundled_agreements[i], (address, bool, uint256, uint8, bytes32, bytes32));

            // Verify signature (message hash should include trader, isBuy, amount)
            bytes32 messageHash = keccak256(abi.encodePacked(trader, isBuy, amount));
            bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
            address signer = ecrecover(ethSignedMessageHash, v, r, s);

            require(signer == trader, "Invalid signature");

            traders[validTradeCount] = trader;
            isBuyFlags[validTradeCount] = isBuy;
            amounts[validTradeCount] = amount;
            validTradeCount++;
        }

        // Step 2: Trade Aggregation
        uint256 totalBuyAmount = 0;  // USDC to spend
        uint256 totalSellAmount = 0; // WETH to spend

        for (uint256 i = 0; i < validTradeCount; i++) {
            if (isBuyFlags[i]) {
                totalBuyAmount += amounts[i]; // Buying WETH with USDC
            } else {
                totalSellAmount += amounts[i]; // Selling WETH for USDC
            }
        }

        // Step 3: Execute Net Swap on AMM
        uint256 amountOut;
        bool netIsBuy = totalBuyAmount > totalSellAmount;

        if (netIsBuy && totalBuyAmount > totalSellAmount) {
            uint256 netAmountIn = totalBuyAmount - totalSellAmount;
            usdc.approve(address(amm), netAmountIn);
            amountOut = amm.swap(address(usdc), netAmountIn, address(weth), 0);
        } else if (!netIsBuy && totalSellAmount > totalBuyAmount) {
            uint256 netAmountIn = totalSellAmount - totalBuyAmount;
            weth.approve(address(amm), netAmountIn);
            amountOut = amm.swap(address(weth), netAmountIn, address(usdc), 0);
        } else {
            // Perfectly balanced, no swap needed
            amountOut = 0;
        }

        // Step 4: Update Deposits (CONCURRENT-SAFE)
        for (uint256 i = 0; i < validTradeCount; i++) {
            address trader = traders[i];

            // Initialize if needed
            if (address(depositsMap[trader]) == address(0)) {
                depositsMap[trader] = new U256Cumulative(0, type(uint256).max);
            }

            // Deduct cost, credit proceeds (concurrent-safe operations)
            if (isBuyFlags[i]) {
                // Deduct USDC cost
                uint256 cost = amounts[i];
                require(depositsMap[trader].get() >= cost, "Insufficient deposit");
                depositsMap[trader].sub(cost);

                // Credit WETH proceeds (proportional)
                if (totalBuyAmount > 0) {
                    // uint256 wethShare = (amounts[i] * amountOut) / totalBuyAmount;
                    // In a full implementation, would track WETH deposits separately
                    // For now, convert to USDC equivalent or track separately
                }
            } else {
                // Deduct WETH (would need WETH deposits tracking)
                // Credit USDC proceeds
                if (totalSellAmount > 0) {
                    uint256 usdcShare = (amounts[i] * amountOut) / totalSellAmount;
                    depositsMap[trader].add(usdcShare);
                }
            }

            emit TradeSettled(trader, isBuyFlags[i], amounts[i]);
        }
    }

    function forceWithdraw(bytes calldata signed_withdrawal_message) external {
        // Decode: (address user, uint256 amount, uint8 v, bytes32 r, bytes32 s)
        (address user, uint256 amount, uint8 v, bytes32 r, bytes32 s) =
            abi.decode(signed_withdrawal_message, (address, uint256, uint8, bytes32, bytes32));

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(user, amount));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        require(signer == user, "Invalid signature");

        // Check balance
        require(address(depositsMap[user]) != address(0), "No deposits");
        require(depositsMap[user].get() >= amount, "Insufficient balance");

        // Concurrent-safe withdrawal
        depositsMap[user].sub(amount);
        require(usdc.transfer(user, amount), "Transfer failed");

        emit Withdraw(user, amount);
    }
}
