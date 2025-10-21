const hre = require("hardhat");

/**
 * LOCAL HARDHAT NETWORK TEST
 * This tests the deposit function on local Hardhat network (no external RPC needed)
 * Run with: npx hardhat run test/test-deposit-local.js
 */

async function main() {
    console.log("\n🧪 TESTING DEPOSIT ON LOCAL HARDHAT NETWORK");
    console.log("=".repeat(70));

    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log(`\n📍 Deployer: ${deployer.address}`);
    console.log(`📍 User1: ${user1.address}`);
    console.log(`📍 User2: ${user2.address}`);

    // Deploy contracts
    console.log("\n📦 Deploying contracts...");
    
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    
    const SettlementFactory = await ethers.getContractFactory("SettlementContract");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        deployer.address,
        deployer.address
    );
    
    console.log(`✅ USDC: ${usdc.address}`);
    console.log(`✅ WETH: ${weth.address}`);
    console.log(`✅ AMM: ${amm.address}`);
    console.log(`✅ Settlement: ${settlement.address}`);

    // Test 1: Single user deposit
    console.log("\n" + "=".repeat(70));
    console.log("TEST 1: Single User Deposit");
    console.log("=".repeat(70));
    
    console.log("\n1️⃣  Minting 5000 USDC to User1...");
    await usdc.mint(user1.address, ethers.utils.parseUnits("5000", 6));
    let balance = await usdc.balanceOf(user1.address);
    console.log(`   Balance: ${ethers.utils.formatUnits(balance, 6)} USDC`);
    
    console.log("\n2️⃣  User1 approving Settlement...");
    await usdc.connect(user1).approve(settlement.address, ethers.utils.parseUnits("5000", 6));
    
    console.log("\n3️⃣  User1 depositing 2000 USDC...");
    await settlement.connect(user1).deposit(ethers.utils.parseUnits("2000", 6));
    
    console.log("\n4️⃣  Checking deposit...");
    let deposit = await settlement.getDeposit(user1.address);
    console.log(`   User1 deposit: ${ethers.utils.formatUnits(deposit, 6)} USDC`);
    
    if (deposit.toString() === ethers.utils.parseUnits("2000", 6).toString()) {
        console.log("   ✅ TEST 1 PASSED!");
    } else {
        throw new Error("TEST 1 FAILED!");
    }

    // Test 2: Multiple deposits from same user
    console.log("\n" + "=".repeat(70));
    console.log("TEST 2: Multiple Deposits (Cumulative)");
    console.log("=".repeat(70));
    
    console.log("\n1️⃣  User1 depositing another 1500 USDC...");
    await settlement.connect(user1).deposit(ethers.utils.parseUnits("1500", 6));
    
    console.log("\n2️⃣  Checking cumulative deposit...");
    deposit = await settlement.getDeposit(user1.address);
    console.log(`   User1 total deposit: ${ethers.utils.formatUnits(deposit, 6)} USDC`);
    
    if (deposit.toString() === ethers.utils.parseUnits("3500", 6).toString()) {
        console.log("   ✅ TEST 2 PASSED!");
    } else {
        throw new Error("TEST 2 FAILED!");
    }

    // Test 3: Multiple users
    console.log("\n" + "=".repeat(70));
    console.log("TEST 3: Multiple Users");
    console.log("=".repeat(70));
    
    console.log("\n1️⃣  Minting 3000 USDC to User2...");
    await usdc.mint(user2.address, ethers.utils.parseUnits("3000", 6));
    
    console.log("\n2️⃣  User2 approving and depositing 3000 USDC...");
    await usdc.connect(user2).approve(settlement.address, ethers.utils.parseUnits("3000", 6));
    await settlement.connect(user2).deposit(ethers.utils.parseUnits("3000", 6));
    
    console.log("\n3️⃣  Checking deposits...");
    const user1Deposit = await settlement.getDeposit(user1.address);
    const user2Deposit = await settlement.getDeposit(user2.address);
    console.log(`   User1 deposit: ${ethers.utils.formatUnits(user1Deposit, 6)} USDC`);
    console.log(`   User2 deposit: ${ethers.utils.formatUnits(user2Deposit, 6)} USDC`);
    
    if (user1Deposit.toString() === ethers.utils.parseUnits("3500", 6).toString() &&
        user2Deposit.toString() === ethers.utils.parseUnits("3000", 6).toString()) {
        console.log("   ✅ TEST 3 PASSED!");
    } else {
        throw new Error("TEST 3 FAILED!");
    }

    // Test 4: Verify contract holds USDC
    console.log("\n" + "=".repeat(70));
    console.log("TEST 4: Contract Balance Verification");
    console.log("=".repeat(70));
    
    const contractBalance = await usdc.balanceOf(settlement.address);
    const expectedBalance = ethers.utils.parseUnits("6500", 6);
    console.log(`\n   Settlement contract balance: ${ethers.utils.formatUnits(contractBalance, 6)} USDC`);
    console.log(`   Expected: ${ethers.utils.formatUnits(expectedBalance, 6)} USDC`);
    
    if (contractBalance.toString() === expectedBalance.toString()) {
        console.log("   ✅ TEST 4 PASSED!");
    } else {
        throw new Error("TEST 4 FAILED!");
    }

    // Test 5: Deposit event emission
    console.log("\n" + "=".repeat(70));
    console.log("TEST 5: Event Emission");
    console.log("=".repeat(70));
    
    console.log("\n   Testing deposit event...");
    await usdc.mint(deployer.address, ethers.utils.parseUnits("1000", 6));
    await usdc.approve(settlement.address, ethers.utils.parseUnits("1000", 6));
    
    const tx = await settlement.deposit(ethers.utils.parseUnits("1000", 6));
    const receipt = await tx.wait();
    
    const depositEvent = receipt.events?.find(e => e.event === 'Deposit');
    if (depositEvent) {
        console.log(`   Event found:`);
        console.log(`   - User: ${depositEvent.args.user}`);
        console.log(`   - Amount: ${ethers.utils.formatUnits(depositEvent.args.amount, 6)} USDC`);
        console.log("   ✅ TEST 5 PASSED!");
    } else {
        throw new Error("TEST 5 FAILED - Event not emitted!");
    }

    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("🎉🎉🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉🎉🎉");
    console.log("=".repeat(70));
    
    console.log("\n📊 FINAL STATE:");
    console.log(`   • User1 deposited: ${ethers.utils.formatUnits(await settlement.getDeposit(user1.address), 6)} USDC`);
    console.log(`   • User2 deposited: ${ethers.utils.formatUnits(await settlement.getDeposit(user2.address), 6)} USDC`);
    console.log(`   • Deployer deposited: ${ethers.utils.formatUnits(await settlement.getDeposit(deployer.address), 6)} USDC`);
    console.log(`   • Total in contract: ${ethers.utils.formatUnits(await usdc.balanceOf(settlement.address), 6)} USDC`);
    
    console.log("\n✅ The deposit() function is WORKING CORRECTLY!");
    console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
    console.error("\n❌❌❌ TEST SUITE FAILED ❌❌❌");
    console.error(error);
    process.exitCode = 1;
});
