const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 Redeploying ArcologyPYUSDFaucet (No Cooldown)...\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ARC\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployment-info.json');
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  const pyusdAddress = deploymentInfo.contracts.ArcologyPYUSD;
  console.log("Using existing ArcologyPYUSD at:", pyusdAddress);

  // Deploy new faucet
  console.log("\nDeploying ArcologyPYUSDFaucet...");
  const ArcologyPYUSDFaucet = await hre.ethers.getContractFactory("ArcologyPYUSDFaucet");
  const pyusdFaucet = await ArcologyPYUSDFaucet.deploy(pyusdAddress);
  await pyusdFaucet.deployed();
  console.log("✅ ArcologyPYUSDFaucet deployed to:", pyusdFaucet.address);

  // Mint PYUSD to deployer first
  console.log("\nMinting PYUSD to deployer...");
  const pyusd = await hre.ethers.getContractAt("ArcologyPYUSD", pyusdAddress);
  const mintAmount = hre.ethers.utils.parseUnits("100000", 6); // 100,000 PYUSD
  
  const mintTx = await pyusd.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("   ✅ Minted", hre.ethers.utils.formatUnits(mintAmount, 6), "PYUSD to deployer");

  // Fund the faucet with PYUSD
  console.log("\nFunding faucet with PYUSD...");
  const faucetAmount = hre.ethers.utils.parseUnits("50000", 6); // 50,000 PYUSD
  
  const transferTx = await pyusd.transfer(pyusdFaucet.address, faucetAmount);
  await transferTx.wait();
  console.log("   💰 Transferred", hre.ethers.utils.formatUnits(faucetAmount, 6), "PYUSD to faucet");

  // Update deployment info
  deploymentInfo.contracts.ArcologyPYUSDFaucet = pyusdFaucet.address;
  deploymentInfo.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Updated deployment-info.json");

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("   ArcologyPYUSD:         ", pyusdAddress);
  console.log("   ArcologyPYUSDFaucet:   ", pyusdFaucet.address);
  console.log("\n💡 Update the frontend config with the new faucet address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
