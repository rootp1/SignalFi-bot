// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AmmContract {
    IERC20 public usdc;
    IERC20 public weth;

    uint256 public reserveUSDC;
    uint256 public reserveWETH;

    uint256 private constant FEE_DENOMINATOR = 1000;
    uint256 private constant FEE_NUMERATOR = 3; // 0.3% fee

    event LiquidityAdded(address indexed provider, uint256 amountUSDC, uint256 amountWETH);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _usdc, address _weth) {
        usdc = IERC20(_usdc);
        weth = IERC20(_weth);
    }

    function addLiquidity(uint256 amountUSDC, uint256 amountWETH) external returns (uint256) {
        require(amountUSDC > 0 && amountWETH > 0, "Amounts must be greater than 0");

        // Pull tokens from msg.sender
        require(usdc.transferFrom(msg.sender, address(this), amountUSDC), "USDC transfer failed");
        require(weth.transferFrom(msg.sender, address(this), amountWETH), "WETH transfer failed");

        // Update reserves
        reserveUSDC += amountUSDC;
        reserveWETH += amountWETH;

        emit LiquidityAdded(msg.sender, amountUSDC, amountWETH);

        // Return liquidity amount (simplified - in production would mint LP tokens)
        return amountUSDC;
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");

        // Validate tokens (must be usdc/weth)
        require(
            (tokenIn == address(usdc) && tokenOut == address(weth)) ||
            (tokenIn == address(weth) && tokenOut == address(usdc)),
            "Invalid token pair"
        );

        // Calculate amountOut using x*y=k with 0.3% fee
        amountOut = getAmountOut(amountIn, tokenIn, tokenOut);

        // Check slippage protection
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Pull tokenIn
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer in failed");

        // Send tokenOut
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "Transfer out failed");

        // Update reserves
        if (tokenIn == address(usdc)) {
            reserveUSDC += amountIn;
            reserveWETH -= amountOut;
        } else {
            reserveWETH += amountIn;
            reserveUSDC -= amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, tokenOut, amountOut);
    }

    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) public view returns (uint256) {
        require(
            (tokenIn == address(usdc) && tokenOut == address(weth)) ||
            (tokenIn == address(weth) && tokenOut == address(usdc)),
            "Invalid token pair"
        );

        uint256 reserveIn = tokenIn == address(usdc) ? reserveUSDC : reserveWETH;
        uint256 reserveOut = tokenOut == address(usdc) ? reserveUSDC : reserveWETH;

        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // Calculate using: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;

        return numerator / denominator;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveUSDC, reserveWETH);
    }
}
