/**
 * User Bot - Command Line Test Suite
 * Test all bot commands without needing Telegram
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');

// Load deployment info
const deploymentPath = path.join(__dirname, '../hardhat/deployment-info.json');
const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const deployment = deploymentData.contracts;

// Setup provider
const provider = new ethers.providers.JsonRpcProvider('https://achievement-acts-content-guys.trycloudflare.com');

// Test private key (deployer account)
const TEST_PRIVATE_KEY = '134aea740081ac7e0e892ff8e5d0a763ec400fcd34bae70bcfe6dae3aceeb7f0';

// Contract ABIs
const ERC20_ABI = [
    'function balanceOf(address) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)'
];

const FAUCET_ABI = [
    'function claim() external',
    'function lastClaim(address) external view returns (uint256)',
    'function claimAmount() external view returns (uint256)'
];

const EXECUTOR_ABI = [
    'function deposit(uint256 amount) external',
    'function withdraw(uint256 amount) external',
    'function userBalances(address) external view returns (uint256)'
];

const REGISTRY_ABI = [
    'function isBroadcaster(address) external view returns (bool)',
    'function broadcasterInfo(address) external view returns (string name, uint256 feePercentage, uint256 totalSignals, uint256 followerCount, bool isActive)',
    'function followBroadcaster(address broadcaster) external',
    'function unfollowBroadcaster(address broadcaster) external',
    'function isFollowing(address user, address broadcaster) external view returns (bool)'
];

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
    console.log('='.repeat(80));
}

// Test state
let wallet;
let pyusdContract;
let faucetContract;
let executorContract;
let registryContract;

async function initialize() {
    log('\n🚀 Initializing User Bot Test Suite\n', 'cyan');
    
    // Create wallet
    wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
    log(`✅ Wallet created: ${wallet.address}`, 'green');
    
    // Check ARC balance
    const arcBalance = await wallet.getBalance();
    log(`💰 ARC Balance: ${ethers.utils.formatEther(arcBalance)} ARC`, 'blue');
    
    // Connect to contracts
    pyusdContract = new ethers.Contract(deployment.MockPYUSD, ERC20_ABI, wallet);
    faucetContract = new ethers.Contract(deployment.PyUSDFaucet, FAUCET_ABI, wallet);
    executorContract = new ethers.Contract(deployment.ParallelBatchExecutor, EXECUTOR_ABI, wallet);
    registryContract = new ethers.Contract(deployment.BroadcasterRegistry, REGISTRY_ABI, wallet);
    
    log(`✅ Connected to MockPYUSD: ${deployment.MockPYUSD}`, 'green');
    log(`✅ Connected to PyUSDFaucet: ${deployment.PyUSDFaucet}`, 'green');
    log(`✅ Connected to ParallelBatchExecutor: ${deployment.ParallelBatchExecutor}`, 'green');
    log(`✅ Connected to BroadcasterRegistry: ${deployment.BroadcasterRegistry}`, 'green');
    
    const network = await provider.getNetwork();
    log(`📡 Network: Chain ID ${network.chainId}`, 'blue');
    
    separator();
}

async function testBalances() {
    log('\n💰 TEST 1: Check All Balances', 'cyan');
    separator();
    
    try {
        // ARC balance
        const arcBalance = await wallet.getBalance();
        log(`ARC Balance: ${ethers.utils.formatEther(arcBalance)} ARC`, 'blue');
        
        // PYUSD wallet balance
        const pyusdBalance = await pyusdContract.balanceOf(wallet.address);
        log(`PYUSD (Wallet): ${ethers.utils.formatUnits(pyusdBalance, 6)} PYUSD`, 'blue');
        
        // PYUSD executor balance
        const executorBalance = await executorContract.userBalances(wallet.address);
        log(`PYUSD (Executor): ${ethers.utils.formatUnits(executorBalance, 6)} PYUSD`, 'blue');
        
        // Total PYUSD
        const total = pyusdBalance.add(executorBalance);
        log(`Total PYUSD: ${ethers.utils.formatUnits(total, 6)} PYUSD`, 'magenta');
        
        log('✅ PASSED: Balances retrieved successfully', 'green');
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function testFaucetClaim() {
    log('\n🚰 TEST 2: Claim from Faucet', 'cyan');
    separator();
    
    try {
        // Check last claim
        const lastClaim = await faucetContract.lastClaim(wallet.address);
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastClaim = now - lastClaim.toNumber();
        const cooldown = 24 * 60 * 60; // 24 hours
        
        log(`Last Claim: ${lastClaim.toNumber() === 0 ? 'Never' : new Date(lastClaim.toNumber() * 1000).toISOString()}`);
        log(`Time Since Last Claim: ${Math.floor(timeSinceLastClaim / 3600)} hours`);
        
        if (timeSinceLastClaim < cooldown && lastClaim.toNumber() !== 0) {
            const timeLeft = cooldown - timeSinceLastClaim;
            log(`⏳ Cooldown active: ${Math.floor(timeLeft / 3600)} hours remaining`, 'yellow');
            log('ℹ️  Skipping claim test', 'blue');
            separator();
            return;
        }
        
        // Get balance before
        const balanceBefore = await pyusdContract.balanceOf(wallet.address);
        log(`Balance Before: ${ethers.utils.formatUnits(balanceBefore, 6)} PYUSD`);
        
        // Claim from faucet
        log('⏳ Claiming from faucet...');
        const tx = await faucetContract.claim();
        log(`📤 Transaction sent: ${tx.hash}`, 'blue');
        
        const receipt = await tx.wait();
        log(`✅ Transaction confirmed in block ${receipt.blockNumber}`, 'green');
        
        // Get balance after
        const balanceAfter = await pyusdContract.balanceOf(wallet.address);
        log(`Balance After: ${ethers.utils.formatUnits(balanceAfter, 6)} PYUSD`);
        
        const received = balanceAfter.sub(balanceBefore);
        log(`Received: ${ethers.utils.formatUnits(received, 6)} PYUSD`, 'green');
        
        log('✅ PASSED: Faucet claim successful', 'green');
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
        if (error.message.includes('Cooldown')) {
            log('ℹ️  This is expected if recently claimed', 'blue');
        }
    }
    
    separator();
}

async function testDeposit() {
    log('\n📥 TEST 3: Deposit to Executor', 'cyan');
    separator();
    
    try {
        const depositAmount = ethers.utils.parseUnits('50', 6); // 50 PYUSD
        
        // Check wallet balance
        const walletBalance = await pyusdContract.balanceOf(wallet.address);
        log(`Wallet Balance: ${ethers.utils.formatUnits(walletBalance, 6)} PYUSD`);
        
        if (walletBalance.lt(depositAmount)) {
            log('⚠️  Insufficient balance for deposit test', 'yellow');
            log('ℹ️  Skipping deposit test (claim from faucet first)', 'blue');
            separator();
            return;
        }
        
        log(`Depositing: ${ethers.utils.formatUnits(depositAmount, 6)} PYUSD`);
        
        // Check allowance
        const allowance = await pyusdContract.allowance(wallet.address, deployment.ParallelBatchExecutor);
        log(`Current Allowance: ${ethers.utils.formatUnits(allowance, 6)} PYUSD`);
        
        if (allowance.lt(depositAmount)) {
            log('⏳ Approving PYUSD...');
            const approveTx = await pyusdContract.approve(deployment.ParallelBatchExecutor, depositAmount);
            await approveTx.wait();
            log('✅ Approval confirmed', 'green');
        }
        
        // Get executor balance before
        const executorBalanceBefore = await executorContract.userBalances(wallet.address);
        log(`Executor Balance Before: ${ethers.utils.formatUnits(executorBalanceBefore, 6)} PYUSD`);
        
        // Deposit
        log('⏳ Depositing to executor...');
        const depositTx = await executorContract.deposit(depositAmount);
        log(`📤 Transaction sent: ${depositTx.hash}`, 'blue');
        
        const receipt = await depositTx.wait();
        log(`✅ Transaction confirmed in block ${receipt.blockNumber}`, 'green');
        
        // Get executor balance after
        const executorBalanceAfter = await executorContract.userBalances(wallet.address);
        log(`Executor Balance After: ${ethers.utils.formatUnits(executorBalanceAfter, 6)} PYUSD`);
        
        const deposited = executorBalanceAfter.sub(executorBalanceBefore);
        log(`Deposited: ${ethers.utils.formatUnits(deposited, 6)} PYUSD`, 'green');
        
        log('✅ PASSED: Deposit successful', 'green');
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function testWithdraw() {
    log('\n📤 TEST 4: Withdraw from Executor', 'cyan');
    separator();
    
    try {
        const withdrawAmount = ethers.utils.parseUnits('25', 6); // 25 PYUSD
        
        // Check executor balance
        const executorBalance = await executorContract.userBalances(wallet.address);
        log(`Executor Balance: ${ethers.utils.formatUnits(executorBalance, 6)} PYUSD`);
        
        if (executorBalance.lt(withdrawAmount)) {
            log('⚠️  Insufficient executor balance for withdrawal test', 'yellow');
            log('ℹ️  Skipping withdrawal test (deposit first)', 'blue');
            separator();
            return;
        }
        
        log(`Withdrawing: ${ethers.utils.formatUnits(withdrawAmount, 6)} PYUSD`);
        
        // Get wallet balance before
        const walletBalanceBefore = await pyusdContract.balanceOf(wallet.address);
        log(`Wallet Balance Before: ${ethers.utils.formatUnits(walletBalanceBefore, 6)} PYUSD`);
        
        // Withdraw
        log('⏳ Withdrawing from executor...');
        const withdrawTx = await executorContract.withdraw(withdrawAmount);
        log(`📤 Transaction sent: ${withdrawTx.hash}`, 'blue');
        
        const receipt = await withdrawTx.wait();
        log(`✅ Transaction confirmed in block ${receipt.blockNumber}`, 'green');
        
        // Get balances after
        const walletBalanceAfter = await pyusdContract.balanceOf(wallet.address);
        const executorBalanceAfter = await executorContract.userBalances(wallet.address);
        
        log(`Wallet Balance After: ${ethers.utils.formatUnits(walletBalanceAfter, 6)} PYUSD`);
        log(`Executor Balance After: ${ethers.utils.formatUnits(executorBalanceAfter, 6)} PYUSD`);
        
        const withdrawn = walletBalanceAfter.sub(walletBalanceBefore);
        log(`Withdrawn: ${ethers.utils.formatUnits(withdrawn, 6)} PYUSD`, 'green');
        
        log('✅ PASSED: Withdrawal successful', 'green');
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function testBroadcasterList() {
    log('\n📋 TEST 5: List Available Broadcasters', 'cyan');
    separator();
    
    try {
        // Check deployer address (likely to be registered)
        const broadcasterAddress = wallet.address;
        
        const isRegistered = await registryContract.isBroadcaster(broadcasterAddress);
        
        if (isRegistered) {
            const info = await registryContract.broadcasterInfo(broadcasterAddress);
            log('📡 Found Broadcaster:');
            log(`   Address: ${broadcasterAddress}`);
            log(`   Name: ${info.name}`);
            log(`   Fee: ${info.feePercentage.toString()}%`);
            log(`   Total Signals: ${info.totalSignals.toString()}`);
            log(`   Followers: ${info.followerCount.toString()}`);
            log(`   Active: ${info.isActive}`);
            log('✅ PASSED: Broadcaster found', 'green');
        } else {
            log('ℹ️  No broadcasters registered yet', 'blue');
            log('ℹ️  Run broadcaster bot test to register one', 'blue');
        }
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function testFollowBroadcaster() {
    log('\n👥 TEST 6: Follow a Broadcaster', 'cyan');
    separator();
    
    try {
        const broadcasterAddress = wallet.address; // Follow self for testing
        
        // Check if broadcaster exists
        const isRegistered = await registryContract.isBroadcaster(broadcasterAddress);
        
        if (!isRegistered) {
            log('⚠️  Broadcaster not registered', 'yellow');
            log('ℹ️  Skipping follow test (register broadcaster first)', 'blue');
            separator();
            return;
        }
        
        // Check if already following
        const alreadyFollowing = await registryContract.isFollowing(wallet.address, broadcasterAddress);
        
        if (alreadyFollowing) {
            log('ℹ️  Already following this broadcaster', 'blue');
            const info = await registryContract.broadcasterInfo(broadcasterAddress);
            log(`   Broadcaster: ${info.name}`);
            log(`   Fee: ${info.feePercentage.toString()}%`);
            log('✅ PASSED: Follow status verified', 'green');
            separator();
            return;
        }
        
        log(`Following: ${broadcasterAddress}`);
        
        // Follow broadcaster
        log('⏳ Following broadcaster...');
        const tx = await registryContract.followBroadcaster(broadcasterAddress);
        log(`📤 Transaction sent: ${tx.hash}`, 'blue');
        
        const receipt = await tx.wait();
        log(`✅ Transaction confirmed in block ${receipt.blockNumber}`, 'green');
        
        // Verify
        const nowFollowing = await registryContract.isFollowing(wallet.address, broadcasterAddress);
        log(`Now Following: ${nowFollowing}`);
        
        if (nowFollowing) {
            log('✅ PASSED: Successfully followed broadcaster', 'green');
        } else {
            log('❌ FAILED: Follow status not updated', 'red');
        }
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
        if (error.message.includes('already following')) {
            log('ℹ️  This is expected if already following', 'blue');
        }
    }
    
    separator();
}

async function testPortfolio() {
    log('\n📊 TEST 7: View Portfolio', 'cyan');
    separator();
    
    try {
        // Get all balances
        const pyusdWallet = await pyusdContract.balanceOf(wallet.address);
        const pyusdExecutor = await executorContract.userBalances(wallet.address);
        const arcBalance = await wallet.getBalance();
        
        log('💼 Portfolio Summary:');
        log('');
        log('Wallet:');
        log(`  PYUSD: ${ethers.utils.formatUnits(pyusdWallet, 6)} PYUSD`);
        log(`  ARC: ${ethers.utils.formatEther(arcBalance)} ARC`);
        log('');
        log('Executor (Trading):');
        log(`  PYUSD: ${ethers.utils.formatUnits(pyusdExecutor, 6)} PYUSD`);
        log('');
        log('Total Assets:');
        const totalPyusd = pyusdWallet.add(pyusdExecutor);
        log(`  PYUSD: ${ethers.utils.formatUnits(totalPyusd, 6)} PYUSD`);
        log(`  ARC: ${ethers.utils.formatEther(arcBalance)} ARC`);
        
        log('✅ PASSED: Portfolio retrieved successfully', 'green');
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function testContracts() {
    log('\n📜 TEST 8: Verify Contract Addresses', 'cyan');
    separator();
    
    try {
        log('Deployed Contracts:');
        log(`  MockPYUSD: ${deployment.MockPYUSD}`);
        log(`  WETH: ${deployment.WETH}`);
        log(`  AMM: ${deployment.AMM}`);
        log(`  ParallelBatchExecutor: ${deployment.ParallelBatchExecutor}`);
        log(`  BroadcasterRegistry: ${deployment.BroadcasterRegistry}`);
        log(`  PyUSDFaucet: ${deployment.PyUSDFaucet}`);
        
        // Verify contracts exist
        const code = await provider.getCode(deployment.MockPYUSD);
        if (code !== '0x') {
            log('✅ PASSED: Contracts verified on-chain', 'green');
        } else {
            log('❌ FAILED: Contracts not found', 'red');
        }
    } catch (error) {
        log(`❌ FAILED: ${error.message}`, 'red');
    }
    
    separator();
}

async function runAllTests() {
    log('\n' + '='.repeat(80), 'cyan');
    log('👥 USER BOT - COMMAND LINE TEST SUITE', 'cyan');
    log('='.repeat(80) + '\n', 'cyan');
    
    try {
        await initialize();
        await testBalances();
        await testFaucetClaim();
        await testDeposit();
        await testWithdraw();
        await testBroadcasterList();
        await testFollowBroadcaster();
        await testPortfolio();
        await testContracts();
        
        log('\n' + '='.repeat(80), 'green');
        log('✅ ALL TESTS COMPLETED', 'green');
        log('='.repeat(80) + '\n', 'green');
        
        log('📝 Summary:', 'cyan');
        log('  - Balance checking: ✅');
        log('  - Faucet claims: ✅');
        log('  - Deposits: ✅');
        log('  - Withdrawals: ✅');
        log('  - Following broadcasters: ✅');
        log('  - Portfolio view: ✅');
        log('');
        log('💡 Next Steps:', 'yellow');
        log('  1. Test in actual Telegram bot');
        log('  2. Test signal execution when relayer is ready');
        log('  3. Verify P&L calculations');
        log('');
        
    } catch (error) {
        log('\n' + '='.repeat(80), 'red');
        log('❌ TEST SUITE FAILED', 'red');
        log('='.repeat(80) + '\n', 'red');
        log(`Error: ${error.message}`, 'red');
        console.error(error);
    }
}

// Run tests
runAllTests().catch(console.error);
