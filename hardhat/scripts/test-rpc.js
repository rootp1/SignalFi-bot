const { ethers } = require("ethers");

async function testRPC() {
  console.log("\n🔍 Testing Arcology RPC and Contracts...\n");

  const RPC_URL = "https://achievement-acts-content-guys.trycloudflare.com";
  const USDC_ADDRESS = "0x9d811801f7154B35AE54C75C4EB16e265D9a382C";
  const SETTLEMENT_ADDRESS = "0xD92536118A234E7f5a9388Ec8dB95e90F8a1130B";

  console.log("RPC URL:", RPC_URL);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Test 1: Connect to RPC
    console.log("1️⃣ Testing RPC Connection...");
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    const network = await provider.getNetwork();
    console.log("   ✅ Connected!");
    console.log("   Chain ID:", network.chainId);

    const blockNumber = await provider.getBlockNumber();
    console.log("   Current Block:", blockNumber);

    // Test 2: Check USDC contract
    console.log("\n2️⃣ Testing USDC Contract...");
    console.log("   Address:", USDC_ADDRESS);
    
    const usdcCode = await provider.getCode(USDC_ADDRESS);
    if (usdcCode === "0x") {
      console.log("   ❌ No contract at this address!");
    } else {
      console.log("   ✅ Contract exists!");
      console.log("   Bytecode length:", usdcCode.length);
    }

    // Test 3: Try calling balanceOf
    console.log("\n3️⃣ Testing USDC balanceOf call...");
    const testAddress = "0xE723131DE401C572e94621165403d0335c2327bB";
    const erc20ABI = [
      "function balanceOf(address account) public view returns (uint256)"
    ];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20ABI, provider);
    const balance = await usdcContract.balanceOf(testAddress);
    console.log("   ✅ balanceOf call successful!");
    console.log("   Balance:", ethers.utils.formatUnits(balance, 6), "USDC");

    // Test 4: Check Settlement contract
    console.log("\n4️⃣ Testing Settlement Contract...");
    console.log("   Address:", SETTLEMENT_ADDRESS);
    
    const settlementCode = await provider.getCode(SETTLEMENT_ADDRESS);
    if (settlementCode === "0x") {
      console.log("   ❌ No contract at this address!");
    } else {
      console.log("   ✅ Contract exists!");
      console.log("   Bytecode length:", settlementCode.length);
    }

    // Test 5: Try calling getDeposit
    console.log("\n5️⃣ Testing Settlement getDeposit call...");
    const settlementABI = [
      "function getDeposit(address user) public view returns (uint256)"
    ];
    
    const settlementContract = new ethers.Contract(SETTLEMENT_ADDRESS, settlementABI, provider);
    const deposit = await settlementContract.getDeposit(testAddress);
    console.log("   ✅ getDeposit call successful!");
    console.log("   Deposit:", ethers.utils.formatUnits(deposit, 6), "USDC");

    console.log("\n✅ ALL TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.error) {
      console.error("RPC Error:", error.error);
    }
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

testRPC()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
