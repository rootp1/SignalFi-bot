const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Deploying Arcology-Compatible PyUSDCopyBot Contracts");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n📍 Deployment Account:");
  console.log(`   Deployer:    ${deployer.address}`);
  console.log("   Note: Deployer will also act as relayer and broadcaster for testing");

  // Step 1: Deploy ArcologyPYUSD
  console.log("\n💵 Step 1: Deploying ArcologyPYUSD Token...");
  const ArcologyPYUSD = await hre.ethers.getContractFactory("ArcologyPYUSD");
  const pyusd = await ArcologyPYUSD.deploy();
  await pyusd.deployed();
  console.log(`   ✅ ArcologyPYUSD deployed: ${pyusd.address}`);

  // Step 2: Deploy ArcologyWETH
  console.log("\n💎 Step 2: Deploying ArcologyWETH Token...");
  const ArcologyWETH = await hre.ethers.getContractFactory("ArcologyWETH");
  const weth = await ArcologyWETH.deploy();
  await weth.deployed();
  console.log(`   ✅ ArcologyWETH deployed: ${weth.address}`);

  // Step 3: Deploy AMM Contract
  console.log("\n🔄 Step 3: Deploying AMM Contract...");
  const AMM = await hre.ethers.getContractFactory("AmmContract");
  const amm = await AMM.deploy(pyusd.address, weth.address);
  await amm.deployed();
  console.log(`   ✅ AMM deployed: ${amm.address}`);

  // Step 4: Add Liquidity to AMM
  console.log("\n💧 Step 4: Adding Liquidity to AMM...");
  const pyusdLiquidity = hre.ethers.BigNumber.from("500000").mul(hre.ethers.BigNumber.from(10).pow(6)); // 500k PYUSD
  const wethLiquidity = hre.ethers.utils.parseEther("250"); // 250 WETH
  
  console.log("   Minting tokens for liquidity...");
  await pyusd.mint(deployer.address, pyusdLiquidity);
  await weth.mint(deployer.address, wethLiquidity);
  console.log("   ✅ Tokens minted");

  console.log("   Approving AMM...");
  await pyusd.approve(amm.address, pyusdLiquidity);
  await weth.approve(amm.address, wethLiquidity);
  console.log("   ✅ Approvals done");

  console.log("   Adding liquidity to AMM...");
  await amm.addLiquidity(pyusdLiquidity, wethLiquidity);
  console.log("   ✅ Liquidity added:");
  console.log(`      PYUSD: ${hre.ethers.utils.formatUnits(pyusdLiquidity, 6)}`);
  console.log(`      WETH:  ${hre.ethers.utils.formatEther(wethLiquidity)}`);
  console.log(`      Price: 2000 PYUSD/WETH`);
  console.log(`      Total Liquidity: $500,000 USD`);

  // Step 5: Deploy ParallelBatchExecutor
  console.log("\n⚡ Step 5: Deploying ParallelBatchExecutor...");
  const ParallelBatchExecutor = await hre.ethers.getContractFactory("ParallelBatchExecutor");
  const executor = await ParallelBatchExecutor.deploy(
    pyusd.address,
    weth.address,
    amm.address,
    deployer.address  // relayer address
  );
  await executor.deployed();
  console.log(`   ✅ ParallelBatchExecutor deployed: ${executor.address}`);

  // Step 6: Deploy BroadcasterRegistry
  console.log("\n📋 Step 6: Deploying BroadcasterRegistry...");
  const BroadcasterRegistry = await hre.ethers.getContractFactory("BroadcasterRegistry");
  const registry = await BroadcasterRegistry.deploy();
  await registry.deployed();
  console.log(`   ✅ BroadcasterRegistry deployed: ${registry.address}`);

  // Step 7: Deploy ArcologyPYUSDFaucet
  console.log("\n🎁 Step 7: Deploying ArcologyPYUSDFaucet...");
  const ArcologyPYUSDFaucet = await hre.ethers.getContractFactory("ArcologyPYUSDFaucet");
  const pyusdFaucet = await ArcologyPYUSDFaucet.deploy(pyusd.address);
  await pyusdFaucet.deployed();
  console.log(`   ✅ ArcologyPYUSDFaucet deployed: ${pyusdFaucet.address}`);

  // Fund PYUSD faucet
  const faucetAmount = hre.ethers.BigNumber.from("100000").mul(hre.ethers.BigNumber.from(10).pow(6)); // 100k PYUSD
  await pyusd.mint(pyusdFaucet.address, faucetAmount);
  console.log(`   💰 Faucet funded with: ${hre.ethers.utils.formatUnits(faucetAmount, 6)} PYUSD`);
  console.log(`   📊 This allows 1000 users to claim 100 PYUSD each`);

  // Step 8: Deploy ARC Faucet
  console.log("\n⛽ Step 8: Deploying ARC Faucet...");
  const ARCFaucet = await hre.ethers.getContractFactory("ARCFaucet");
  const arcFaucet = await ARCFaucet.deploy();
  await arcFaucet.deployed();
  console.log(`   ✅ ARCFaucet deployed: ${arcFaucet.address}`);

  // Try to fund ARC faucet
  try {
    const arcAmount = hre.ethers.utils.parseEther("1000");
    const tx = await deployer.sendTransaction({
      to: arcFaucet.address,
      value: arcAmount
    });
    await tx.wait();
    console.log(`   ✅ ARCFaucet funded with 1000 ARC`);
  } catch (error) {
    console.log(`   ⚠️  Warning: Could not fund ARC Faucet (insufficient deployer ARC balance)`);
    console.log(`   💡 Fund the faucet manually later: ${arcFaucet.address}`);
  }

  // Step 9: Setup test data
  console.log("\n🧪 Step 9: Setting up test data...");
  await registry.registerBroadcaster("Test Broadcaster", 15);
  console.log(`   ✅ Test broadcaster registered: ${deployer.address}`);
  console.log(`      Name: Test Broadcaster`);
  console.log(`      Fee: 15%`);

  // Mint some tokens to deployer for testing
  await pyusd.mint(deployer.address, hre.ethers.BigNumber.from("10000").mul(hre.ethers.BigNumber.from(10).pow(6)));
  await weth.mint(deployer.address, hre.ethers.utils.parseEther("5"));
  console.log(`   ✅ Minted 10,000 PYUSD to deployer`);
  console.log(`   ✅ Minted 5 WETH to deployer`);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      ArcologyPYUSD: pyusd.address,
      ArcologyWETH: weth.address,
      AMM: amm.address,
      ParallelBatchExecutor: executor.address,
      BroadcasterRegistry: registry.address,
      ArcologyPYUSDFaucet: pyusdFaucet.address,
      ARCFaucet: arcFaucet.address
    },
    accounts: {
      deployer: deployer.address,
      relayer: deployer.address,
      broadcaster: deployer.address
    }
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("\n📝 Contract Addresses:\n");
  console.log(`   ArcologyPYUSD:          ${pyusd.address}`);
  console.log(`   ArcologyWETH:           ${weth.address}`);
  console.log(`   AMM:                    ${amm.address}`);
  console.log(`   ParallelBatchExecutor:  ${executor.address}`);
  console.log(`   BroadcasterRegistry:    ${registry.address}`);
  console.log(`   ArcologyPYUSDFaucet:    ${pyusdFaucet.address}`);
  console.log(`   ARCFaucet:              ${arcFaucet.address}`);

  console.log("\n📊 Network Info:\n");
  console.log(`   Network:        ${hre.network.name}`);
  console.log(`   Chain ID:       ${(await hre.ethers.provider.getNetwork()).chainId}`);
  const networkConfig = require("../network.json");
  console.log(`   RPC URL:        ${networkConfig[hre.network.name]?.url || 'N/A'}`);

  console.log("\n👥 Key Account:\n");
  console.log(`   Deployer/Relayer/Broadcaster: ${deployer.address}`);

  console.log("\n🎯 Next Steps:\n");
  console.log("   1. Update frontend config with contract addresses");
  console.log("   2. Update frontend to use Arcology event-based pattern");
  console.log("   3. Users can claim PYUSD from faucet");
  console.log("   4. Users can claim ARC for gas from ARC faucet");

  console.log("\n" + "=".repeat(70));
  console.log(`\n💾 Deployment info saved to: deployment-info.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
