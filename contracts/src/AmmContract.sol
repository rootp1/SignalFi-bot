// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IAmm
 * @notice Interface for our simple AMM.
 * The SettlementContract will call this.
 */
interface IAmm {
    /**
     * @dev Swaps an exact amount of tokenIn for tokenOut.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) external returns (bool success);

    /**
     * @dev Adds liquidity.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external;
}

/**
 * @title AmmContract
 * @notice A simple, mock AMM for the hackathon.
 * In a real project, this would be a Uniswap V2/V3 pool.
 */
contract AmmContract is IAmm {
    address public tokenA;
    address public tokenB;

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /**
     * @dev A mock swap function.
     * It just accepts the tokens and returns true.
     * This is enough for our Relayer to call.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) external override returns (bool success) {
        // 1. Validate the pair
        require(
            (tokenIn == tokenA && tokenOut == tokenB) ||
                (tokenIn == tokenB && tokenOut == tokenA),
            "Invalid pair"
        );

        // 2. Pull the tokens from the caller (which will be our SettlementContract)
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // 3. TODO: In a real AMM, we would calculate the amountOut based on reserves.
        // For the hackathon, we can just pretend we calculated the swap and leave the tokens here.
        // The core test is that the SettlementContract *can call* this function.

        return true;
    }

    /**
     * @dev Mock addLiquidity function.
     */
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB
    ) external override {
        // Mock: just pull the tokens to "fund" the pool
        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);
        IERC20(_tokenB).transferFrom(msg.sender, address(this), _amountB);
    }
}
