const hre = require("hardhat");
const { expect } = require("chai");

/**
 * SIMPLE DEPOSIT TEST
 * This tests the deposit() function using only the deployer account
 */

async function main() {
    console.log("\n🧪 TESTING DEPOSIT USDC FUNCTION");
    console.log("=".repeat(60));

    // Get accounts (using only deployer since network.json only has 1 account)
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n✅ Deployer address: ${deployer.address}`);
    console.log(`✅ Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ARC`);

    // Deploy USDC
    console.log("\n📦 Step 1: Deploying USDC token...");
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();
    console.log(`   ✅ USDC deployed: ${usdc.address}`);

    // Deploy WETH
    console.log("\n📦 Step 2: Deploying WETH token...");
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`   ✅ WETH deployed: ${weth.address}`);

    // Deploy AMM
    console.log("\n📦 Step 3: Deploying AMM contract...");
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    await amm.deployed();
    console.log(`   ✅ AMM deployed: ${amm.address}`);

    // Deploy Settlement
    console.log("\n📦 Step 4: Deploying Settlement contract...");
    const SettlementFactory = await ethers.getContractFactory("SettlementContract");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        deployer.address, // relayer
        deployer.address  // broadcaster
    );
    await settlement.deployed();
    console.log(`   ✅ Settlement deployed: ${settlement.address}`);

    // Test the deposit function
    console.log("\n" + "=".repeat(60));
    console.log("💰 TESTING DEPOSIT FUNCTION");
    console.log("=".repeat(60));

    // Mint USDC to deployer
    console.log("\n💵 Step 5: Minting 10,000 USDC to deployer...");
    const mintAmount = ethers.utils.parseUnits("10000", 6);
    await usdc.mint(deployer.address, mintAmount);
    const balance = await usdc.balanceOf(deployer.address);
    console.log(`   ✅ Minted: ${ethers.utils.formatUnits(balance, 6)} USDC`);

    // Approve Settlement contract
    console.log("\n✍️  Step 6: Approving Settlement contract...");
    await usdc.approve(settlement.address, mintAmount);
    const allowance = await usdc.allowance(deployer.address, settlement.address);
    console.log(`   ✅ Approved: ${ethers.utils.formatUnits(allowance, 6)} USDC`);

    // Check initial deposit
    console.log("\n🔍 Step 7: Checking initial deposit balance...");
    const initialDeposit = await settlement.getDeposit(deployer.address);
    console.log(`   📊 Initial deposit: ${ethers.utils.formatUnits(initialDeposit, 6)} USDC`);

    // First deposit: 5000 USDC
    console.log("\n💸 Step 8: Making first deposit of 5000 USDC...");
    const firstDeposit = ethers.utils.parseUnits("5000", 6);
    const tx1 = await settlement.deposit(firstDeposit);
    console.log(`   📝 TX hash: ${tx1.hash}`);
    await tx1.wait();
    console.log(`   ✅ Transaction confirmed!`);

    // Verify first deposit
    const balanceAfterFirst = await settlement.getDeposit(deployer.address);
    console.log(`   📊 Deposit balance: ${ethers.utils.formatUnits(balanceAfterFirst, 6)} USDC`);
    
    if (balanceAfterFirst.toString() === firstDeposit.toString()) {
        console.log(`   ✅ ✅ FIRST DEPOSIT SUCCESSFUL! ✅ ✅`);
    } else {
        throw new Error(`Deposit mismatch! Expected ${firstDeposit}, got ${balanceAfterFirst}`);
    }

    // Second deposit: 3000 USDC
    console.log("\n💸 Step 9: Making second deposit of 3000 USDC...");
    const secondDeposit = ethers.utils.parseUnits("3000", 6);
    const tx2 = await settlement.deposit(secondDeposit);
    console.log(`   📝 TX hash: ${tx2.hash}`);
    await tx2.wait();
    console.log(`   ✅ Transaction confirmed!`);

    // Verify cumulative deposit
    const balanceAfterSecond = await settlement.getDeposit(deployer.address);
    const expectedTotal = firstDeposit.add(secondDeposit);
    console.log(`   📊 Cumulative deposit: ${ethers.utils.formatUnits(balanceAfterSecond, 6)} USDC`);
    console.log(`   📊 Expected total: ${ethers.utils.formatUnits(expectedTotal, 6)} USDC`);
    
    if (balanceAfterSecond.toString() === expectedTotal.toString()) {
        console.log(`   ✅ ✅ SECOND DEPOSIT SUCCESSFUL! ✅ ✅`);
    } else {
        throw new Error(`Cumulative deposit mismatch! Expected ${expectedTotal}, got ${balanceAfterSecond}`);
    }

    // Verify contract holds the USDC
    const contractBalance = await usdc.balanceOf(settlement.address);
    console.log(`\n💼 Step 10: Verifying contract balance...`);
    console.log(`   📊 Settlement contract holds: ${ethers.utils.formatUnits(contractBalance, 6)} USDC`);
    
    if (contractBalance.toString() === expectedTotal.toString()) {
        console.log(`   ✅ ✅ CONTRACT BALANCE CORRECT! ✅ ✅`);
    } else {
        throw new Error(`Contract balance mismatch! Expected ${expectedTotal}, got ${contractBalance}`);
    }

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉🎉🎉 ALL DEPOSIT TESTS PASSED SUCCESSFULLY! 🎉🎉🎉");
    console.log("=".repeat(60));
    console.log("\n📋 TEST SUMMARY:");
    console.log(`   ✓ Contract deployed successfully`);
    console.log(`   ✓ First deposit (5000 USDC) - PASSED`);
    console.log(`   ✓ Second deposit (3000 USDC) - PASSED`);
    console.log(`   ✓ Total deposits: ${ethers.utils.formatUnits(balanceAfterSecond, 6)} USDC`);
    console.log(`   ✓ Contract balance verified: ${ethers.utils.formatUnits(contractBalance, 6)} USDC`);
    console.log(`   ✓ Deposit function is WORKING CORRECTLY! ✅`);
    console.log("\n" + "=".repeat(60) + "\n");
}

main().catch((error) => {
    console.error("\n❌❌❌ TEST FAILED ❌❌❌");
    console.error(error);
    process.exitCode = 1;
});
