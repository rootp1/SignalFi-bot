const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Redeploying PYUSD with minter support, account:", deployer.address);
  
  // Deploy new ArcologyPYUSD with minter support
  console.log("\nDeploying new ArcologyPYUSD...");
  const PYUSD = await hre.ethers.getContractFactory("ArcologyPYUSD");
  const pyusd = await PYUSD.deploy();
  await pyusd.deployed();
  console.log("✅ ArcologyPYUSD deployed to:", pyusd.address);
  
  // Deploy unlimited faucet
  console.log("\nDeploying ArcologyPYUSDFaucetUnlimited...");
  const FaucetUnlimited = await hre.ethers.getContractFactory("ArcologyPYUSDFaucetUnlimited");
  const faucetUnlimited = await FaucetUnlimited.deploy(pyusd.address);
  await faucetUnlimited.deployed();
  console.log("✅ ArcologyPYUSDFaucetUnlimited deployed to:", faucetUnlimited.address);
  
  // Add faucet as minter
  console.log("\nAdding faucet as minter...");
  const tx = await pyusd.addMinter(faucetUnlimited.address);
  await tx.wait();
  console.log("✅ Faucet added as minter");
  
  console.log("\n=== Deployment Summary ===");
  console.log("ArcologyPYUSD:", pyusd.address);
  console.log("ArcologyPYUSDFaucetUnlimited:", faucetUnlimited.address);
  console.log("\n⚠️  Update your config.js:");
  console.log(`export const PYUSD_ADDRESS = '${pyusd.address}';`);
  console.log(`export const PYUSD_FAUCET_ADDRESS = '${faucetUnlimited.address}';`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
