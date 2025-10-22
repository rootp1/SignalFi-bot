const { ethers } = require("hardhat");

async function main() {
  console.log("\n📊 COMPLETE SETTLEMENT CONTRACT STATUS\n");

  const SETTLEMENT_ADDRESS = "0x010e5c3c0017b8009E926c39b072831065cc7Dc2";
  const USDC_ADDRESS = "0xfbC451FBd7E17a1e7B18347337657c1F2c52B631";

  const [signer] = await ethers.getSigners();
  
  const settlementABI = [
    "function deposit(uint256 amount) external",
    "function getDeposit(address user) public view returns (uint256)",
    "event Deposit(address indexed user, uint256 amount)"
  ];

  const erc20ABI = [
    "function balanceOf(address account) public view returns (uint256)"
  ];

  const settlement = new ethers.Contract(SETTLEMENT_ADDRESS, settlementABI, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20ABI, signer);

  console.log("Settlement Contract Address:", SETTLEMENT_ADDRESS);
  console.log("USDC Token Address:", USDC_ADDRESS);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get total USDC in Settlement contract
  const totalUSDC = await usdc.balanceOf(SETTLEMENT_ADDRESS);
  console.log("💰 TOTAL USDC IN SETTLEMENT CONTRACT:", ethers.utils.formatUnits(totalUSDC, 6), "USDC\n");

  // Get all deposit events
  console.log("📋 ALL DEPOSIT EVENTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const currentBlock = await ethers.provider.getBlockNumber();
    const filter = settlement.filters.Deposit();
    const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks
    const events = await settlement.queryFilter(filter, fromBlock, currentBlock);
    
    if (events.length === 0) {
      console.log("❌ No deposits found");
    } else {
      console.log(`Found ${events.length} deposit(s):\n`);
      
      let totalDeposited = ethers.BigNumber.from(0);
      const userDeposits = {};
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const user = event.args.user;
        const amount = event.args.amount;
        
        console.log(`Deposit #${i + 1}:`);
        console.log(`  👤 User: ${user}`);
        console.log(`  💵 Amount: ${ethers.utils.formatUnits(amount, 6)} USDC`);
        console.log(`  📦 Block: ${event.blockNumber}`);
        console.log(`  🔗 Tx Hash: ${event.transactionHash}`);
        console.log();
        
        totalDeposited = totalDeposited.add(amount);
        
        if (!userDeposits[user]) {
          userDeposits[user] = ethers.BigNumber.from(0);
        }
        userDeposits[user] = userDeposits[user].add(amount);
      }
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📈 SUMMARY:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Total from events:", ethers.utils.formatUnits(totalDeposited, 6), "USDC");
      console.log("\n👥 DEPOSITS BY USER:");
      
      for (const [user, amount] of Object.entries(userDeposits)) {
        const currentDeposit = await settlement.getDeposit(user);
        console.log(`\n  ${user}`);
        console.log(`    Event total: ${ethers.utils.formatUnits(amount, 6)} USDC`);
        console.log(`    Current balance: ${ethers.utils.formatUnits(currentDeposit, 6)} USDC`);
        
        if (!amount.eq(currentDeposit)) {
          console.log(`    ⚠️  Mismatch detected!`);
        } else {
          console.log(`    ✅ Verified`);
        }
      }
    }
    
  } catch (error) {
    console.error("Error fetching events:", error.message);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
