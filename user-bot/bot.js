const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Load deployment info
const deploymentInfo = require('../hardhat/deployment-info.json');

// Configuration
const BOT_TOKEN = process.env.user_bot_token;
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

console.log('👥 PyUSD User Bot Starting...');
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
}

// /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;
    
    const welcomeMsg = `
👥 *Welcome to PyUSD Copy Trading Bot!*

Hi ${username}! 👋

Follow expert traders and copy their signals automatically!

*How it works:*
1️⃣ Connect your wallet
2️⃣ Deposit PYUSD to the executor
3️⃣ Follow broadcasters you trust
4️⃣ Trades execute automatically when they signal
5️⃣ Withdraw anytime!

*Key Features:*
✅ Automated copy trading
✅ Fair pricing for all followers
✅ Low fees (10-20%)
✅ Withdraw anytime
✅ Track your P&L

*Quick Commands:*
/connect - Connect wallet
/deposit - Deposit PYUSD
/balance - Check balance
/subscribe - Follow a broadcaster
/portfolio - View your positions
/withdraw - Withdraw funds

Type /help for all commands!
    `;
    
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpMsg = `
📚 *User Bot Commands*

*Setup & Wallet:*
/connect - Connect your Ethereum wallet
/myaddress - Show your wallet address
/balance - Check PYUSD & WETH balances

*Deposits & Withdrawals:*
/deposit - Deposit PYUSD to executor
/withdraw - Withdraw PYUSD from executor
/claimfaucet - Claim free test PYUSD

*Copy Trading:*
/subscribe <address> - Follow a broadcaster
/unsubscribe <address> - Unfollow a broadcaster
/broadcasters - List top broadcasters

*Portfolio:*
/portfolio - View your positions & balances
/history - View your trade history
/pnl - Check profit & loss

*Information:*
/contracts - Show contract addresses
/help - Show this help

*Examples:*
\`/subscribe 0xc8bc...\` - Follow a broadcaster
\`/deposit 1000\` - Deposit 1000 PYUSD
\`/withdraw 500\` - Withdraw 500 PYUSD

Need help? Contact @support
    `;
    
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// /connect command
bot.onText(/\/connect/, async (msg) => {
    const chatId = msg.chat.id;
    
    const connectMsg = `
🔐 *Connect Your Wallet*

To use the copy trading bot, connect your wallet.

⚠️ *SECURITY WARNING:*
• Only use this with a TEST wallet
• Never share your private key
• This is for TESTNET only

Please send your private key:
\`0x...\` (with or without 0x prefix)

Or use /cancel to abort.
    `;
    
    bot.sendMessage(chatId, connectMsg, { parse_mode: 'Markdown' });
    setSession(chatId, { awaitingPrivateKey: true });
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

*ARC Balance:* ${ethers.utils.formatEther(balance)} ARC

*Network:* Arcology DevNet
*Chain ID:* ${CHAIN_ID}
    `;
    
    bot.sendMessage(chatId, addressMsg, { parse_mode: 'Markdown' });
});

// /balance command
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    try {
        bot.sendMessage(chatId, '💰 Fetching balances...');
        
        // Get wallet's ARC balance
        const arcBalance = await provider.getBalance(session.wallet.address);
        
        // Get token ABIs
        const pyusdAbi = require('../hardhat/artifacts/contracts/ArcologyPYUSD.sol/ArcologyPYUSD.json').abi;
        
        // Create contract instances with signer to enable transactions
        const pyusd = new ethers.Contract(CONTRACTS.ArcologyPYUSD, pyusdAbi, session.wallet);
        
        // Query PYUSD balance via event-based pattern
        let pyusdBalance = ethers.BigNumber.from(0);
        try {
            const balanceTx = await pyusd.balanceOf(session.wallet.address);
            const balanceReceipt = await balanceTx.wait();
            
            // Find BalanceQuery event
            const balanceEvent = balanceReceipt.events?.find(e => e.event === 'BalanceQuery');
            if (balanceEvent && balanceEvent.args) {
                pyusdBalance = balanceEvent.args.balance;
            }
        } catch (e) {
            console.error('Error querying PYUSD balance:', e);
        }
        
        const balanceMsg = `
💰 *Your Balances*

*Wallet Balance:*
💵 PYUSD: ${ethers.utils.formatUnits(pyusdBalance, 6)}
⚡ ARC: ${ethers.utils.formatEther(arcBalance)}

*Note:* Executor balances require contract queries
Use /portfolio for trading positions

To deposit: /deposit
To claim PYUSD: /claimfaucet
        `;
        
        bot.sendMessage(chatId, balanceMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error fetching balances:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
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
        
        // Use ArcologyPYUSDFaucet (unlimited)
        const faucetAbi = require('../hardhat/artifacts/contracts/ArcologyPYUSDFaucet.sol/ArcologyPYUSDFaucet.json').abi;
        const faucet = new ethers.Contract(CONTRACTS.ArcologyPYUSDFaucet, faucetAbi, session.wallet);
        
        // No cooldown check - unlimited faucet
        
        const tx = await faucet.claimPYUSD();
        const receipt = await tx.wait();
        
        const successMsg = `
✅ *Faucet Claim Successful!*

*Claimed:* 100 PYUSD
*Transaction:* \`${receipt.transactionHash}\`
*Gas Used:* ${receipt.gasUsed.toString()}

You can now:
• Deposit to executor: /deposit
• Check balance: /balance
• Follow broadcasters: /subscribe

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
Example: \`/deposit 100\`

Your deposits will be used for copy trading when broadcasters post signals.

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
        
        // Skip balance check on Arcology (would require eth_call)
        // Transaction will revert if insufficient balance
        
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

Your PYUSD is now ready for copy trading!

Next steps:
• Follow broadcasters: /subscribe
• Check portfolio: /portfolio
• View balance: /balance
        `;
        
        bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Deposit error:', error);
        bot.sendMessage(chatId, `❌ Deposit failed: ${error.message}`);
    }
});

// /withdraw command
bot.onText(/\/withdraw(?:\s+(\d+\.?\d*))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const amount = match[1];
    
    if (!amount) {
        const withdrawMsg = `
💸 *Withdraw PYUSD*

Enter the amount of PYUSD to withdraw:
Example: \`/withdraw 50\`

This will withdraw from your executor balance back to your wallet.

Or use /cancel to abort.
        `;
        
        bot.sendMessage(chatId, withdrawMsg, { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        const withdrawAmount = ethers.utils.parseUnits(amount, 6);
        
        bot.sendMessage(chatId, `💸 Withdrawing ${amount} PYUSD...`);
        
        const executorAbi = require('../hardhat/artifacts/contracts/ParallelBatchExecutor.sol/ParallelBatchExecutor.json').abi;
        const executor = new ethers.Contract(CONTRACTS.ParallelBatchExecutor, executorAbi, session.wallet);
        
        // Skip balance check on Arcology (would require eth_call)
        // Transaction will revert if insufficient balance
        
        const tx = await executor.withdrawPYUSD(withdrawAmount);
        const receipt = await tx.wait();
        
        const successMsg = `
✅ *Withdrawal Successful!*

*Amount:* ${amount} PYUSD
*Transaction:* \`${receipt.transactionHash}\`
*Gas Used:* ${receipt.gasUsed.toString()}

PYUSD has been transferred to your wallet!

Check your balance: /balance
        `;
        
        bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Withdraw error:', error);
        bot.sendMessage(chatId, `❌ Withdrawal failed: ${error.message}`);
    }
});

// /subscribe command
bot.onText(/\/subscribe(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const broadcasterAddress = match[1];
    
    if (!broadcasterAddress) {
        const subscribeMsg = `
👤 *Follow a Broadcaster*

To follow a broadcaster, send their address:
\`/subscribe 0x...\`

You can find broadcasters with: /broadcasters

Or use /cancel to abort.
        `;
        
        bot.sendMessage(chatId, subscribeMsg, { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        if (!ethers.utils.isAddress(broadcasterAddress)) {
            bot.sendMessage(chatId, '❌ Invalid address format');
            return;
        }
        
        bot.sendMessage(chatId, '👤 Following broadcaster...');
        
        // Call broadcaster-service to register follower relationship in MongoDB
        await axios.post(`${BROADCASTER_SERVICE_URL}/follow`, {
            followerAddress: session.wallet.address,
            broadcasterAddress: broadcasterAddress
        });
        
        const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
        const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, session.wallet);
        
        // Skip broadcaster validation on Arcology (would require eth_call)
        // Transaction will revert if broadcaster doesn't exist
        
        const tx = await registry.followBroadcaster(broadcasterAddress);
        const receipt = await tx.wait();
        
        const successMsg = `
✅ *Now Following!*

*Broadcaster Address:* \`${formatAddress(broadcasterAddress)}\`

*Transaction:* \`${receipt.transactionHash}\`

You'll now copy their signals automatically! 🚀

Check /portfolio for your positions
        `;
        
        bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Subscribe error:', error);
        bot.sendMessage(chatId, `❌ Failed to follow: ${error.message}`);
    }
});

// /unsubscribe command
bot.onText(/\/unsubscribe(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    const broadcasterAddress = match[1];
    
    if (!broadcasterAddress) {
        bot.sendMessage(chatId, 'Usage: `/unsubscribe 0x...`', { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        if (!ethers.utils.isAddress(broadcasterAddress)) {
            bot.sendMessage(chatId, '❌ Invalid address format');
            return;
        }
        
        bot.sendMessage(chatId, '👤 Unfollowing broadcaster...');
        
        const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
        const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, session.wallet);
        
        const tx = await registry.unfollowBroadcaster(broadcasterAddress);
        const receipt = await tx.wait();
        
        bot.sendMessage(chatId, `✅ Unfollowed broadcaster!\nTransaction: \`${receipt.transactionHash}\``, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Unsubscribe error:', error);
        bot.sendMessage(chatId, `❌ Failed to unfollow: ${error.message}`);
    }
});

// /broadcasters command
bot.onText(/\/broadcasters/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        bot.sendMessage(chatId, '📋 Fetching registered broadcasters...');
        
        // Query BroadcasterRegistered events from the blockchain
        const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
        const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, provider);
        
        // Get current block number (Arcology doesn't accept 'latest' string in queryFilter)
        const currentBlock = await provider.getBlockNumber();
        
        // Get all BroadcasterRegistered events from genesis to current block
        const filter = registry.filters.BroadcasterRegistered();
        const events = await registry.queryFilter(filter, 0, currentBlock);
        
        if (events.length === 0) {
            bot.sendMessage(chatId, `
📋 *No Broadcasters Yet*

No broadcasters have registered yet.

Be the first to register using the Broadcaster Bot!
Or wait for broadcasters to join the platform.
            `, { parse_mode: 'Markdown' });
            return;
        }
        
        // Build broadcaster list from events
        let broadcastersMsg = `📋 *Registered Broadcasters* (${events.length})\n\n`;
        
        for (let i = 0; i < Math.min(events.length, 10); i++) {
            const event = events[i];
            const broadcasterAddress = event.args.broadcaster;
            const name = event.args.name;
            const fee = event.args.feePercentage / 100; // Convert from basis points
            
            broadcastersMsg += `${i + 1}. *${name}*\n`;
            broadcastersMsg += `   Address: \`${formatAddress(broadcasterAddress)}\`\n`;
            broadcastersMsg += `   Fee: ${fee}%\n`;
            broadcastersMsg += `   To follow: \`/subscribe ${broadcasterAddress}\`\n\n`;
        }
        
        if (events.length > 10) {
            broadcastersMsg += `\n_... and ${events.length - 10} more broadcasters_\n`;
        }
        
        broadcastersMsg += `\n*How to Follow:*\n\`/subscribe <broadcaster_address>\``;
        
        bot.sendMessage(chatId, broadcastersMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error fetching broadcasters:', error);
        bot.sendMessage(chatId, `❌ Error fetching broadcasters: ${error.message}\n\nYou can still follow by address:\n\`/subscribe <broadcaster_address>\``, { parse_mode: 'Markdown' });
    }
});

// /portfolio command
bot.onText(/\/portfolio/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    
    if (!session || !session.wallet) {
        bot.sendMessage(chatId, '⚠️ Please connect your wallet first using /connect');
        return;
    }
    
    try {
        bot.sendMessage(chatId, '📊 Loading portfolio...');
        
        const portfolioMsg = `
📊 *Your Portfolio*

*Copy Trading Active*

To view detailed balances, use blockchain explorer or the web UI.

*Note:* Arcology requires transactions for view functions.
Check the relayer API for detailed portfolio data.

*Actions:*
• Deposit more: /deposit
• Withdraw: /withdraw
• Check balance: /balance
        `;
        
        bot.sendMessage(chatId, portfolioMsg, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Portfolio error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// /history command
bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    
    const historyMsg = `
📜 *Trade History*

🔜 Trade history tracking coming soon!

This will show:
• Executed trades
• Amounts and prices
• P&L per trade
• Broadcaster followed
• Timestamps

For now, check the blockchain explorer for your transactions.
    `;
    
    bot.sendMessage(chatId, historyMsg, { parse_mode: 'Markdown' });
});

// /pnl command
bot.onText(/\/pnl/, async (msg) => {
    const chatId = msg.chat.id;
    
    const pnlMsg = `
💹 *Profit & Loss*

🔜 P&L tracking coming soon!

This will show:
• Total profit/loss
• Per broadcaster performance
• Win rate
• Best/worst trades
• ROI percentage

Stay tuned! 📈
    `;
    
    bot.sendMessage(chatId, pnlMsg, { parse_mode: 'Markdown' });
});

// /contracts command
bot.onText(/\/contracts/, async (msg) => {
    const chatId = msg.chat.id;
    
    const contractsMsg = `
📝 *Deployed Contracts*

*ArcologyPYUSD:*
\`${CONTRACTS.ArcologyPYUSD}\`

*ArcologyWETH:*
\`${CONTRACTS.ArcologyWETH}\`

*AMM:*
\`${CONTRACTS.AMM}\`

*ParallelBatchExecutor:*
\`${CONTRACTS.ParallelBatchExecutor}\`

*BroadcasterRegistry:*
\`${CONTRACTS.BroadcasterRegistry}\`

*ArcologyPYUSDFaucet:*
\`${CONTRACTS.ArcologyPYUSDFaucet}\`

*ARCFaucet:*
\`${CONTRACTS.ARCFaucet}\`

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
        awaitingDeposit: false,
        awaitingWithdraw: false
    });
    bot.sendMessage(chatId, '❌ Operation cancelled.');
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
            
            setSession(chatId, { 
                wallet: wallet,
                awaitingPrivateKey: false 
            });
            
            // Delete the message with private key for security
            bot.deleteMessage(chatId, msg.message_id);
            
            // Register user with broadcaster service
            try {
                await axios.post(`${BROADCASTER_SERVICE_URL}/register-user`, {
                    userAddress: wallet.address,
                    chatId: chatId.toString()
                });
                console.log(`✅ User registered with broadcaster service: ${wallet.address}`);
            } catch (serviceError) {
                console.log('⚠️ Could not register with broadcaster service (service may be offline):', serviceError.message);
                // Continue anyway - this is not critical for wallet connection
            }
            
            const successMsg = `
✅ *Wallet Connected!*

*Address:* \`${wallet.address}\`
*Balance:* ${ethers.utils.formatEther(balance)} ARC

You can now:
• Claim test PYUSD: /claimfaucet
• Deposit PYUSD: /deposit
• Follow broadcasters: /subscribe
• Check portfolio: /portfolio

⚠️ Your private key is stored in memory only.
            `;
            
            bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
            
        } catch (error) {
            bot.sendMessage(chatId, `❌ Invalid private key. Please try again or use /cancel`);
            console.error('Wallet connection error:', error);
        }
        return;
    }
});

// Handle errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('✅ User bot is running and listening for commands...');
