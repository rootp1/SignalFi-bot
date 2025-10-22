const { ethers } = require("hardhat");

async function main() {
  console.log("\n🧪 Testing USDC Deposit Flow (Simulating UI Button Click)...\n");

  // Contract addresses
  const SETTLEMENT_ADDRESS = "0x010e5c3c0017b8009E926c39b072831065cc7Dc2";
  const USDC_ADDRESS = "0xfbC451FBd7E17a1e7B18347337657c1F2c52B631";

  const [testUser] = await ethers.getSigners();
  console.log("Testing with account:", testUser.address);
  console.log("Network:", (await ethers.provider.getNetwork()).chainId);

  // ABIs
  const settlementABI = [
    "function deposit(uint256 amount) external",
    "function getDeposit(address user) public view returns (uint256)",
    "function deposits(address user) public view returns (uint256)",
    "event Deposit(address indexed user, uint256 amount)"
  ];

  const erc20ABI = [
    "function balanceOf(address account) public view returns (uint256)",
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
  ];

  // Get contract instances
  const settlement = new ethers.Contract(SETTLEMENT_ADDRESS, settlementABI, testUser);
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20ABI, testUser);

  try {
    // Step 1: Check initial balances
    console.log("\n📊 INITIAL STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const initialWalletBalance = await usdc.balanceOf(testUser.address);
    console.log("Wallet USDC Balance:", ethers.utils.formatUnits(initialWalletBalance, 6), "USDC");
    
    const initialDeposit = await settlement.getDeposit(testUser.address);
    console.log("Current Deposit in Settlement:", ethers.utils.formatUnits(initialDeposit, 6), "USDC");
    
    const initialAllowance = await usdc.allowance(testUser.address, SETTLEMENT_ADDRESS);
    console.log("Current Allowance:", ethers.utils.formatUnits(initialAllowance, 6), "USDC");

    const settlementUsdcBalance = await usdc.balanceOf(SETTLEMENT_ADDRESS);
    console.log("Settlement Contract Total USDC:", ethers.utils.formatUnits(settlementUsdcBalance, 6), "USDC");

    // Check if user has USDC
    if (initialWalletBalance.eq(0)) {
      console.log("\n❌ ERROR: User has no USDC tokens!");
      console.log("Please get USDC from the faucet first.");
      return;
    }

    // Step 2: Test deposit
    const depositAmount = ethers.utils.parseUnits("50", 6); // Deposit 50 USDC
    console.log("\n🔄 TESTING DEPOSIT OF 50 USDC...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Step 2a: Approve USDC
    console.log("\n1️⃣ Approving USDC...");
    const approveTx = await usdc.approve(SETTLEMENT_ADDRESS, depositAmount);
    console.log("   Approval Tx Hash:", approveTx.hash);
    await approveTx.wait();
    console.log("   ✅ Approved!");

    const newAllowance = await usdc.allowance(testUser.address, SETTLEMENT_ADDRESS);
    console.log("   New Allowance:", ethers.utils.formatUnits(newAllowance, 6), "USDC");

    // Step 2b: Deposit USDC
    console.log("\n2️⃣ Depositing USDC to Settlement Contract...");
    const depositTx = await settlement.deposit(depositAmount);
    console.log("   Deposit Tx Hash:", depositTx.hash);
    const receipt = await depositTx.wait();
    console.log("   ✅ Deposit successful!");
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    // Step 3: Verify final balances
    console.log("\n📊 FINAL STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const finalWalletBalance = await usdc.balanceOf(testUser.address);
    console.log("Wallet USDC Balance:", ethers.utils.formatUnits(finalWalletBalance, 6), "USDC");
    
    const finalDeposit = await settlement.getDeposit(testUser.address);
    console.log("Deposit in Settlement:", ethers.utils.formatUnits(finalDeposit, 6), "USDC");
    
    const finalSettlementBalance = await usdc.balanceOf(SETTLEMENT_ADDRESS);
    console.log("Settlement Contract Total USDC:", ethers.utils.formatUnits(finalSettlementBalance, 6), "USDC");

    // Calculate differences
    console.log("\n📈 CHANGES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const walletDiff = initialWalletBalance.sub(finalWalletBalance);
    const depositDiff = finalDeposit.sub(initialDeposit);
    const settlementDiff = finalSettlementBalance.sub(settlementUsdcBalance);

    console.log("Wallet Balance Change:", "-" + ethers.utils.formatUnits(walletDiff, 6), "USDC");
    console.log("Deposit Balance Change:", "+" + ethers.utils.formatUnits(depositDiff, 6), "USDC");
    console.log("Settlement Total Change:", "+" + ethers.utils.formatUnits(settlementDiff, 6), "USDC");

    // Verify deposit event
    console.log("\n📋 VERIFYING DEPOSIT EVENT:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const filter = settlement.filters.Deposit(testUser.address);
    const events = await settlement.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
    
    if (events.length > 0) {
      console.log("✅ Deposit event emitted correctly!");
      console.log("   User:", events[0].args.user);
      console.log("   Amount:", ethers.utils.formatUnits(events[0].args.amount, 6), "USDC");
    } else {
      console.log("⚠️  Warning: No deposit event found");
    }

    console.log("\n✅ TEST COMPLETED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.error && error.error.message) {
      console.error("Details:", error.error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
