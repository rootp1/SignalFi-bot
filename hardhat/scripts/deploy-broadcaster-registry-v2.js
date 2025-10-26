const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying BroadcasterRegistry with deregister functionality...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy BroadcasterRegistry
  const BroadcasterRegistry = await hre.ethers.getContractFactory("BroadcasterRegistry");
  const registry = await BroadcasterRegistry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("✅ BroadcasterRegistry deployed to:", registryAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    broadcaster_registry: registryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    version: "v2-with-deregister"
  };

  const infoPath = path.join(__dirname, "..", "broadcaster-registry-deployment.json");
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", infoPath);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\nContract addresses:");
  console.log("  BroadcasterRegistry:", registryAddress);
  console.log("\nYou can now:");
  console.log("  1. Deregister broadcasters using: deregisterBroadcaster(address)");
  console.log("  2. Broadcaster can deregister themselves");
  console.log("  3. Admin can deregister any broadcaster");

  // Wait for block confirmations (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await registry.deploymentTransaction().wait(5);
    console.log("✅ Block confirmations completed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
