const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Load deployment info
const deploymentInfo = require('../hardhat/deployment-info.json');

// Configuration
const BOT_TOKEN = process.env.broadcaster_bot_token;
const RPC_URL = process.env.RPC_URL || 'https://achievement-acts-content-guys.trycloudflare.com';
const BROADCASTER_SERVICE_URL = process.env.BROADCASTER_SERVICE_URL || 'http://localhost:3002';
const CHAIN_ID = 118;

// Contracts
const CONTRACTS = deploymentInfo.contracts;

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Store user sessions (wallet connections)
const userSessions = new Map();
const SESSION_FILE = path.join(__dirname, 'sessions.json');

// Load sessions from file on startup
async function loadSessions() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf8');
            const sessions = JSON.parse(data);
            
            for (const [chatId, sessionData] of Object.entries(sessions)) {
                if (sessionData.privateKey) {
                    const wallet = new ethers.Wallet(sessionData.privateKey, provider);
                    
                    // Fetch broadcaster details from broadcaster-service (MongoDB)
                    const broadcasterDetails = await fetchBroadcasterDetails(wallet);
                    
                    userSessions.set(chatId, { 
                        wallet,
                        broadcasterDetails 
                    });
                    
                    const status = broadcasterDetails.isRegistered 
                        ? `${broadcasterDetails.name} (${broadcasterDetails.fee}%)` 
                        : 'Not registered';
                    console.log(`✅ Restored session for chat ${chatId}: ${wallet.address.slice(0, 10)}... - ${status}`);
                }
            }
            console.log(`📂 Loaded ${userSessions.size} saved sessions`);
        }
    } catch (error) {
        console.error('⚠️ Error loading sessions:', error.message);
    }
}

// Save sessions to file
function saveSessions() {
    try {
        const sessions = {};
        userSessions.forEach((session, chatId) => {
            if (session.wallet && session.wallet.privateKey) {
                sessions[chatId] = {
                    privateKey: session.wallet.privateKey,
                    address: session.wallet.address
                };
                // Note: Broadcaster details are stored in MongoDB, not in sessions.json
            }
        });
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
        console.error('⚠️ Error saving sessions:', error.message);
    }
}

// Load sessions now
loadSessions();

// Store pending signals
const pendingSignals = new Map();

console.log('🎙️ PyUSD Broadcaster Bot Starting...');
console.log(`📡 Connected to Arcology DevNet (Chain ID: ${CHAIN_ID})`);
console.log(`📝 Contracts loaded:`, CONTRACTS);
console.log(`✅ Bot is ready!\n`);

// Helper function to format addresses
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Helper function to get user session
function getSession(chatId) {
    return userSessions.get(chatId);
}

// Helper function to set user session
function setSession(chatId, data) {
    userSessions.set(chatId, { ...getSession(chatId), ...data });
    // Persist sessions after each change
    try {
        saveSessions();
    } catch (e) {
        console.error('⚠️ Error persisting session:', e.message);
    }
}

// Helper function to fetch broadcaster details from broadcaster-service MongoDB
async function fetchBroadcasterDetails(wallet) {
    try {
        const response = await axios.get(`${BROADCASTER_SERVICE_URL}/broadcaster/${wallet.address}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching broadcaster details:', error.message);
        return {
            isRegistered: false
        };
    }
}

// /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;
    
    const welcomeMsg = `
🎙️ *Welcome to PyUSD Broadcaster Bot!*

Hi ${username}! 👋

This bot allows you to:
📡 Post trade signals to your followers
👥 Manage your follower count
📊 Track your performance stats
💰 Configure your fee structure

*Quick Start:*
1️⃣ Connect your wallet: /connect
2️⃣ Register as broadcaster: /register
3️⃣ Post signals: /broadcast
4️⃣ View stats: /stats

*Available Commands:*
/connect - Connect your wallet
/register - Register as broadcaster
/broadcast - Post a new trade signal
/stats - View your broadcaster stats
/followers - See your follower count
/history - View past signals
/fee - Update your fee percentage
/disconnect - Remove saved wallet session
/help - Show this help message

Let's get started! 🚀
    `;
    
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpMsg = `
📚 *Broadcaster Bot Commands*

*Setup:*
/connect - Connect your Ethereum wallet
/register - Register as a broadcaster on-chain

*Broadcasting:*
/broadcast - Post a trade signal (BUY/SELL)
  Example: Click /broadcast then follow prompts

*Management:*
/stats - View your performance statistics
/followers - Check follower count
/history - View your past signals (last 10)
/fee - Update your fee percentage (10-20%)
/disconnect - Remove saved wallet session

*Information:*
/myaddress - Show your connected wallet
/contracts - Show deployed contract addresses
/help - Show this help

*Signal Format Examples:*
• BUY 100 PYUSD worth of WETH
• SELL 0.5 WETH for PYUSD
• BUY with 25% of portfolio
• SELL all WETH holdings

Need help? Contact @support
    `;
    
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// /connect command
bot.onText(/\/connect/, async (msg) => {
    const chatId = msg.chat.id;
    
    const connectMsg = `
🔐 *Connect Your Wallet*

To connect your wallet, you need to provide your private key.

⚠️ *SECURITY WARNING:*
• Only use this with a TEST wallet
• Never share your private key
• This is for TESTNET only

Please send your private key in this format:
\`0x...\` (with or without 0x prefix)

Or use /cancel to abort.
    `;
    
    bot.sendMessage(chatId, connectMsg, { parse_mode: 'Markdown' });
    setSession(chatId, { awaitingPrivateKey: true });
});

// /claimfaucet command
bot.onText(/\/claimfaucet/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    try {
        bot.sendMessage(chatId, '🚰 Claiming test PYUSD from faucet...');
        
        const faucetAbi = require('../hardhat/artifacts/contracts/ArcologyPYUSDFaucet.sol/ArcologyPYUSDFaucet.json').abi;
        const faucet = new ethers.Contract(CONTRACTS.ArcologyPYUSDFaucet, faucetAbi, session.wallet);
        
        const tx = await faucet.claimPYUSD();
        const receipt = await tx.wait();
        
        const successMsg = `
✅ *Faucet Claim Successful!*

*Claimed:* 100 PYUSD
*Transaction:* \`${receipt.transactionHash}\`
*Gas Used:* ${receipt.gasUsed.toString()}

You can now:
• Deposit to start trading: /deposit
• Register as broadcaster: /register

Claim unlimited times! 🚀
        `;
        
        bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Faucet claim error:', error);
        bot.sendMessage(chatId, `❌ Claim failed: ${error.message}`);
    }
});

// /deposit command
bot.onText(/\/deposit(?:\s+(\d+\.?\d*))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const amount = match[1];
    
    if (!amount) {
        const depositMsg = `
💵 *Deposit PYUSD*

Enter the amount of PYUSD to deposit:
Example: \`/deposit 1000\`

Your deposit will be used when you broadcast signals.
All followers will copy your trades proportionally.

Or use /cancel to abort.
        `;
        
        bot.sendMessage(chatId, depositMsg, { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        const depositAmount = ethers.utils.parseUnits(amount, 6);
        
        bot.sendMessage(chatId, `💵 Depositing ${amount} PYUSD...`);
        
        const pyusdAbi = require('../hardhat/artifacts/contracts/ArcologyPYUSD.sol/ArcologyPYUSD.json').abi;
        const executorAbi = require('../hardhat/artifacts/contracts/ParallelBatchExecutor.sol/ParallelBatchExecutor.json').abi;
        
        const pyusd = new ethers.Contract(CONTRACTS.ArcologyPYUSD, pyusdAbi, session.wallet);
        const executor = new ethers.Contract(CONTRACTS.ParallelBatchExecutor, executorAbi, session.wallet);
        
        // Approve
        bot.sendMessage(chatId, '✅ Step 1/2: Approving PYUSD...');
        const approveTx = await pyusd.approve(CONTRACTS.ParallelBatchExecutor, depositAmount);
        await approveTx.wait();
        
        // Deposit
        bot.sendMessage(chatId, '✅ Step 2/2: Depositing to executor...');
        const depositTx = await executor.deposit(depositAmount);
        const receipt = await depositTx.wait();
        
        // Register deposit with relayer (Arcology workaround)
        bot.sendMessage(chatId, '✅ Step 3/3: Registering deposit with relayer...');
        try {
            const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000';
            await axios.post(`${RELAYER_URL}/register-deposit`, {
                address: session.wallet.address,
                amount: depositAmount.toString(),
                txHash: receipt.transactionHash
            });
            console.log(`✅ Deposit registered for ${session.wallet.address}: ${amount} PYUSD`);
        } catch (registerError) {
            console.error('⚠️ Failed to register deposit with relayer:', registerError.message);
            // Continue anyway - deposit was successful on-chain
        }
        
        const successMsg = `
✅ *Deposit Successful!*

*Amount:* ${amount} PYUSD
*Transaction:* \`${receipt.transactionHash}\`
*Gas Used:* ${receipt.gasUsed.toString()}

Your PYUSD is now deposited and ready for trading!

Next steps:
• Register as broadcaster: /register
• Post your first signal: /broadcast
• Check stats: /stats

When you broadcast a signal, you and all your followers will trade using your full deposited balances.
        `;
        
        bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Deposit error:', error);
        bot.sendMessage(chatId, `❌ Deposit failed: ${error.message}`);
    }
});

// /register command
bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    // Check if already registered (from cached session data)
    const broadcasterDetails = session.broadcasterDetails;
    
    if (broadcasterDetails && broadcasterDetails.isRegistered) {
        const alreadyRegisteredMsg = `
✅ *Already Registered!*

You are already registered as a broadcaster:

📝 Name: ${broadcasterDetails.name}
💰 Fee: ${broadcasterDetails.fee}%
${broadcasterDetails.isActive ? '✅ Active' : '⚠️ Inactive'}

You can:
• Post signals: /broadcast
• Check your stats: /stats
• View followers: /followers
        `;
        bot.sendMessage(chatId, alreadyRegisteredMsg, { parse_mode: 'Markdown' });
        return;
    }
    
    const registerMsg = `
📝 *Register as Broadcaster*

Connected wallet: \`${formatAddress(session.wallet.address)}\`

Please provide your broadcaster details:

*Name:* What should users see? (e.g., "Crypto Whale Signals")
*Fee:* What percentage fee? (10-20%, e.g., 15)

Format: \`Name | Fee\`
Example: \`Crypto Expert | 15\`

Or use /cancel to abort.
    `;
    
    bot.sendMessage(chatId, registerMsg, { parse_mode: 'Markdown' });
    setSession(chatId, { awaitingRegistration: true });
});

// /broadcast command
bot.onText(/\/broadcast/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const broadcastMsg = `
📡 *Broadcast New Signal*

Connected wallet: \`${formatAddress(session.wallet.address)}\`

What type of signal do you want to post?

Choose signal type:
    `;
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📈 BUY Signal', callback_data: 'signal_buy' },
                    { text: '📉 SELL Signal', callback_data: 'signal_sell' }
                ],
                [{ text: '❌ Cancel', callback_data: 'signal_cancel' }]
            ]
        }
    };
    
    bot.sendMessage(chatId, broadcastMsg, { parse_mode: 'Markdown', ...keyboard });
});

// /stats command
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    try {
        bot.sendMessage(chatId, '📊 Fetching your stats...');
        
        const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
        const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, provider);
        
        // Check if contract is deployed
        const code = await provider.getCode(CONTRACTS.BroadcasterRegistry);
        if (code === '0x') {
            bot.sendMessage(chatId, '❌ Error: BroadcasterRegistry contract not found. Please redeploy the contracts.');
            return;
        }
        
        const broadcasterInfo = await registry.broadcasters(session.wallet.address);
        
        if (!broadcasterInfo.isRegistered) {
            bot.sendMessage(chatId, '⚠️ You are not registered as a broadcaster. Use /register to get started!');
            return;
        }
        
        const successRate = broadcasterInfo.totalTrades.gt(0) 
            ? (broadcasterInfo.successfulTrades.toNumber() / broadcasterInfo.totalTrades.toNumber() * 100).toFixed(2)
            : '0.00';
        
        const profitLoss = broadcasterInfo.totalProfitLoss.isNegative()
            ? `-${ethers.utils.formatUnits(broadcasterInfo.totalProfitLoss.abs(), 6)}`
            : ethers.utils.formatUnits(broadcasterInfo.totalProfitLoss, 6);
        
        const statsMsg = `
📊 *Broadcaster Statistics*

*Name:* ${broadcasterInfo.name}
*Wallet:* \`${formatAddress(session.wallet.address)}\`
*Status:* ${broadcasterInfo.isVerified ? '✅ Verified' : '⚠️ Unverified'}
*Fee:* ${broadcasterInfo.feePercentage.toNumber() / 100}%

*Performance:*
👥 Followers: ${broadcasterInfo.followerCount.toString()}
📈 Total Trades: ${broadcasterInfo.totalTrades.toString()}
✅ Successful: ${broadcasterInfo.successfulTrades.toString()}
📊 Success Rate: ${successRate}%
💰 Total P/L: ${profitLoss} PYUSD

*Registration:* ${new Date(broadcasterInfo.registrationTime.toNumber() * 1000).toLocaleDateString()}
*Last Trade:* ${broadcasterInfo.lastTradeTime.toNumber() > 0 ? new Date(broadcasterInfo.lastTradeTime.toNumber() * 1000).toLocaleDateString() : 'Never'}

� Keep posting quality signals to grow your follower base!
        `;
        
        bot.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        
        let errorMsg = '❌ *Error fetching statistics*\n\n';
        
        if (error.code === 'CALL_EXCEPTION' || error.code === 'SERVER_ERROR') {
            errorMsg += `*Issue:* Unable to communicate with the smart contract.\n\n`;
            errorMsg += `*Possible causes:*\n`;
            errorMsg += `• The RPC endpoint may be down\n`;
            errorMsg += `• The contract may not be properly deployed\n`;
            errorMsg += `• Network connectivity issues\n\n`;
            errorMsg += `*Suggested actions:*\n`;
            errorMsg += `1. Try again in a few moments\n`;
            errorMsg += `2. Verify you're registered with /register\n`;
            errorMsg += `3. Contact admin if the issue persists`;
        } else {
            errorMsg += `*Error:* ${error.message}`;
        }
        
        bot.sendMessage(chatId, errorMsg, { parse_mode: 'Markdown' });
    }
});

// /followers command
bot.onText(/\/followers/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    try {
        bot.sendMessage(chatId, '👥 Fetching follower information...');
        
        // Get broadcaster details from session (already fetched on connect)
        const broadcasterDetails = session.broadcasterDetails;
        
        if (!broadcasterDetails || !broadcasterDetails.isRegistered) {
            bot.sendMessage(chatId, '⚠️ You are not registered as a broadcaster yet. Use /register to get started!');
            return;
        }
        
        // Get followers from broadcaster service (MongoDB)
        try {
            const response = await axios.get(
                `${BROADCASTER_SERVICE_URL}/followers/${session.wallet.address}/count`
            );
            
            const count = response.data.count || 0;
            
            const followersMsg = `
👥 *Follower Information*

*Broadcaster Name:* ${broadcasterDetails.name}
*Total Followers:* ${count}
*Status:* ${broadcasterDetails.isActive ? '✅ Active' : '⚠️ Inactive'}
*Fee Per Trade:* ${broadcasterDetails.fee}%

${count > 0 
    ? `Your signals will be executed for all ${count} follower${count !== 1 ? 's' : ''} when you broadcast.` 
    : 'You don\'t have any followers yet. Share your address to attract followers!'}

💡 Tip: Use /broadcast to send signals to your followers!
            `;
            
            bot.sendMessage(chatId, followersMsg, { parse_mode: 'Markdown' });
            
        } catch (serviceError) {
            console.error('Broadcaster service error:', serviceError.message);
            
            // If service is unavailable, show what we know from session
            const followersMsg = `
👥 *Follower Information*

*Broadcaster Name:* ${broadcasterDetails.name}
*Total Followers:* Unable to fetch (service offline)
*Status:* ${broadcasterDetails.isActive ? '✅ Active' : '⚠️ Inactive'}
*Fee Per Trade:* ${broadcasterDetails.fee}%

⚠️ Note: Broadcaster service is temporarily unavailable.
💡 Tip: Use /broadcast to send signals to your followers!
            `;
            
            bot.sendMessage(chatId, followersMsg, { parse_mode: 'Markdown' });
        }
        
    } catch (error) {
        console.error('Error fetching followers:', error);
        
        bot.sendMessage(chatId, `❌ Error fetching follower information.\n\nPlease try again or contact support if the issue persists.`);
    }
});

// /history command
bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    // This would fetch past signals from a database or blockchain events
    // For now, show placeholder
    const historyMsg = `
📜 *Signal History*

*Recent Signals:* (Last 10)

🔜 Signal history tracking coming soon!

This will show:
• Signal type (BUY/SELL)
• Amount and asset
• Timestamp
• Execution result
• Followers impacted

For now, check the blockchain explorer for your transactions.
    `;
    
    bot.sendMessage(chatId, historyMsg, { parse_mode: 'Markdown' });
});

// /fee command
bot.onText(/\/fee/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const feeMsg = `
💰 *Update Fee Percentage*

Current fee: Check with /stats

Enter your new fee percentage (10-20):
Example: \`15\` for 15%

Or use /cancel to abort.
    `;
    
    bot.sendMessage(chatId, feeMsg, { parse_mode: 'Markdown' });
    setSession(chatId, { awaitingFeeUpdate: true });
});

// /myaddress command
bot.onText(/\/myaddress/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ No wallet connected. Use /connect');
        return;
    }
    
    const balance = await provider.getBalance(session.wallet.address);
    
    const addressMsg = `
🔑 *Your Wallet*

*Address:* \`${session.wallet.address}\`
*Short:* ${formatAddress(session.wallet.address)}

*Balance:* ${ethers.utils.formatEther(balance)} ARC

*Network:* Arcology DevNet
*Chain ID:* ${CHAIN_ID}
    `;
    
    bot.sendMessage(chatId, addressMsg, { parse_mode: 'Markdown' });
});

// /disconnect command - remove saved wallet session
bot.onText(/\/disconnect/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (!session || !session.wallet) {
        bot.sendMessage(chatId, 'ℹ️ No wallet session found for this chat.');
        return;
    }

    // Remove session and persist
    userSessions.delete(String(chatId));
    try {
        saveSessions();
    } catch (e) {
        console.error('⚠️ Error saving sessions after disconnect:', e.message);
    }

    bot.sendMessage(chatId, '🔌 Disconnected. Your wallet session has been removed from this bot.');
});

// /contracts command
bot.onText(/\/contracts/, async (msg) => {
    const chatId = msg.chat.id;
    
    const contractsMsg = `
📝 *Deployed Contracts*

*MockPYUSD:*
\`${CONTRACTS.MockPYUSD}\`

*WETH:*
\`${CONTRACTS.WETH}\`

*AMM:*
\`${CONTRACTS.AMM}\`

*ParallelBatchExecutor:*
\`${CONTRACTS.ParallelBatchExecutor}\`

*BroadcasterRegistry:*
\`${CONTRACTS.BroadcasterRegistry}\`

*PyUSDFaucet:*
\`${CONTRACTS.PyUSDFaucet}\`

*Network:* Arcology DevNet
*RPC:* ${RPC_URL}
    `;
    
    bot.sendMessage(chatId, contractsMsg, { parse_mode: 'Markdown' });
});

// /cancel command
bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    setSession(chatId, {
        awaitingPrivateKey: false,
        awaitingRegistration: false,
        awaitingFeeUpdate: false,
        awaitingSignalDetails: false
    });
    bot.sendMessage(chatId, '❌ Operation cancelled.');
});

// ERC20 ABI (minimal - just what we need)
const ERC20_ABI = [
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function balanceOf(address account) public view returns (uint256)',
    'function allowance(address owner, address spender) public view returns (uint256)'
];

// AMM ABI (minimal - just swap function)
const AMM_ABI = [
    'function swap(address tokenIn, address tokenOut, uint256 amountIn, address to) public returns (bool)'
];

/**
 * Execute broadcaster's trade directly on L1
 */
async function executeBroadcasterTradeOnL1(wallet, signalType, amount) {
    console.log(`🔥 Executing broadcaster L1 trade: ${signalType} ${amount}`);
    
    const isBuy = signalType === 'BUY';
    const tokenIn = isBuy ? CONTRACTS.ArcologyPYUSD : CONTRACTS.ArcologyWETH;
    const tokenOut = isBuy ? CONTRACTS.ArcologyWETH : CONTRACTS.ArcologyPYUSD;
    
    // Convert amount to wei/smallest unit
    const amountInWei = ethers.utils.parseUnits(amount.toString(), isBuy ? 6 : 18); // PYUSD has 6 decimals, WETH has 18
    
    // Create contract instances
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const ammContract = new ethers.Contract(CONTRACTS.AMM, AMM_ABI, wallet);
    
    console.log(`📊 Trade details:
    - Type: ${signalType}
    - Token In: ${tokenIn}
    - Token Out: ${tokenOut}
    - Amount: ${amountInWei.toString()}
    `);
    
    // Step 1: Approve AMM to spend tokens (always approve, Arcology contracts work differently)
    console.log('📝 Approving AMM to spend tokens...');
    const approveTx = await tokenInContract.approve(CONTRACTS.AMM, amountInWei, {
        gasLimit: 300000 // Explicit gas limit for Arcology
    });
    await approveTx.wait();
    console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    
    // Step 2: Execute swap on L1
    console.log('🔄 Executing swap on AMM...');
    const swapTx = await ammContract.swap(
        tokenIn,
        tokenOut,
        amountInWei,
        wallet.address,
        {
            gasLimit: 500000 // Explicit gas limit for Arcology
        }
    );
    
    console.log(`⏳ Waiting for swap confirmation...`);
    const receipt = await swapTx.wait();
    console.log(`✅ Swap confirmed! Tx: ${swapTx.hash}`);
    
    return swapTx.hash;
}

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const session = getSession(chatId);
    
    // Handle confirm_signal callback
    if (data.startsWith('confirm_signal_')) {
        const amount = parseFloat(data.replace('confirm_signal_', ''));
        const signalType = session.signalType;
        
        bot.answerCallbackQuery(query.id, { text: 'Broadcasting signal...' });
        
        try {
            // Step 1: Execute broadcaster's own trade on L1 FIRST
            bot.sendMessage(chatId, '� Executing your trade on L1...');
            
            const broadcasterTxHash = await executeBroadcasterTradeOnL1(session.wallet, signalType, amount);
            
            bot.sendMessage(chatId, `✅ Your L1 trade executed!\n*Tx:* \`${broadcasterTxHash}\``, { parse_mode: 'Markdown' });
            
            // Step 2: Now broadcast signal to followers via relayer
            bot.sendMessage(chatId, '📡 Broadcasting signal to followers...');
            
            const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000';
            const direction = signalType === 'BUY' ? 'BUY_ETH' : 'SELL_ETH';
            
            const response = await axios.post(`${RELAYER_URL}/broadcast-trade`, {
                broadcasterAddress: session.wallet.address,
                direction: direction,
                ethPrice: 3000, // Default ETH price
                broadcasterTxHash: broadcasterTxHash // Include broadcaster's tx hash
            });
            
            const successMsg = `
✅ *Signal Broadcast Complete!*

*Type:* ${signalType}
*Direction:* ${direction}

*Your Trade (L1):* \`${broadcasterTxHash}\`
*Followers Executed:* ${response.data.followersExecuted || 0}

${response.data.followersTxHash ? `*Followers Tx:* \`${response.data.followersTxHash}\`` : ''}

Signal executed successfully!
            `;
            
            bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Broadcast error:', error);
            bot.sendMessage(chatId, `❌ Broadcast failed: ${error.response?.data?.error || error.message}`);
        }
        
        return;
    }
    
    if (data.startsWith('signal_')) {
        if (data === 'signal_cancel') {
            bot.answerCallbackQuery(query.id, { text: 'Cancelled' });
            bot.sendMessage(chatId, '❌ Signal cancelled.');
            return;
        }
        
        const signalType = data === 'signal_buy' ? 'BUY' : 'SELL';
        
        bot.answerCallbackQuery(query.id, { text: `${signalType} signal selected` });
        
        const detailsMsg = `
📡 *${signalType} Signal Details*

Please provide the signal details in this format:

*Amount:* How much to trade?
Example: \`100\` (for 100 PYUSD) or \`0.5\` (for 0.5 WETH)

Send the amount now:
        `;
        
        bot.sendMessage(chatId, detailsMsg, { parse_mode: 'Markdown' });
        setSession(chatId, { 
            awaitingSignalDetails: true, 
            signalType: signalType 
        });
    }
});

// Handle text messages
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) {
        return; // Ignore commands
    }
    
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    const text = msg.text;
    
    // Handle private key input
    if (session && session.awaitingPrivateKey) {
        try {
            let privateKey = text.trim();
            if (!privateKey.startsWith('0x')) {
                privateKey = '0x' + privateKey;
            }
            
            const wallet = new ethers.Wallet(privateKey, provider);
            const balance = await wallet.getBalance();
            
            // Delete the message with private key for security
            bot.deleteMessage(chatId, msg.message_id);
            
            // Check if we already have broadcaster details in session (restored from file)
            // Otherwise, try to fetch (will return not registered on Arcology)
            let broadcasterDetails = session.broadcasterDetails;
            if (!broadcasterDetails) {
                broadcasterDetails = await fetchBroadcasterDetails(wallet);
            }
            
            setSession(chatId, { 
                wallet: wallet,
                awaitingPrivateKey: false,
                broadcasterDetails: broadcasterDetails
            });
            
            let successMsg = `
✅ *Wallet Connected!*

*Address:* \`${wallet.address}\`
*Balance:* ${ethers.utils.formatEther(balance)} ARC
`;
            
            if (broadcasterDetails.isRegistered) {
                successMsg += `
*Status:* ✅ Registered Broadcaster

*Your Details:*
📝 Name: ${broadcasterDetails.name}
💰 Fee: ${broadcasterDetails.fee}%
${broadcasterDetails.isActive ? '✅ Active' : '⚠️ Inactive'}

You can now:
• Post signals: /broadcast
• Check your stats: /stats
• View followers: /followers
`;
            } else {
                successMsg += `
*Status:* ⚠️ Not Registered

You can now:
• Register as broadcaster: /register
• Check your stats: /stats
`;
            }
            
            successMsg += `
⚠️ Your private key is stored in memory only.
            `;
            
            bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
            
        } catch (error) {
            bot.sendMessage(chatId, `❌ Invalid private key. Please try again or use /cancel`);
            console.error('Wallet connection error:', error);
        }
        return;
    }
    
    // Handle registration input
    if (session && session.awaitingRegistration) {
        try {
            const parts = text.split('|').map(p => p.trim());
            if (parts.length !== 2) {
                bot.sendMessage(chatId, '❌ Invalid format. Use: Name | Fee\nExample: Crypto Expert | 15');
                return;
            }
            
            const [name, feeStr] = parts;
            const fee = parseInt(feeStr);
            
            if (isNaN(fee) || fee < 10 || fee > 20) {
                bot.sendMessage(chatId, '❌ Fee must be between 10 and 20');
                return;
            }
            
            bot.sendMessage(chatId, '📝 Registering on-chain...');
            
            const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
            const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, session.wallet);
            
            const tx = await registry.registerBroadcaster(name, fee * 100); // Convert to basis points
            const receipt = await tx.wait();
            
            // Save broadcaster details to MongoDB via broadcaster-service
            try {
                await axios.post(`${BROADCASTER_SERVICE_URL}/broadcaster/register`, {
                    address: session.wallet.address,
                    name: name,
                    feePercentage: fee,
                    transactionHash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber
                });
                console.log(`✅ Broadcaster registered in MongoDB: ${session.wallet.address}`);
            } catch (dbError) {
                console.error('⚠️ Failed to save to MongoDB:', dbError.message);
            }
            
            // Update session with new broadcaster details
            const broadcasterDetails = {
                isRegistered: true,
                name: name,
                fee: fee,
                isActive: true
            };
            
            setSession(chatId, { 
                awaitingRegistration: false,
                broadcasterDetails: broadcasterDetails
            });
            
            const successMsg = `
✅ *Registration Successful!*

*Name:* ${name}
*Fee:* ${fee}%
*Transaction:* \`${receipt.transactionHash}\`

You can now:
• Post signals: /broadcast
• View stats: /stats
• Check followers: /followers
            `;
            
            bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
            
        } catch (error) {
            bot.sendMessage(chatId, `❌ Registration failed: ${error.message}`);
            console.error('Registration error:', error);
        }
        return;
    }
    
    // Handle signal details input
    if (session && session.awaitingSignalDetails) {
        try {
            const amount = parseFloat(text.trim());
            
            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Invalid amount. Please enter a positive number.');
                return;
            }
            
            const signalType = session.signalType;
            
            const confirmMsg = `
📡 *Confirm Signal*

*Type:* ${signalType}
*Amount:* ${amount} ${signalType === 'BUY' ? 'PYUSD' : 'WETH'}

*Action:* ${signalType === 'BUY' 
    ? `Buy WETH with ${amount} PYUSD` 
    : `Sell ${amount} WETH for PYUSD`}

This signal will be sent to ALL your followers.

Confirm?
            `;
            
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Confirm & Broadcast', callback_data: `confirm_signal_${amount}` },
                            { text: '❌ Cancel', callback_data: 'signal_cancel' }
                        ]
                    ]
                }
            };
            
            bot.sendMessage(chatId, confirmMsg, { parse_mode: 'Markdown', ...keyboard });
            setSession(chatId, { awaitingSignalDetails: false, signalAmount: amount });
            
        } catch (error) {
            bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
        return;
    }
    
    // Handle fee update input
    if (session && session.awaitingFeeUpdate) {
        try {
            const fee = parseInt(text.trim());
            
            if (isNaN(fee) || fee < 10 || fee > 20) {
                bot.sendMessage(chatId, '❌ Fee must be between 10 and 20');
                return;
            }
            
            bot.sendMessage(chatId, '💰 Updating fee on-chain...');
            
            const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
            const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, session.wallet);
            
            const tx = await registry.updateFee(fee * 100);
            const receipt = await tx.wait();
            
            setSession(chatId, { awaitingFeeUpdate: false });
            
            bot.sendMessage(chatId, `✅ Fee updated to ${fee}%!\nTransaction: \`${receipt.transactionHash}\``, { parse_mode: 'Markdown' });
            
        } catch (error) {
            bot.sendMessage(chatId, `❌ Fee update failed: ${error.message}`);
            console.error('Fee update error:', error);
        }
        return;
    }
});

// Handle errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('✅ Broadcaster bot is running and listening for commands...');
