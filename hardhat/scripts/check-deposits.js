const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Checking Settlement Contract Deposits...\n");

  // Contract addresses from deployment
  const SETTLEMENT_ADDRESS = "0x010e5c3c0017b8009E926c39b072831065cc7Dc2";
  const USDC_ADDRESS = "0xfbC451FBd7E17a1e7B18347337657c1F2c52B631";

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Checking from account:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Minimal ABIs
  const settlementABI = [
    "function getDeposit(address user) public view returns (uint256)",
    "function deposits(address user) public view returns (uint256)",
    "event Deposit(address indexed user, uint256 amount)"
  ];

  const erc20ABI = [
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
  ];

  // Get contract instances using minimal ABIs
  const settlement = new ethers.Contract(SETTLEMENT_ADDRESS, settlementABI, deployer);
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20ABI, deployer);

  try {
    // Check USDC balance of the Settlement contract
    const settlementBalance = await usdc.balanceOf(SETTLEMENT_ADDRESS);
    console.log("Settlement Contract USDC Balance:", ethers.utils.formatUnits(settlementBalance, 6), "USDC");

    // Check deposit for the deployer account
    const deployerDeposit = await settlement.getDeposit(deployer.address);
    console.log("Deployer Deposit Balance:", ethers.utils.formatUnits(deployerDeposit, 6), "USDC");

    // If you want to check a specific user address, add it here:
    const userAddress = "0xE723131DE401C572e94621165403d0335c2327bB"; // Replace with actual user
    try {
      const userDeposit = await settlement.getDeposit(userAddress);
      console.log(`User ${userAddress} Deposit:`, ethers.utils.formatUnits(userDeposit, 6), "USDC");
    } catch (err) {
      console.log("Could not fetch user deposit:", err.message);
    }

    // Check if there are any Deposit events
    console.log("\n📊 Checking Recent Deposit Events...");
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current block:", currentBlock);
    
    try {
      const filter = settlement.filters.Deposit();
      const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
      const events = await settlement.queryFilter(filter, fromBlock, currentBlock);
      
      if (events.length === 0) {
        console.log("No deposit events found in recent blocks");
      } else {
        console.log(`Found ${events.length} deposit event(s):`);
        events.forEach((event, index) => {
          console.log(`\nDeposit #${index + 1}:`);
          console.log("  User:", event.args.user);
          console.log("  Amount:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
          console.log("  Block:", event.blockNumber);
          console.log("  Tx Hash:", event.transactionHash);
        });
      }
    } catch (err) {
      console.log("Could not fetch events:", err.message);
    }

  } catch (error) {
    console.error("\n❌ Error checking deposits:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
