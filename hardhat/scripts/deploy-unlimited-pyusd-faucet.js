const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying unlimited PYUSD faucet with account:", deployer.address);
  
  // Existing ArcologyPYUSD contract address
  const PYUSD_ADDRESS = "0x6227c6D08dCF35caf085C3e9BA5a785D092c7975";
  
  console.log("\nDeploying ArcologyPYUSDFaucetUnlimited...");
  const FaucetUnlimited = await hre.ethers.getContractFactory("ArcologyPYUSDFaucetUnlimited");
  const faucetUnlimited = await FaucetUnlimited.deploy(PYUSD_ADDRESS);
  await faucetUnlimited.deployed();
  
  console.log("✅ ArcologyPYUSDFaucetUnlimited deployed to:", faucetUnlimited.address);
  
  // Add faucet as minter
  console.log("\nAdding faucet as minter...");
  const pyusd = await hre.ethers.getContractAt("ArcologyPYUSD", PYUSD_ADDRESS);
  const tx = await pyusd.addMinter(faucetUnlimited.address);
  await tx.wait();
  console.log("✅ Faucet added as minter");
  
  console.log("\n=== Deployment Summary ===");
  console.log("ArcologyPYUSD:", PYUSD_ADDRESS);
  console.log("ArcologyPYUSDFaucetUnlimited:", faucetUnlimited.address);
  console.log("\nUpdate your config.js:");
  console.log(`export const PYUSD_FAUCET_ADDRESS = '${faucetUnlimited.address}';`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
