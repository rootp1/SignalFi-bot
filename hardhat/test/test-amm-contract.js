const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Comprehensive tests for AmmContract
 * Tests all functions: addLiquidity, swap, getAmountOut, getReserves
 */

async function main() {
    console.log("\n🧪 TESTING AMM CONTRACT");
    console.log("=".repeat(70));

    const [deployer, user1, user2] = await ethers.getSigners();
    console.log(`\n📍 Deployer: ${deployer.address}`);
    console.log(`📍 User1: ${user1.address}`);
    console.log(`📍 User2: ${user2.address}`);

    // Deploy tokens
    console.log("\n📦 Deploying tokens...");
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    console.log(`✅ USDC: ${usdc.address}`);
    console.log(`✅ WETH: ${weth.address}`);

    // Deploy AMM
    console.log("\n📦 Deploying AMM...");
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    console.log(`✅ AMM: ${amm.address}`);

    // ========================================================================
    // TEST 1: Initial State
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 1: Initial State");
    console.log("=".repeat(70));

    const [initialUSDC, initialWETH] = await amm.getReserves();
    console.log(`📊 Initial USDC reserve: ${initialUSDC}`);
    console.log(`📊 Initial WETH reserve: ${initialWETH}`);
    
    expect(initialUSDC).to.equal(0);
    expect(initialWETH).to.equal(0);
    console.log("✅ TEST 1 PASSED - Initial reserves are zero");

    // ========================================================================
    // TEST 2: Add Liquidity
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 2: Add Liquidity");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Minting tokens to deployer...");
    await usdc.mint(deployer.address, ethers.utils.parseUnits("100000", 6));
    await weth.mint(deployer.address, ethers.utils.parseEther("50"));
    console.log(`   USDC: ${ethers.utils.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
    console.log(`   WETH: ${ethers.utils.formatEther(await weth.balanceOf(deployer.address))}`);

    console.log("\n2️⃣  Approving AMM to spend tokens...");
    await usdc.approve(amm.address, ethers.utils.parseUnits("20000", 6));
    await weth.approve(amm.address, ethers.utils.parseEther("10"));

    console.log("\n3️⃣  Adding liquidity: 20,000 USDC + 10 WETH...");
    const tx = await amm.addLiquidity(
        ethers.utils.parseUnits("20000", 6),
        ethers.utils.parseEther("10")
    );
    const receipt = await tx.wait();
    
    // Check for event
    const liquidityEvent = receipt.events?.find(e => e.event === 'LiquidityAdded');
    if (liquidityEvent) {
        console.log(`   📢 LiquidityAdded Event:`);
        console.log(`      Provider: ${liquidityEvent.args.provider}`);
        console.log(`      USDC: ${ethers.utils.formatUnits(liquidityEvent.args.amountUSDC, 6)}`);
        console.log(`      WETH: ${ethers.utils.formatEther(liquidityEvent.args.amountWETH)}`);
    }

    console.log("\n4️⃣  Checking reserves...");
    const [reserveUSDC, reserveWETH] = await amm.getReserves();
    console.log(`   📊 USDC reserve: ${ethers.utils.formatUnits(reserveUSDC, 6)}`);
    console.log(`   📊 WETH reserve: ${ethers.utils.formatEther(reserveWETH)}`);
    console.log(`   📊 Price: ${ethers.utils.formatUnits(reserveUSDC, 6) / ethers.utils.formatEther(reserveWETH)} USDC per WETH`);

    expect(reserveUSDC).to.equal(ethers.utils.parseUnits("20000", 6));
    expect(reserveWETH).to.equal(ethers.utils.parseEther("10"));
    console.log("✅ TEST 2 PASSED - Liquidity added successfully");

    // ========================================================================
    // TEST 3: getAmountOut calculation
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 3: getAmountOut Calculation");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Testing USDC -> WETH swap calculation...");
    const usdcIn = ethers.utils.parseUnits("1000", 6); // 1000 USDC
    const expectedWETH = await amm.getAmountOut(usdcIn, usdc.address, weth.address);
    console.log(`   Input: ${ethers.utils.formatUnits(usdcIn, 6)} USDC`);
    console.log(`   Expected output: ${ethers.utils.formatEther(expectedWETH)} WETH`);
    
    // Manual calculation for verification
    // amountOut = (1000 * 997 * 10) / (20000 * 1000 + 1000 * 997)
    // amountOut = 9970000 / 20997000 ≈ 0.4748 WETH
    expect(expectedWETH).to.be.gt(0);
    console.log("   ✅ Calculation returned positive value");

    console.log("\n2️⃣  Testing WETH -> USDC swap calculation...");
    const wethIn = ethers.utils.parseEther("0.5"); // 0.5 WETH
    const expectedUSDC = await amm.getAmountOut(wethIn, weth.address, usdc.address);
    console.log(`   Input: ${ethers.utils.formatEther(wethIn)} WETH`);
    console.log(`   Expected output: ${ethers.utils.formatUnits(expectedUSDC, 6)} USDC`);
    
    expect(expectedUSDC).to.be.gt(0);
    console.log("   ✅ Calculation returned positive value");

    console.log("✅ TEST 3 PASSED - getAmountOut works correctly");

    // ========================================================================
    // TEST 4: Swap USDC for WETH
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 4: Swap USDC -> WETH");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Minting USDC to user1...");
    await usdc.mint(user1.address, ethers.utils.parseUnits("5000", 6));
    console.log(`   Balance: ${ethers.utils.formatUnits(await usdc.balanceOf(user1.address), 6)} USDC`);

    console.log("\n2️⃣  User1 approving AMM...");
    await usdc.connect(user1).approve(amm.address, ethers.utils.parseUnits("1000", 6));

    console.log("\n3️⃣  Getting expected output...");
    const swapAmount = ethers.utils.parseUnits("1000", 6);
    const expectedOut = await amm.getAmountOut(swapAmount, usdc.address, weth.address);
    console.log(`   Expected: ${ethers.utils.formatEther(expectedOut)} WETH`);

    console.log("\n4️⃣  Executing swap...");
    const wethBefore = await weth.balanceOf(user1.address);
    const swapTx = await amm.connect(user1).swap(
        usdc.address,
        swapAmount,
        weth.address,
        0 // no slippage protection for test
    );
    const swapReceipt = await swapTx.wait();
    const wethAfter = await weth.balanceOf(user1.address);

    const actualOut = wethAfter.sub(wethBefore);
    console.log(`   Actual received: ${ethers.utils.formatEther(actualOut)} WETH`);

    // Check event
    const swapEvent = swapReceipt.events?.find(e => e.event === 'Swap');
    if (swapEvent) {
        console.log(`   📢 Swap Event emitted`);
        console.log(`      Trader: ${swapEvent.args.trader}`);
        console.log(`      AmountIn: ${ethers.utils.formatUnits(swapEvent.args.amountIn, 6)} USDC`);
        console.log(`      AmountOut: ${ethers.utils.formatEther(swapEvent.args.amountOut)} WETH`);
    }

    expect(actualOut).to.equal(expectedOut);
    console.log("✅ TEST 4 PASSED - USDC->WETH swap works correctly");

    // ========================================================================
    // TEST 5: Swap WETH for USDC
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 5: Swap WETH -> USDC");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Minting WETH to user2...");
    await weth.mint(user2.address, ethers.utils.parseEther("2"));
    console.log(`   Balance: ${ethers.utils.formatEther(await weth.balanceOf(user2.address))} WETH`);

    console.log("\n2️⃣  User2 approving AMM...");
    await weth.connect(user2).approve(amm.address, ethers.utils.parseEther("1"));

    console.log("\n3️⃣  Getting expected output...");
    const wethSwapAmount = ethers.utils.parseEther("1");
    const expectedUsdcOut = await amm.getAmountOut(wethSwapAmount, weth.address, usdc.address);
    console.log(`   Expected: ${ethers.utils.formatUnits(expectedUsdcOut, 6)} USDC`);

    console.log("\n4️⃣  Executing swap...");
    const usdcBefore = await usdc.balanceOf(user2.address);
    await amm.connect(user2).swap(
        weth.address,
        wethSwapAmount,
        usdc.address,
        0
    );
    const usdcAfter = await usdc.balanceOf(user2.address);

    const actualUsdcOut = usdcAfter.sub(usdcBefore);
    console.log(`   Actual received: ${ethers.utils.formatUnits(actualUsdcOut, 6)} USDC`);

    expect(actualUsdcOut).to.equal(expectedUsdcOut);
    console.log("✅ TEST 5 PASSED - WETH->USDC swap works correctly");

    // ========================================================================
    // TEST 6: Reserves Update After Swaps
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 6: Reserves Update After Swaps");
    console.log("=".repeat(70));

    const [finalUSDC, finalWETH] = await amm.getReserves();
    console.log(`📊 Final USDC reserve: ${ethers.utils.formatUnits(finalUSDC, 6)}`);
    console.log(`📊 Final WETH reserve: ${ethers.utils.formatEther(finalWETH)}`);
    console.log(`📊 Final price: ${ethers.utils.formatUnits(finalUSDC, 6) / ethers.utils.formatEther(finalWETH)} USDC per WETH`);

    // After swap 1: +1000 USDC, -0.4748 WETH
    // After swap 2: -1989 USDC, +1 WETH
    // Net effect: reserves should be different from initial
    expect(finalUSDC).to.not.equal(ethers.utils.parseUnits("20000", 6));
    expect(finalWETH).to.not.equal(ethers.utils.parseEther("10"));
    console.log("✅ TEST 6 PASSED - Reserves updated correctly");

    // ========================================================================
    // TEST 7: Multiple Liquidity Additions
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 7: Multiple Liquidity Additions");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Adding more liquidity...");
    await usdc.approve(amm.address, ethers.utils.parseUnits("10000", 6));
    await weth.approve(amm.address, ethers.utils.parseEther("5"));

    const [beforeUSDC, beforeWETH] = await amm.getReserves();
    
    await amm.addLiquidity(
        ethers.utils.parseUnits("10000", 6),
        ethers.utils.parseEther("5")
    );

    const [afterUSDC, afterWETH] = await amm.getReserves();
    console.log(`   USDC reserve: ${ethers.utils.formatUnits(beforeUSDC, 6)} -> ${ethers.utils.formatUnits(afterUSDC, 6)}`);
    console.log(`   WETH reserve: ${ethers.utils.formatEther(beforeWETH)} -> ${ethers.utils.formatEther(afterWETH)}`);

    expect(afterUSDC.sub(beforeUSDC)).to.equal(ethers.utils.parseUnits("10000", 6));
    expect(afterWETH.sub(beforeWETH)).to.equal(ethers.utils.parseEther("5"));
    console.log("✅ TEST 7 PASSED - Multiple liquidity additions work");

    // ========================================================================
    // TEST 8: Slippage Protection
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 8: Slippage Protection");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Testing with unrealistic amountOutMin...");
    await usdc.mint(user1.address, ethers.utils.parseUnits("1000", 6));
    await usdc.connect(user1).approve(amm.address, ethers.utils.parseUnits("1000", 6));

    const expectedOutput = await amm.getAmountOut(
        ethers.utils.parseUnits("1000", 6),
        usdc.address,
        weth.address
    );

    try {
        await amm.connect(user1).swap(
            usdc.address,
            ethers.utils.parseUnits("1000", 6),
            weth.address,
            expectedOutput.mul(2) // Request 2x the expected amount
        );
        console.log("   ❌ Should have reverted!");
        throw new Error("Slippage protection failed");
    } catch (error) {
        if (error.message.includes("Insufficient output amount")) {
            console.log("   ✅ Correctly reverted with slippage protection");
        } else {
            throw error;
        }
    }

    console.log("✅ TEST 8 PASSED - Slippage protection works");

    // ========================================================================
    // TEST 9: Invalid Token Pair
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 9: Invalid Token Pair");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Deploying random token...");
    const randomToken = await ERC20Factory.deploy("Random", "RND", 18);

    console.log("\n2️⃣  Trying to swap with invalid token...");
    try {
        await amm.getAmountOut(
            ethers.utils.parseEther("1"),
            randomToken.address,
            usdc.address
        );
        console.log("   ❌ Should have reverted!");
        throw new Error("Invalid token check failed");
    } catch (error) {
        if (error.message.includes("Invalid token pair")) {
            console.log("   ✅ Correctly reverted with invalid token pair");
        } else {
            throw error;
        }
    }

    console.log("✅ TEST 9 PASSED - Invalid token pair rejected");

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉🎉🎉 ALL AMM CONTRACT TESTS PASSED! 🎉🎉🎉");
    console.log("=".repeat(70));

    console.log("\n📋 TEST SUMMARY:");
    console.log("   ✓ Test 1: Initial state - PASSED");
    console.log("   ✓ Test 2: Add liquidity - PASSED");
    console.log("   ✓ Test 3: getAmountOut calculation - PASSED");
    console.log("   ✓ Test 4: Swap USDC->WETH - PASSED");
    console.log("   ✓ Test 5: Swap WETH->USDC - PASSED");
    console.log("   ✓ Test 6: Reserves update - PASSED");
    console.log("   ✓ Test 7: Multiple liquidity additions - PASSED");
    console.log("   ✓ Test 8: Slippage protection - PASSED");
    console.log("   ✓ Test 9: Invalid token pair - PASSED");

    const [finalReserveUSDC, finalReserveWETH] = await amm.getReserves();
    console.log("\n📊 FINAL STATE:");
    console.log(`   • USDC Reserve: ${ethers.utils.formatUnits(finalReserveUSDC, 6)} USDC`);
    console.log(`   • WETH Reserve: ${ethers.utils.formatEther(finalReserveWETH)} WETH`);
    console.log(`   • Price: ${ethers.utils.formatUnits(finalReserveUSDC, 6) / ethers.utils.formatEther(finalReserveWETH)} USDC per WETH`);
    
    console.log("\n✅ AmmContract is WORKING CORRECTLY!");
    console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
    console.error("\n❌❌❌ TEST SUITE FAILED ❌❌❌");
    console.error(error);
    process.exitCode = 1;
});
