const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const deploymentPath = path.join(__dirname, '../deployment-info.json');
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  const [deployer] = await hre.ethers.getSigners();
  const pyusdAddress = deploymentInfo.contracts.ArcologyPYUSD;
  
  const pyusd = await hre.ethers.getContractAt("ArcologyPYUSD", pyusdAddress);
  
  console.log("Deployer address:", deployer.address);
  console.log("PYUSD address:", pyusdAddress);
  
  // Get balance via event
  const tx = await pyusd.balanceOf(deployer.address);
  const receipt = await tx.wait();
  
  console.log("\nTransaction receipt:");
  console.log("Events:", receipt.events);
  
  // Try to decode the event
  if (receipt.events && receipt.events.length > 0) {
    for (const event of receipt.events) {
      console.log("\nEvent:", event.event);
      console.log("Args:", event.args);
      if (event.args && event.args.balance) {
        const balance = hre.ethers.utils.formatUnits(event.args.balance, 6);
        console.log("\n✅ Deployer PYUSD Balance:", balance, "PYUSD");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
