const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Comprehensive tests for MockERC20
 * Tests: mint, transfer, approve, transferFrom, balanceOf, decimals
 */

async function main() {
    console.log("\n🧪 TESTING MOCKERC20 CONTRACT");
    console.log("=".repeat(70));

    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log(`\n📍 Deployer: ${deployer.address}`);
    console.log(`📍 User1: ${user1.address}`);
    console.log(`📍 User2: ${user2.address}`);
    console.log(`📍 User3: ${user3.address}`);

    // ========================================================================
    // TEST 1: Deploy with Different Decimals
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 1: Deploy with Different Decimals");
    console.log("=".repeat(70));

    const ERC20Factory = await ethers.getContractFactory("MockERC20");

    console.log("\n1️⃣  Deploying USDC with 6 decimals...");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    console.log(`   Address: ${usdc.address}`);
    console.log(`   Name: ${await usdc.name()}`);
    console.log(`   Symbol: ${await usdc.symbol()}`);
    console.log(`   Decimals: ${await usdc.decimals()}`);
    expect(await usdc.decimals()).to.equal(6);

    console.log("\n2️⃣  Deploying WETH with 18 decimals...");
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    console.log(`   Address: ${weth.address}`);
    console.log(`   Name: ${await weth.name()}`);
    console.log(`   Symbol: ${await weth.symbol()}`);
    console.log(`   Decimals: ${await weth.decimals()}`);
    expect(await weth.decimals()).to.equal(18);

    console.log("\n3️⃣  Deploying custom token with 8 decimals...");
    const custom = await ERC20Factory.deploy("Custom Token", "CSTM", 8);
    console.log(`   Decimals: ${await custom.decimals()}`);
    expect(await custom.decimals()).to.equal(8);

    console.log("✅ TEST 1 PASSED - Tokens deployed with correct decimals");

    // ========================================================================
    // TEST 2: Mint Function
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 2: Mint Function");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Minting 1000 USDC to user1...");
    await usdc.mint(user1.address, ethers.utils.parseUnits("1000", 6));
    const user1Balance = await usdc.balanceOf(user1.address);
    console.log(`   Balance: ${ethers.utils.formatUnits(user1Balance, 6)} USDC`);
    expect(user1Balance).to.equal(ethers.utils.parseUnits("1000", 6));

    console.log("\n2️⃣  Minting 50 WETH to user2...");
    await weth.mint(user2.address, ethers.utils.parseEther("50"));
    const user2Balance = await weth.balanceOf(user2.address);
    console.log(`   Balance: ${ethers.utils.formatEther(user2Balance)} WETH`);
    expect(user2Balance).to.equal(ethers.utils.parseEther("50"));

    console.log("\n3️⃣  Multiple mints to same address...");
    await usdc.mint(user1.address, ethers.utils.parseUnits("500", 6));
    const updatedBalance = await usdc.balanceOf(user1.address);
    console.log(`   Updated balance: ${ethers.utils.formatUnits(updatedBalance, 6)} USDC`);
    expect(updatedBalance).to.equal(ethers.utils.parseUnits("1500", 6));

    console.log("✅ TEST 2 PASSED - Mint function works correctly");

    // ========================================================================
    // TEST 3: Transfer Function
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 3: Transfer Function");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User1 transferring 200 USDC to user2...");
    const user1Before = await usdc.balanceOf(user1.address);
    const user2Before = await usdc.balanceOf(user2.address);
    
    await usdc.connect(user1).transfer(user2.address, ethers.utils.parseUnits("200", 6));
    
    const user1After = await usdc.balanceOf(user1.address);
    const user2After = await usdc.balanceOf(user2.address);
    
    console.log(`   User1: ${ethers.utils.formatUnits(user1Before, 6)} -> ${ethers.utils.formatUnits(user1After, 6)} USDC`);
    console.log(`   User2: ${ethers.utils.formatUnits(user2Before, 6)} -> ${ethers.utils.formatUnits(user2After, 6)} USDC`);
    
    expect(user1After).to.equal(user1Before.sub(ethers.utils.parseUnits("200", 6)));
    expect(user2After).to.equal(user2Before.add(ethers.utils.parseUnits("200", 6)));

    console.log("\n2️⃣  Testing transfer to new address...");
    await usdc.connect(user1).transfer(user3.address, ethers.utils.parseUnits("100", 6));
    const user3Balance = await usdc.balanceOf(user3.address);
    console.log(`   User3 balance: ${ethers.utils.formatUnits(user3Balance, 6)} USDC`);
    expect(user3Balance).to.equal(ethers.utils.parseUnits("100", 6));

    console.log("✅ TEST 3 PASSED - Transfer function works correctly");

    // ========================================================================
    // TEST 4: Approve and Allowance
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 4: Approve and Allowance");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User1 approving user2 to spend 500 USDC...");
    await usdc.connect(user1).approve(user2.address, ethers.utils.parseUnits("500", 6));
    const allowance = await usdc.allowance(user1.address, user2.address);
    console.log(`   Allowance: ${ethers.utils.formatUnits(allowance, 6)} USDC`);
    expect(allowance).to.equal(ethers.utils.parseUnits("500", 6));

    console.log("\n2️⃣  Checking initial allowance for user3...");
    const initialAllowance = await usdc.allowance(user1.address, user3.address);
    console.log(`   Initial allowance: ${initialAllowance}`);
    expect(initialAllowance).to.equal(0);

    console.log("\n3️⃣  Updating allowance...");
    await usdc.connect(user1).approve(user2.address, ethers.utils.parseUnits("1000", 6));
    const updatedAllowance = await usdc.allowance(user1.address, user2.address);
    console.log(`   Updated allowance: ${ethers.utils.formatUnits(updatedAllowance, 6)} USDC`);
    expect(updatedAllowance).to.equal(ethers.utils.parseUnits("1000", 6));

    console.log("✅ TEST 4 PASSED - Approve and allowance work correctly");

    // ========================================================================
    // TEST 5: TransferFrom Function
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 5: TransferFrom Function");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User2 using allowance to transfer from user1...");
    const user1BeforeTransfer = await usdc.balanceOf(user1.address);
    const user3BeforeTransfer = await usdc.balanceOf(user3.address);
    const allowanceBefore = await usdc.allowance(user1.address, user2.address);
    
    console.log(`   User1 balance: ${ethers.utils.formatUnits(user1BeforeTransfer, 6)} USDC`);
    console.log(`   User3 balance: ${ethers.utils.formatUnits(user3BeforeTransfer, 6)} USDC`);
    console.log(`   Allowance: ${ethers.utils.formatUnits(allowanceBefore, 6)} USDC`);

    await usdc.connect(user2).transferFrom(
        user1.address,
        user3.address,
        ethers.utils.parseUnits("300", 6)
    );

    const user1AfterTransfer = await usdc.balanceOf(user1.address);
    const user3AfterTransfer = await usdc.balanceOf(user3.address);
    const allowanceAfter = await usdc.allowance(user1.address, user2.address);
    
    console.log(`   User1 balance: ${ethers.utils.formatUnits(user1AfterTransfer, 6)} USDC`);
    console.log(`   User3 balance: ${ethers.utils.formatUnits(user3AfterTransfer, 6)} USDC`);
    console.log(`   Remaining allowance: ${ethers.utils.formatUnits(allowanceAfter, 6)} USDC`);

    expect(user1AfterTransfer).to.equal(user1BeforeTransfer.sub(ethers.utils.parseUnits("300", 6)));
    expect(user3AfterTransfer).to.equal(user3BeforeTransfer.add(ethers.utils.parseUnits("300", 6)));
    expect(allowanceAfter).to.equal(allowanceBefore.sub(ethers.utils.parseUnits("300", 6)));

    console.log("✅ TEST 5 PASSED - TransferFrom works correctly");

    // ========================================================================
    // TEST 6: Total Supply
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 6: Total Supply");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Checking total supply...");
    const totalSupply = await usdc.totalSupply();
    console.log(`   Total supply: ${ethers.utils.formatUnits(totalSupply, 6)} USDC`);

    console.log("\n2️⃣  Minting more tokens...");
    await usdc.mint(deployer.address, ethers.utils.parseUnits("10000", 6));
    const newTotalSupply = await usdc.totalSupply();
    console.log(`   New total supply: ${ethers.utils.formatUnits(newTotalSupply, 6)} USDC`);
    
    expect(newTotalSupply).to.equal(totalSupply.add(ethers.utils.parseUnits("10000", 6)));

    console.log("✅ TEST 6 PASSED - Total supply tracked correctly");

    // ========================================================================
    // TEST 7: Balance Queries
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 7: Balance Queries");
    console.log("=".repeat(70));

    console.log("\n📊 Current balances:");
    const balances = {
        deployer: await usdc.balanceOf(deployer.address),
        user1: await usdc.balanceOf(user1.address),
        user2: await usdc.balanceOf(user2.address),
        user3: await usdc.balanceOf(user3.address)
    };

    console.log(`   Deployer: ${ethers.utils.formatUnits(balances.deployer, 6)} USDC`);
    console.log(`   User1: ${ethers.utils.formatUnits(balances.user1, 6)} USDC`);
    console.log(`   User2: ${ethers.utils.formatUnits(balances.user2, 6)} USDC`);
    console.log(`   User3: ${ethers.utils.formatUnits(balances.user3, 6)} USDC`);

    const sum = balances.deployer.add(balances.user1).add(balances.user2).add(balances.user3);
    console.log(`\n   Sum of all balances: ${ethers.utils.formatUnits(sum, 6)} USDC`);
    console.log(`   Total supply: ${ethers.utils.formatUnits(await usdc.totalSupply(), 6)} USDC`);
    
    expect(sum).to.equal(await usdc.totalSupply());

    console.log("✅ TEST 7 PASSED - Balances sum equals total supply");

    // ========================================================================
    // TEST 8: Zero Address Handling
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 8: Zero Address Handling");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Checking balance of zero address...");
    const zeroBalance = await usdc.balanceOf(ethers.constants.AddressZero);
    console.log(`   Zero address balance: ${zeroBalance}`);
    expect(zeroBalance).to.equal(0);

    console.log("✅ TEST 8 PASSED - Zero address handled correctly");

    // ========================================================================
    // TEST 9: Large Numbers
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 9: Large Numbers");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Minting very large amount...");
    const largeAmount = ethers.utils.parseUnits("1000000000", 6); // 1 billion USDC
    await usdc.mint(deployer.address, largeAmount);
    const largeBalance = await usdc.balanceOf(deployer.address);
    console.log(`   Balance: ${ethers.utils.formatUnits(largeBalance, 6)} USDC`);
    expect(largeBalance).to.be.gte(largeAmount);

    console.log("✅ TEST 9 PASSED - Large numbers handled correctly");

    // ========================================================================
    // TEST 10: Different Decimal Tokens
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 10: Different Decimal Tokens");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Testing 18 decimal token (WETH)...");
    await weth.mint(user1.address, ethers.utils.parseEther("100"));
    const wethBalance = await weth.balanceOf(user1.address);
    console.log(`   WETH balance: ${ethers.utils.formatEther(wethBalance)} WETH`);
    expect(wethBalance).to.be.gte(ethers.utils.parseEther("100")); // Should have at least 100

    console.log("\n2️⃣  Testing 8 decimal token (CUSTOM)...");
    await custom.mint(user1.address, ethers.utils.parseUnits("1000", 8));
    const customBalance = await custom.balanceOf(user1.address);
    console.log(`   CUSTOM balance: ${ethers.utils.formatUnits(customBalance, 8)} CSTM`);
    expect(customBalance).to.equal(ethers.utils.parseUnits("1000", 8));

    console.log("✅ TEST 10 PASSED - Different decimal tokens work correctly");

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉🎉🎉 ALL MOCKERC20 TESTS PASSED! 🎉🎉🎉");
    console.log("=".repeat(70));

    console.log("\n📋 TEST SUMMARY:");
    console.log("   ✓ Test 1: Deploy with different decimals - PASSED");
    console.log("   ✓ Test 2: Mint function - PASSED");
    console.log("   ✓ Test 3: Transfer function - PASSED");
    console.log("   ✓ Test 4: Approve and allowance - PASSED");
    console.log("   ✓ Test 5: TransferFrom function - PASSED");
    console.log("   ✓ Test 6: Total supply - PASSED");
    console.log("   ✓ Test 7: Balance queries - PASSED");
    console.log("   ✓ Test 8: Zero address handling - PASSED");
    console.log("   ✓ Test 9: Large numbers - PASSED");
    console.log("   ✓ Test 10: Different decimal tokens - PASSED");

    console.log("\n📊 FINAL TOKEN INFO:");
    console.log(`   • USDC (6 decimals): ${ethers.utils.formatUnits(await usdc.totalSupply(), 6)} total supply`);
    console.log(`   • WETH (18 decimals): ${ethers.utils.formatEther(await weth.totalSupply())} total supply`);
    console.log(`   • CUSTOM (8 decimals): ${ethers.utils.formatUnits(await custom.totalSupply(), 8)} total supply`);
    
    console.log("\n✅ MockERC20 is WORKING CORRECTLY!");
    console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
    console.error("\n❌❌❌ TEST SUITE FAILED ❌❌❌");
    console.error(error);
    process.exitCode = 1;
});
