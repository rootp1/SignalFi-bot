const hre = require("hardhat");
const { ethers } = require("hardhat");

// Import deployment info
const deploymentInfo = require('../deployment-info.json');

async function main() {
    console.log('\n🧪 Testing Deployed Contracts on Arcology DevNet\n');
    console.log('='.repeat(70));

    const [deployer] = await ethers.getSigners();
    console.log(`\n📍 Testing with account: ${deployer.address}`);

    // Check initial balance
    const initialBalance = await deployer.getBalance();
    console.log(`   Initial ARC balance: ${ethers.utils.formatEther(initialBalance)} ARC\n`);

    // Connect to deployed contracts
    console.log('📦 Connecting to deployed contracts...');
    const pyusd = await ethers.getContractAt("MockPYUSD", deploymentInfo.contracts.MockPYUSD);
    const weth = await ethers.getContractAt("MockERC20", deploymentInfo.contracts.WETH);
    const amm = await ethers.getContractAt("AmmContract", deploymentInfo.contracts.AMM);
    const executor = await ethers.getContractAt("ParallelBatchExecutor", deploymentInfo.contracts.ParallelBatchExecutor);
    const registry = await ethers.getContractAt("BroadcasterRegistry", deploymentInfo.contracts.BroadcasterRegistry);
    const faucet = await ethers.getContractAt("PyUSDFaucet", deploymentInfo.contracts.PyUSDFaucet);
    console.log('   ✅ All contracts connected\n');

    // ========================================================================
    // Test 1: Verify AMM Liquidity
    // ========================================================================
    console.log('🔍 Test 1: Checking AMM Liquidity...');
    try {
        const reserves = await amm.getReserves();
        const pyusdReserve = ethers.utils.formatUnits(reserves[0], 6);
        const wethReserve = ethers.utils.formatEther(reserves[1]);
        
        console.log(`   PYUSD Reserve: ${pyusdReserve}`);
        console.log(`   WETH Reserve:  ${wethReserve}`);
        
        if (parseFloat(pyusdReserve) > 0 && parseFloat(wethReserve) > 0) {
            const price = parseFloat(pyusdReserve) / parseFloat(wethReserve);
            console.log(`   Price: ${price.toFixed(2)} PYUSD/WETH`);
            console.log('   ✅ AMM has liquidity!\n');
        } else {
            console.log('   ⚠️  WARNING: AMM has no liquidity!\n');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Test 2: Check Token Balances
    // ========================================================================
    console.log('🔍 Test 2: Checking Token Balances...');
    try {
        const pyusdBalance = await pyusd.balanceOf(deployer.address);
        const wethBalance = await weth.balanceOf(deployer.address);
        
        console.log(`   PYUSD: ${ethers.utils.formatUnits(pyusdBalance, 6)}`);
        console.log(`   WETH:  ${ethers.utils.formatEther(wethBalance)}`);
        console.log('   ✅ Token balances retrieved\n');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Test 3: Test PYUSD Faucet
    // ========================================================================
    console.log('🔍 Test 3: Testing PYUSD Faucet...');
    try {
        const canClaim = await faucet.canClaim(deployer.address);
        console.log(`   Can claim: ${canClaim}`);
        
        if (canClaim) {
            console.log('   Claiming 100 PYUSD...');
            const claimTx = await faucet.claimPYUSD();
            const receipt = await claimTx.wait();
            console.log(`   ✅ Claimed! Gas used: ${receipt.gasUsed.toString()}`);
            
            const newBalance = await pyusd.balanceOf(deployer.address);
            console.log(`   New PYUSD balance: ${ethers.utils.formatUnits(newBalance, 6)}\n`);
        } else {
            const timeUntilNext = await faucet.getTimeUntilNextClaim(deployer.address);
            console.log(`   ⏳ Already claimed. Wait ${timeUntilNext} seconds\n`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Test 4: Test Deposit to Executor
    // ========================================================================
    console.log('🔍 Test 4: Testing Deposit to ParallelBatchExecutor...');
    try {
        const depositAmount = ethers.utils.parseUnits("100", 6);
        const currentBalance = await pyusd.balanceOf(deployer.address);
        
        if (currentBalance.gte(depositAmount)) {
            console.log('   Approving PYUSD...');
            let tx = await pyusd.approve(executor.address, depositAmount);
            await tx.wait();
            
            console.log('   Depositing 100 PYUSD...');
            tx = await executor.deposit(depositAmount);
            const receipt = await tx.wait();
            console.log(`   ✅ Deposited! Gas used: ${receipt.gasUsed.toString()}`);
            
            const executorBalance = await executor.getPYUSDBalance(deployer.address);
            console.log(`   Executor balance: ${ethers.utils.formatUnits(executorBalance, 6)} PYUSD\n`);
        } else {
            console.log(`   ⚠️  Insufficient PYUSD balance (have: ${ethers.utils.formatUnits(currentBalance, 6)})\n`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Test 5: Check Broadcaster Registry
    // ========================================================================
    console.log('🔍 Test 5: Checking Broadcaster Registry...');
    try {
        const broadcasterInfo = await registry.broadcasters(deployer.address);
        
        if (broadcasterInfo.name && broadcasterInfo.name !== "") {
            console.log(`   Name: ${broadcasterInfo.name}`);
            console.log(`   Fee: ${broadcasterInfo.feePercentage / 100}%`);
            console.log(`   Followers: ${broadcasterInfo.followerCount.toString()}`);
            console.log(`   Total Trades: ${broadcasterInfo.totalTrades.toString()}`);
            console.log('   ✅ Broadcaster registered\n');
        } else {
            console.log('   ⚠️  No broadcaster registered at this address\n');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Test 6: Test AMM Swap Quote
    // ========================================================================
    console.log('🔍 Test 6: Testing AMM Swap Quote...');
    try {
        const inputAmount = ethers.utils.parseUnits("100", 6); // 100 PYUSD
        const outputAmount = await amm.getAmountOut(
            inputAmount,
            pyusd.address,
            weth.address
        );
        
        console.log(`   Input: 100 PYUSD`);
        console.log(`   Output: ${ethers.utils.formatEther(outputAmount)} WETH`);
        console.log(`   Effective Price: ${100 / parseFloat(ethers.utils.formatEther(outputAmount))} PYUSD/WETH`);
        console.log('   ✅ AMM swap quote working\n');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    const finalBalance = await deployer.getBalance();
    const gasUsed = initialBalance.sub(finalBalance);
    
    console.log('='.repeat(70));
    console.log('📊 Test Summary\n');
    console.log(`   Gas used: ${ethers.utils.formatEther(gasUsed)} ARC`);
    console.log(`   Final balance: ${ethers.utils.formatEther(finalBalance)} ARC`);
    console.log('\n✅ All tests completed!\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
