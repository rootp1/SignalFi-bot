const hre = require("hardhat");
const { expect } = require("chai");

/**
 * Simple test to verify the deposit() function in SettlementContract
 * This script:
 * 1. Deploys necessary contracts
 * 2. Mints USDC to a test user
 * 3. Approves the Settlement contract to spend USDC
 * 4. Calls deposit() 
 * 5. Verifies the deposit amount is correct
 */

async function main() {
    console.log("🧪 Testing Deposit USDC Function\n");
    console.log("=".repeat(50));

    // Get test accounts
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const testUser = accounts[1];
    const relayer = accounts[2];
    const broadcaster = accounts[3];

    console.log(`\n📌 Deployer: ${deployer.address}`);
    console.log(`📌 Test User: ${testUser.address}`);

    // Step 1: Deploy USDC Mock Token
    console.log("\n1️⃣  Deploying USDC Mock Token...");
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();
    console.log(`✅ USDC deployed at: ${usdc.address}`);

    // Step 2: Deploy WETH Mock Token (needed for Settlement contract)
    console.log("\n2️⃣  Deploying WETH Mock Token...");
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`✅ WETH deployed at: ${weth.address}`);

    // Step 3: Deploy AMM Contract (needed for Settlement contract)
    console.log("\n3️⃣  Deploying AMM Contract...");
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    await amm.deployed();
    console.log(`✅ AMM deployed at: ${amm.address}`);

    // Step 4: Deploy Settlement Contract
    console.log("\n4️⃣  Deploying Settlement Contract...");
    const SettlementFactory = await ethers.getContractFactory("SettlementContract");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        relayer.address,
        broadcaster.address
    );
    await settlement.deployed();
    console.log(`✅ Settlement deployed at: ${settlement.address}`);

    // Step 5: Mint USDC to test user
    console.log("\n5️⃣  Minting 1000 USDC to test user...");
    const mintAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(testUser.address, mintAmount);
    const userBalance = await usdc.balanceOf(testUser.address);
    console.log(`✅ Test user USDC balance: ${ethers.utils.formatUnits(userBalance, 6)} USDC`);

    // Step 6: Approve Settlement contract to spend USDC
    console.log("\n6️⃣  Approving Settlement contract to spend USDC...");
    await usdc.connect(testUser).approve(settlement.address, mintAmount);
    const allowance = await usdc.allowance(testUser.address, settlement.address);
    console.log(`✅ Allowance set: ${ethers.utils.formatUnits(allowance, 6)} USDC`);

    // Step 7: Check initial deposit (should be 0)
    console.log("\n7️⃣  Checking initial deposit...");
    const initialDeposit = await settlement.getDeposit(testUser.address);
    console.log(`📊 Initial deposit: ${ethers.utils.formatUnits(initialDeposit, 6)} USDC`);
    expect(initialDeposit).to.equal(0);

    // Step 8: Deposit USDC into Settlement contract
    console.log("\n8️⃣  Depositing 500 USDC into Settlement contract...");
    const depositAmount = ethers.utils.parseUnits("500", 6); // 500 USDC
    const tx = await settlement.connect(testUser).deposit(depositAmount);
    console.log(`📝 Transaction hash: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Check for Deposit event
    const depositEvent = receipt.events?.find(e => e.event === 'Deposit');
    if (depositEvent) {
        console.log(`📢 Deposit Event emitted:`);
        console.log(`   - User: ${depositEvent.args.user}`);
        console.log(`   - Amount: ${ethers.utils.formatUnits(depositEvent.args.amount, 6)} USDC`);
    }

    // Step 9: Verify the deposit was recorded correctly
    console.log("\n9️⃣  Verifying deposit amount...");
    const finalDeposit = await settlement.getDeposit(testUser.address);
    console.log(`📊 Final deposit: ${ethers.utils.formatUnits(finalDeposit, 6)} USDC`);
    expect(finalDeposit).to.equal(depositAmount);

    // Step 10: Verify USDC was transferred from user to contract
    console.log("\n🔟  Verifying USDC balances...");
    const userBalanceAfter = await usdc.balanceOf(testUser.address);
    const contractBalance = await usdc.balanceOf(settlement.address);
    console.log(`📊 User USDC balance after deposit: ${ethers.utils.formatUnits(userBalanceAfter, 6)} USDC`);
    console.log(`📊 Settlement contract USDC balance: ${ethers.utils.formatUnits(contractBalance, 6)} USDC`);
    
    expect(userBalanceAfter).to.equal(mintAmount.sub(depositAmount));
    expect(contractBalance).to.equal(depositAmount);

    // Step 11: Test depositing again (to verify cumulative deposits)
    console.log("\n1️⃣1️⃣  Testing second deposit of 200 USDC...");
    const secondDepositAmount = ethers.utils.parseUnits("200", 6);
    await settlement.connect(testUser).deposit(secondDepositAmount);
    
    const cumulativeDeposit = await settlement.getDeposit(testUser.address);
    const expectedTotal = depositAmount.add(secondDepositAmount);
    console.log(`📊 Cumulative deposit: ${ethers.utils.formatUnits(cumulativeDeposit, 6)} USDC`);
    expect(cumulativeDeposit).to.equal(expectedTotal);

    console.log("\n" + "=".repeat(50));
    console.log("✅ ✅ ✅  ALL DEPOSIT TESTS PASSED! ✅ ✅ ✅");
    console.log("=".repeat(50));

    console.log("\n📋 Summary:");
    console.log(`   ✓ First deposit: 500 USDC - SUCCESS`);
    console.log(`   ✓ Second deposit: 200 USDC - SUCCESS`);
    console.log(`   ✓ Total deposited: ${ethers.utils.formatUnits(cumulativeDeposit, 6)} USDC`);
    console.log(`   ✓ Contract balance: ${ethers.utils.formatUnits(await usdc.balanceOf(settlement.address), 6)} USDC`);
    console.log(`   ✓ All assertions passed!`);
}

// Execute the test
main().catch((error) => {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exitCode = 1;
});
