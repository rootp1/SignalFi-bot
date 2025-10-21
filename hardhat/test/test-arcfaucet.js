const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Comprehensive tests for ARCFaucet
 * Tests: fundFaucet, claimARC, getFaucetBalance, getTimeUntilNextClaim
 */

async function main() {
    console.log("\n🧪 TESTING ARCFAUCET CONTRACT");
    console.log("=".repeat(70));

    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log(`\n📍 Deployer: ${deployer.address}`);
    console.log(`📍 User1: ${user1.address}`);
    console.log(`📍 User2: ${user2.address}`);
    console.log(`📍 User3: ${user3.address}`);

    // ========================================================================
    // TEST 1: Deploy Faucet
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 1: Deploy Faucet");
    console.log("=".repeat(70));

    const FaucetFactory = await ethers.getContractFactory("ARCFaucet");
    const faucet = await FaucetFactory.deploy();
    await faucet.deployed();
    
    console.log(`✅ Faucet deployed at: ${faucet.address}`);
    console.log(`📊 CLAIM_AMOUNT: ${ethers.utils.formatEther(await faucet.CLAIM_AMOUNT())} ARC`);
    console.log(`📊 COOLDOWN_TIME: ${await faucet.COOLDOWN_TIME()} seconds`);

    const initialBalance = await ethers.provider.getBalance(faucet.address);
    console.log(`📊 Initial balance: ${ethers.utils.formatEther(initialBalance)} ARC`);
    expect(initialBalance).to.equal(0);

    console.log("✅ TEST 1 PASSED - Faucet deployed with correct parameters");

    // ========================================================================
    // TEST 2: Fund Faucet via fundFaucet()
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 2: Fund Faucet via fundFaucet()");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Funding faucet with 1000 ARC...");
    const fundAmount = ethers.utils.parseEther("1000");
    const tx = await faucet.fundFaucet({ value: fundAmount });
    const receipt = await tx.wait();

    // Check for event
    const fundEvent = receipt.events?.find(e => e.event === 'FaucetFunded');
    if (fundEvent) {
        console.log(`   📢 FaucetFunded Event:`);
        console.log(`      Funder: ${fundEvent.args.funder}`);
        console.log(`      Amount: ${ethers.utils.formatEther(fundEvent.args.amount)} ARC`);
    }

    const balanceAfterFunding = await faucet.getFaucetBalance();
    console.log(`   📊 Faucet balance: ${ethers.utils.formatEther(balanceAfterFunding)} ARC`);
    expect(balanceAfterFunding).to.equal(fundAmount);

    console.log("✅ TEST 2 PASSED - Faucet funded successfully via fundFaucet()");

    // ========================================================================
    // TEST 3: Fund Faucet via receive()
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 3: Fund Faucet via receive() fallback");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Sending 500 ARC directly to faucet...");
    const directFundAmount = ethers.utils.parseEther("500");
    const directTx = await deployer.sendTransaction({
        to: faucet.address,
        value: directFundAmount
    });
    await directTx.wait();

    const balanceAfterDirect = await faucet.getFaucetBalance();
    console.log(`   📊 Faucet balance: ${ethers.utils.formatEther(balanceAfterDirect)} ARC`);
    expect(balanceAfterDirect).to.equal(fundAmount.add(directFundAmount));

    console.log("✅ TEST 3 PASSED - Faucet accepts direct transfers via receive()");

    // ========================================================================
    // TEST 4: First User Claims ARC
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 4: First User Claims ARC");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User1 claiming ARC...");
    const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
    const faucetBalanceBefore = await faucet.getFaucetBalance();
    console.log(`   User1 balance before: ${ethers.utils.formatEther(user1BalanceBefore)} ARC`);
    console.log(`   Faucet balance before: ${ethers.utils.formatEther(faucetBalanceBefore)} ARC`);

    const claimTx = await faucet.connect(user1).claimARC();
    const claimReceipt = await claimTx.wait();
    
    // Calculate gas cost
    const gasCost = claimReceipt.gasUsed.mul(claimReceipt.effectiveGasPrice);

    const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
    const faucetBalanceAfter = await faucet.getFaucetBalance();
    console.log(`   User1 balance after: ${ethers.utils.formatEther(user1BalanceAfter)} ARC`);
    console.log(`   Faucet balance after: ${ethers.utils.formatEther(faucetBalanceAfter)} ARC`);

    // Check event
    const claimEvent = claimReceipt.events?.find(e => e.event === 'ARCClaimed');
    if (claimEvent) {
        console.log(`   📢 ARCClaimed Event:`);
        console.log(`      User: ${claimEvent.args.user}`);
        console.log(`      Amount: ${ethers.utils.formatEther(claimEvent.args.amount)} ARC`);
    }

    const expectedUserBalance = user1BalanceBefore.add(ethers.utils.parseEther("10")).sub(gasCost);
    const actualDifference = user1BalanceAfter.sub(user1BalanceBefore).add(gasCost);
    
    console.log(`   📊 Claimed amount (excluding gas): ${ethers.utils.formatEther(actualDifference)} ARC`);
    expect(actualDifference).to.equal(ethers.utils.parseEther("10"));
    expect(faucetBalanceAfter).to.equal(faucetBalanceBefore.sub(ethers.utils.parseEther("10")));

    console.log("✅ TEST 4 PASSED - User1 claimed 10 ARC successfully");

    // ========================================================================
    // TEST 5: Multiple Users Claim
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 5: Multiple Users Claim");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User2 claiming ARC...");
    await faucet.connect(user2).claimARC();
    const user2Balance = await ethers.provider.getBalance(user2.address);
    console.log(`   User2 balance: ${ethers.utils.formatEther(user2Balance)} ARC`);

    console.log("\n2️⃣  User3 claiming ARC...");
    await faucet.connect(user3).claimARC();
    const user3Balance = await ethers.provider.getBalance(user3.address);
    console.log(`   User3 balance: ${ethers.utils.formatEther(user3Balance)} ARC`);

    const faucetBalanceAfterMultiple = await faucet.getFaucetBalance();
    console.log(`\n   📊 Faucet balance: ${ethers.utils.formatEther(faucetBalanceAfterMultiple)} ARC`);
    console.log(`   📊 Total claimed: ${ethers.utils.formatEther(faucetBalanceBefore.sub(faucetBalanceAfterMultiple))} ARC`);

    expect(faucetBalanceAfterMultiple).to.equal(faucetBalanceBefore.sub(ethers.utils.parseEther("30")));

    console.log("✅ TEST 5 PASSED - Multiple users claimed successfully");

    // ========================================================================
    // TEST 6: Check Last Claim Time
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 6: Check Last Claim Time");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Checking last claim times...");
    const user1LastClaim = await faucet.lastClaimTime(user1.address);
    const user2LastClaim = await faucet.lastClaimTime(user2.address);
    const user3LastClaim = await faucet.lastClaimTime(user3.address);
    
    console.log(`   User1 last claim: ${user1LastClaim} (timestamp)`);
    console.log(`   User2 last claim: ${user2LastClaim} (timestamp)`);
    console.log(`   User3 last claim: ${user3LastClaim} (timestamp)`);

    expect(user1LastClaim).to.be.gt(0);
    expect(user2LastClaim).to.be.gt(0);
    expect(user3LastClaim).to.be.gt(0);

    console.log("\n2️⃣  Checking time until next claim...");
    const user1NextClaim = await faucet.getTimeUntilNextClaim(user1.address);
    console.log(`   User1 can claim again in: ${user1NextClaim} seconds`);
    
    // Since COOLDOWN_TIME is 0, user should be able to claim immediately
    expect(user1NextClaim).to.equal(0);

    console.log("✅ TEST 6 PASSED - Last claim times tracked correctly");

    // ========================================================================
    // TEST 7: Immediate Re-claim (No Cooldown)
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 7: Immediate Re-claim (No Cooldown)");
    console.log("=".repeat(70));

    console.log("\n1️⃣  User1 claiming again immediately...");
    const balanceBeforeReclaim = await faucet.getFaucetBalance();
    await faucet.connect(user1).claimARC();
    const balanceAfterReclaim = await faucet.getFaucetBalance();
    
    console.log(`   Faucet balance: ${ethers.utils.formatEther(balanceBeforeReclaim)} -> ${ethers.utils.formatEther(balanceAfterReclaim)} ARC`);
    expect(balanceAfterReclaim).to.equal(balanceBeforeReclaim.sub(ethers.utils.parseEther("10")));

    console.log("✅ TEST 7 PASSED - Immediate re-claim works (no cooldown)");

    // ========================================================================
    // TEST 8: Faucet Empty Scenario
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 8: Faucet Empty Scenario");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Draining faucet...");
    let currentBalance = await faucet.getFaucetBalance();
    console.log(`   Current balance: ${ethers.utils.formatEther(currentBalance)} ARC`);

    // Claim until faucet is nearly empty
    let claimCount = 0;
    while (currentBalance.gte(ethers.utils.parseEther("10"))) {
        await faucet.connect(user1).claimARC();
        currentBalance = await faucet.getFaucetBalance();
        claimCount++;
        if (claimCount % 10 === 0) {
            console.log(`   Claimed ${claimCount} times, balance: ${ethers.utils.formatEther(currentBalance)} ARC`);
        }
    }
    
    console.log(`   Final balance: ${ethers.utils.formatEther(currentBalance)} ARC`);
    console.log(`   Total claims made: ${claimCount}`);

    console.log("\n2️⃣  Attempting to claim when faucet is empty...");
    try {
        await faucet.connect(user2).claimARC();
        console.log("   ❌ Should have reverted!");
        throw new Error("Empty faucet check failed");
    } catch (error) {
        if (error.message.includes("Faucet is empty")) {
            console.log("   ✅ Correctly reverted with 'Faucet is empty'");
        } else {
            throw error;
        }
    }

    console.log("✅ TEST 8 PASSED - Empty faucet handled correctly");

    // ========================================================================
    // TEST 9: Refill and Continue
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 9: Refill and Continue");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Refilling faucet with 500 ARC...");
    await faucet.fundFaucet({ value: ethers.utils.parseEther("500") });
    const refilledBalance = await faucet.getFaucetBalance();
    console.log(`   New balance: ${ethers.utils.formatEther(refilledBalance)} ARC`);

    console.log("\n2️⃣  User claiming from refilled faucet...");
    await faucet.connect(user2).claimARC();
    const balanceAfterClaim = await faucet.getFaucetBalance();
    console.log(`   Balance after claim: ${ethers.utils.formatEther(balanceAfterClaim)} ARC`);
    
    expect(balanceAfterClaim).to.equal(refilledBalance.sub(ethers.utils.parseEther("10")));

    console.log("✅ TEST 9 PASSED - Refill and continue works correctly");

    // ========================================================================
    // TEST 10: Multiple Funders
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 10: Multiple Funders");
    console.log("=".repeat(70));

    console.log("\n1️⃣  Deployer funding...");
    await faucet.connect(deployer).fundFaucet({ value: ethers.utils.parseEther("100") });
    const balanceAfterDeployer = await faucet.getFaucetBalance();

    console.log("\n2️⃣  User1 funding...");
    await faucet.connect(user1).fundFaucet({ value: ethers.utils.parseEther("50") });
    const balanceAfterUser1 = await faucet.getFaucetBalance();

    console.log("\n3️⃣  User2 funding...");
    await faucet.connect(user2).fundFaucet({ value: ethers.utils.parseEther("25") });
    const finalBalance = await faucet.getFaucetBalance();

    console.log(`\n   📊 Balance progression:`);
    console.log(`      After deployer: ${ethers.utils.formatEther(balanceAfterDeployer)} ARC`);
    console.log(`      After user1: ${ethers.utils.formatEther(balanceAfterUser1)} ARC`);
    console.log(`      After user2: ${ethers.utils.formatEther(finalBalance)} ARC`);

    expect(finalBalance).to.be.gt(balanceAfterDeployer);

    console.log("✅ TEST 10 PASSED - Multiple funders work correctly");

    // ========================================================================
    // TEST 11: Get Faucet Balance Function
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 11: Get Faucet Balance Function");
    console.log("=".repeat(70));

    const faucetBalance = await faucet.getFaucetBalance();
    const providerBalance = await ethers.provider.getBalance(faucet.address);
    
    console.log(`   getFaucetBalance(): ${ethers.utils.formatEther(faucetBalance)} ARC`);
    console.log(`   provider.getBalance(): ${ethers.utils.formatEther(providerBalance)} ARC`);
    
    expect(faucetBalance).to.equal(providerBalance);

    console.log("✅ TEST 11 PASSED - getFaucetBalance returns correct value");

    // ========================================================================
    // TEST 12: Estimate Maximum Claims
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("TEST 12: Estimate Maximum Claims");
    console.log("=".repeat(70));

    const currentFaucetBalance = await faucet.getFaucetBalance();
    const claimAmount = await faucet.CLAIM_AMOUNT();
    const maxClaims = currentFaucetBalance.div(claimAmount);
    
    console.log(`   Current balance: ${ethers.utils.formatEther(currentFaucetBalance)} ARC`);
    console.log(`   Claim amount: ${ethers.utils.formatEther(claimAmount)} ARC`);
    console.log(`   Maximum possible claims: ${maxClaims.toString()}`);
    
    console.log(`\n   This faucet can serve ${maxClaims.toString()} users before needing a refill`);

    console.log("✅ TEST 12 PASSED - Maximum claims calculated");

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉🎉🎉 ALL ARCFAUCET TESTS PASSED! 🎉🎉🎉");
    console.log("=".repeat(70));

    console.log("\n📋 TEST SUMMARY:");
    console.log("   ✓ Test 1: Deploy faucet - PASSED");
    console.log("   ✓ Test 2: Fund via fundFaucet() - PASSED");
    console.log("   ✓ Test 3: Fund via receive() - PASSED");
    console.log("   ✓ Test 4: First user claim - PASSED");
    console.log("   ✓ Test 5: Multiple users claim - PASSED");
    console.log("   ✓ Test 6: Last claim time tracking - PASSED");
    console.log("   ✓ Test 7: Immediate re-claim - PASSED");
    console.log("   ✓ Test 8: Empty faucet handling - PASSED");
    console.log("   ✓ Test 9: Refill and continue - PASSED");
    console.log("   ✓ Test 10: Multiple funders - PASSED");
    console.log("   ✓ Test 11: Get faucet balance - PASSED");
    console.log("   ✓ Test 12: Maximum claims estimate - PASSED");

    const finalFaucetBalance = await faucet.getFaucetBalance();
    const totalUsers = [user1, user2, user3];
    console.log("\n📊 FINAL STATE:");
    console.log(`   • Faucet balance: ${ethers.utils.formatEther(finalFaucetBalance)} ARC`);
    console.log(`   • Claim amount: ${ethers.utils.formatEther(await faucet.CLAIM_AMOUNT())} ARC`);
    console.log(`   • Cooldown time: ${await faucet.COOLDOWN_TIME()} seconds`);
    console.log(`   • Users who claimed: ${totalUsers.length}`);
    console.log(`   • Remaining claims available: ${finalFaucetBalance.div(await faucet.CLAIM_AMOUNT()).toString()}`);
    
    console.log("\n✅ ARCFaucet is WORKING CORRECTLY!");
    console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
    console.error("\n❌❌❌ TEST SUITE FAILED ❌❌❌");
    console.error(error);
    process.exitCode = 1;
});
