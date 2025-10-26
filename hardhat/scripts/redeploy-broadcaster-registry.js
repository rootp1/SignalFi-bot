const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Redeploying BroadcasterRegistry with deregister functionality...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  // Deploy BroadcasterRegistry
  console.log("⏳ Deploying BroadcasterRegistry...");
  const BroadcasterRegistry = await hre.ethers.getContractFactory("BroadcasterRegistry");
  const registry = await BroadcasterRegistry.deploy();
  await registry.deployed();

  const registryAddress = registry.address;
  console.log("✅ BroadcasterRegistry deployed to:", registryAddress);

  // Read existing deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  let deploymentInfo;
  
  if (fs.existsSync(deploymentPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log("\n📋 Old BroadcasterRegistry address:", deploymentInfo.contracts.BroadcasterRegistry);
  } else {
    deploymentInfo = {
      network: hre.network.name,
      chainId: (await hre.ethers.provider.getNetwork()).chainId,
      contracts: {},
      accounts: {}
    };
  }

  // Update BroadcasterRegistry address
  deploymentInfo.contracts.BroadcasterRegistry = registryAddress;
  deploymentInfo.timestamp = new Date().toISOString();
  deploymentInfo.accounts.deployer = deployer.address;

  // Save updated deployment info
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Updated deployment-info.json with new BroadcasterRegistry address\n");

  console.log("🎉 Deployment completed successfully!");
  console.log("\n📍 Contract Addresses:");
  console.log("  BroadcasterRegistry:", registryAddress);
  console.log("\n✨ New Features:");
  console.log("  • deregisterBroadcaster(address) - Broadcaster can deregister themselves");
  console.log("  • Admin can deregister any broadcaster");
  console.log("  • All existing functions still available");

  console.log("\n⚠️  Important Notes:");
  console.log("  • This is a NEW contract with a different address");
  console.log("  • All previous broadcaster data is lost");
  console.log("  • Broadcasters need to re-register");
  console.log("  • deployment-info.json has been updated");
  console.log("  • Restart all bots/services to use the new address");

  // Wait for block confirmations (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await registry.deployTransaction.wait(3);
    console.log("✅ Block confirmations completed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
