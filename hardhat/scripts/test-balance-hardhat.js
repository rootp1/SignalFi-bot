const hre = require("hardhat");

async function main() {
  console.log("\n🔍 Testing USDC Balance using Hardhat Provider...\n");

  const USDC_ADDRESS = "0x9d811801f7154B35AE54C75C4EB16e265D9a382C";
  const SETTLEMENT_ADDRESS = "0xD92536118A234E7f5a9388Ec8dB95e90F8a1130B";
  const TEST_ADDRESS = "0xE723131DE401C572e94621165403d0335c2327bB";

  const [signer] = await ethers.getSigners();
  
  console.log("Using signer:", signer.address);
  console.log("Network:", hre.network.name);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Minimal ABIs
  const erc20ABI = [
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
    "function symbol() public view returns (string)"
  ];

  const settlementABI = [
    "function getDeposit(address user) public view returns (uint256)",
    "function deposits(address user) public view returns (uint256)"
  ];

  try {
    // Test USDC contract
    const usdc = new ethers.Contract(USDC_ADDRESS, erc20ABI, signer);
    
    console.log("1️⃣ Testing USDC Contract Functions:");
    const symbol = await usdc.symbol();
    console.log("   Symbol:", symbol);
    
    const decimals = await usdc.decimals();
    console.log("   Decimals:", decimals);
    
    const signerBalance = await usdc.balanceOf(signer.address);
    console.log("   Signer Balance:", ethers.utils.formatUnits(signerBalance, 6), "USDC");
    
    const testBalance = await usdc.balanceOf(TEST_ADDRESS);
    console.log("   Test Address Balance:", ethers.utils.formatUnits(testBalance, 6), "USDC");
    
    // Test Settlement contract
    console.log("\n2️⃣ Testing Settlement Contract Functions:");
    const settlement = new ethers.Contract(SETTLEMENT_ADDRESS, settlementABI, signer);
    
    const signerDeposit = await settlement.getDeposit(signer.address);
    console.log("   Signer Deposit:", ethers.utils.formatUnits(signerDeposit, 6), "USDC");
    
    const testDeposit = await settlement.getDeposit(TEST_ADDRESS);
    console.log("   Test Address Deposit:", ethers.utils.formatUnits(testDeposit, 6), "USDC");
    
    console.log("\n✅ ALL TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
