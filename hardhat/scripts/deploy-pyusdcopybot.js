const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log('\n🚀 Deploying PyUSDCopyBot Contracts to Arcology DevNet\n');
    console.log('='.repeat(70));

    const [deployer] = await ethers.getSigners();
    
    console.log('\n📍 Deployment Account:');
    console.log(`   Deployer:    ${deployer.address}`);
    console.log(`   Note: Deployer will also act as relayer and broadcaster for testing`);

    // ========================================================================
    // 1. Deploy MockPYUSD
    // ========================================================================
    console.log('\n💵 Step 1: Deploying MockPYUSD Token...');
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    const pyusd = await MockPYUSD.deploy();
    await pyusd.deployed();
    console.log(`   ✅ MockPYUSD deployed: ${pyusd.address}`);
    
    const totalSupply = await pyusd.totalSupply();
    console.log(`   📊 Initial supply: ${ethers.utils.formatUnits(totalSupply, 6)} PYUSD`);

    // ========================================================================
    // 2. Deploy WETH (using existing MockERC20 pattern)
    // ========================================================================
    console.log('\n💎 Step 2: Deploying WETH Token...');
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`   ✅ WETH deployed: ${weth.address}`);

    // ========================================================================
    // 3. Deploy AMM Contract
    // ========================================================================
    console.log('\n🔄 Step 3: Deploying AMM Contract...');
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(pyusd.address, weth.address);
    await amm.deployed();
    console.log(`   ✅ AMM deployed: ${amm.address}`);

    // ========================================================================
    // 4. Fund AMM with Liquidity
    // ========================================================================
    console.log('\n💧 Step 4: Adding Liquidity to AMM...');
    
    // Mint tokens for liquidity - 500,000 PYUSD + 250 WETH (price: 2000 PYUSD/WETH)
    console.log('   Minting tokens for liquidity...');
    let tx = await pyusd.mint(deployer.address, ethers.utils.parseUnits("1000000", 6)); // 1M PYUSD
    await tx.wait();
    tx = await weth.mint(deployer.address, ethers.utils.parseEther("500")); // 500 WETH
    await tx.wait();
    console.log('   ✅ Tokens minted');
    
    // Approve AMM
    console.log('   Approving AMM...');
    tx = await pyusd.approve(amm.address, ethers.utils.parseUnits("500000", 6));
    await tx.wait();
    tx = await weth.approve(amm.address, ethers.utils.parseEther("250"));
    await tx.wait();
    console.log('   ✅ Approvals done');
    
    // Add liquidity: 500,000 PYUSD + 250 WETH (price: 2000 PYUSD/WETH = $500k liquidity)
    console.log('   Adding liquidity to AMM...');
    tx = await amm.addLiquidity(
        ethers.utils.parseUnits("500000", 6),
        ethers.utils.parseEther("250")
    );
    await tx.wait();
    
    const reserves = await amm.getReserves();
    const pyusdReserve = ethers.utils.formatUnits(reserves[0], 6);
    const wethReserve = ethers.utils.formatEther(reserves[1]);
    const totalValueUSD = parseFloat(pyusdReserve);
    
    console.log(`   ✅ Liquidity added:`);
    console.log(`      PYUSD: ${pyusdReserve}`);
    console.log(`      WETH:  ${wethReserve}`);
    console.log(`      Price: ${parseFloat(pyusdReserve) / parseFloat(wethReserve)} PYUSD/WETH`);
    console.log(`      Total Liquidity: $${totalValueUSD.toLocaleString()} USD`);

    // ========================================================================
    // 5. Deploy ParallelBatchExecutor
    // ========================================================================
    console.log('\n⚡ Step 5: Deploying ParallelBatchExecutor...');
    const BatchExecutor = await ethers.getContractFactory("ParallelBatchExecutor");
    const executor = await BatchExecutor.deploy(
        pyusd.address,
        weth.address,
        amm.address,
        deployer.address  // Using deployer as relayer for testing
    );
    await executor.deployed();
    console.log(`   ✅ ParallelBatchExecutor deployed: ${executor.address}`);

    // ========================================================================
    // 6. Deploy BroadcasterRegistry
    // ========================================================================
    console.log('\n📋 Step 6: Deploying BroadcasterRegistry...');
    const Registry = await ethers.getContractFactory("BroadcasterRegistry");
    const registry = await Registry.deploy();
    await registry.deployed();
    console.log(`   ✅ BroadcasterRegistry deployed: ${registry.address}`);

    // ========================================================================
    // 7. Deploy PyUSDFaucet
    // ========================================================================
    console.log('\n🎁 Step 7: Deploying PyUSDFaucet...');
    const Faucet = await ethers.getContractFactory("PyUSDFaucet");
    const faucet = await Faucet.deploy(pyusd.address);
    await faucet.deployed();
    console.log(`   ✅ PyUSDFaucet deployed: ${faucet.address}`);
    
    // Fund the faucet with 100,000 PYUSD
    const faucetAmount = ethers.utils.parseUnits("100000", 6);
    await pyusd.transfer(faucet.address, faucetAmount);
    console.log(`   💰 Faucet funded with: ${ethers.utils.formatUnits(faucetAmount, 6)} PYUSD`);
    console.log(`   📊 This allows ${ethers.utils.formatUnits(faucetAmount, 6) / 100} users to claim 100 PYUSD each`);

    // ========================================================================
    // 8. Deploy ARC Faucet (for gas fees)
    // ========================================================================
    console.log('\n⛽ Step 8: Deploying ARC Faucet...');
    const ARCFaucet = await ethers.getContractFactory("ARCFaucet");
    const arcFaucet = await ARCFaucet.deploy();
    await arcFaucet.deployed();
    console.log(`   ✅ ARCFaucet deployed: ${arcFaucet.address}`);
    
    // Try to fund ARC faucet with 1000 ARC (optional - may fail if deployer has insufficient balance)
    try {
        const arcFundTx = await deployer.sendTransaction({
            to: arcFaucet.address,
            value: ethers.utils.parseEther("1000")
        });
        await arcFundTx.wait();
        console.log(`   💰 ARC Faucet funded with: 1000 ARC`);
    } catch (error) {
        console.log(`   ⚠️  Warning: Could not fund ARC Faucet (insufficient deployer ARC balance)`);
        console.log(`   💡 Fund the faucet manually later: ${arcFaucet.address}`);
    }

    // ========================================================================
    // 9. Setup Test Data
    // ========================================================================
    console.log('\n🧪 Step 9: Setting up test data...');
    
    // Register the test broadcaster
    tx = await registry.connect(deployer).registerBroadcaster("Test Broadcaster", 1500);
    await tx.wait();
    console.log(`   ✅ Test broadcaster registered: ${deployer.address}`);
    console.log(`      Name: Test Broadcaster`);
    console.log(`      Fee: 15%`);
    
    // Mint test PYUSD to deployer
    tx = await pyusd.mint(deployer.address, ethers.utils.parseUnits("10000", 6));
    await tx.wait();
    console.log(`   ✅ Minted 10,000 PYUSD to deployer`);
    
    // Mint test WETH
    tx = await weth.mint(deployer.address, ethers.utils.parseEther("5"));
    await tx.wait();
    console.log(`   ✅ Minted 5 WETH to deployer`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ DEPLOYMENT COMPLETE!\n');
    
    console.log('📝 Contract Addresses:\n');
    console.log(`   MockPYUSD:              ${pyusd.address}`);
    console.log(`   WETH:                   ${weth.address}`);
    console.log(`   AMM:                    ${amm.address}`);
    console.log(`   ParallelBatchExecutor:  ${executor.address}`);
    console.log(`   BroadcasterRegistry:    ${registry.address}`);
    console.log(`   PyUSDFaucet:            ${faucet.address}`);
    console.log(`   ARCFaucet:              ${arcFaucet.address}`);
    
    console.log('\n📊 Network Info:\n');
    console.log(`   Network:        ${hre.network.name}`);
    console.log(`   Chain ID:       ${hre.network.config.chainId || 118}`);
    console.log(`   RPC URL:        ${hre.network.config.url}`);
    
    console.log('\n👥 Key Account:\n');
    console.log(`   Deployer/Relayer/Broadcaster: ${deployer.address}`);
    
    console.log('\n🎯 Next Steps:\n');
    console.log('   1. Update frontend config with contract addresses');
    console.log('   2. Users can claim PYUSD from faucet');
    console.log('   3. Users can claim ARC for gas from ARC faucet');
    console.log('   4. Users deposit PYUSD to ParallelBatchExecutor');
    console.log('   5. Users follow broadcasters via BroadcasterRegistry');
    console.log('   6. Broadcaster posts signals via Telegram bot');
    console.log('   7. Relayer executes parallel batches');
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    // Save deployment info to file
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId || 118,
        timestamp: new Date().toISOString(),
        contracts: {
            MockPYUSD: pyusd.address,
            WETH: weth.address,
            AMM: amm.address,
            ParallelBatchExecutor: executor.address,
            BroadcasterRegistry: registry.address,
            PyUSDFaucet: faucet.address,
            ARCFaucet: arcFaucet.address
        },
        accounts: {
            deployer: deployer.address,
            relayer: deployer.address,  // Same as deployer for testing
            broadcaster: deployer.address  // Same as deployer for testing
        }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        './deployment-info.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('💾 Deployment info saved to: deployment-info.json\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
