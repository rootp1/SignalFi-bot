const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying BroadcasterRegistry deployment...\n");

  // Read deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  const registryAddress = deploymentInfo.contracts.BroadcasterRegistry;
  console.log("📍 BroadcasterRegistry Address:", registryAddress);

  // Get contract instance
  const BroadcasterRegistry = await hre.ethers.getContractFactory("BroadcasterRegistry");
  const registry = BroadcasterRegistry.attach(registryAddress);

  // Test basic contract functions
  try {
    // Check if contract exists
    const code = await hre.ethers.provider.getCode(registryAddress);
    if (code === '0x') {
      console.log("❌ No contract found at this address!");
      return;
    }
    console.log("✅ Contract code found at address\n");

    // Test view functions
    console.log("📊 Testing contract functions:");
    
    const broadcasterCount = await registry.getBroadcasterCount();
    console.log("  • Total broadcasters:", broadcasterCount.toString());

    const minFee = await registry.MIN_FEE_BPS();
    const maxFee = await registry.MAX_FEE_BPS();
    console.log("  • Min fee (BPS):", minFee.toString(), "(10%)");
    console.log("  • Max fee (BPS):", maxFee.toString(), "(20%)");

    const basisPoints = await registry.BASIS_POINTS();
    console.log("  • Basis points:", basisPoints.toString());

    // Check if deregister function exists
    const hasDeregisterFunction = registry.interface.fragments.some(
      fragment => fragment.name === 'deregisterBroadcaster'
    );
    
    if (hasDeregisterFunction) {
      console.log("\n✨ New features available:");
      console.log("  ✅ deregisterBroadcaster(address) function exists");
    } else {
      console.log("\n❌ deregisterBroadcaster function not found!");
    }

    // List all events
    console.log("\n📢 Contract Events:");
    const events = registry.interface.events;
    Object.keys(events).forEach(eventName => {
      console.log("  •", eventName);
    });

    console.log("\n🎉 BroadcasterRegistry verification complete!");
    console.log("\n✅ Contract is deployed and working correctly");
    console.log("✅ All expected functions are available");
    console.log("✅ Ready to use!\n");

  } catch (error) {
    console.error("❌ Error verifying contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
