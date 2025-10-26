const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ethers } = require('ethers');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Follower = require('./models/Follower');
const UserChat = require('./models/UserChat');
const Signal = require('./models/Signal');
const Broadcaster = require('./models/Broadcaster');
const EventSyncService = require('./eventSync');

// Load deployment info
const deploymentInfo = require('../hardhat/deployment-info.json');

// Configuration
const PORT = process.env.BROADCASTER_SERVICE_PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/signalfi';
const RPC_URL = process.env.RPC_URL || 'https://achievement-acts-content-guys.trycloudflare.com';
const CONTRACTS = deploymentInfo.contracts;

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());

// Initialize Ethereum provider
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const registryAbi = require('../hardhat/artifacts/contracts/BroadcasterRegistry.sol/BroadcasterRegistry.json').abi;
const registry = new ethers.Contract(CONTRACTS.BroadcasterRegistry, registryAbi, provider);

// Initialize Event Sync Service
let eventSync;

// ==================== API ROUTES ====================

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'broadcaster-service',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

/**
 * Register a broadcaster (save to MongoDB)
 */
app.post('/broadcaster/register', async (req, res) => {
    try {
        const { address, name, feePercentage, transactionHash, blockNumber } = req.body;

        if (!address || !name || !feePercentage || !transactionHash) {
            return res.status(400).json({ 
                error: 'address, name, feePercentage, and transactionHash are required' 
            });
        }

        const broadcaster = await Broadcaster.findOneAndUpdate(
            { address: address.toLowerCase() },
            {
                address: address.toLowerCase(),
                name,
                feePercentage,
                transactionHash,
                blockNumber,
                isActive: true,
                registeredAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            broadcaster
        });
    } catch (error) {
        console.error('Error registering broadcaster:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get broadcaster details by address
 */
app.get('/broadcaster/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const broadcaster = await Broadcaster.findOne({ 
            address: address.toLowerCase() 
        });

        if (!broadcaster) {
            return res.json({
                isRegistered: false,
                address: address.toLowerCase()
            });
        }

        res.json({
            isRegistered: true,
            address: broadcaster.address,
            name: broadcaster.name,
            fee: broadcaster.feePercentage,
            isActive: broadcaster.isActive,
            isVerified: broadcaster.isVerified,
            registeredAt: broadcaster.registeredAt
        });
    } catch (error) {
        console.error('Error fetching broadcaster:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get followers for a broadcaster
 */
app.get('/followers/:broadcasterAddress', async (req, res) => {
    try {
        const { broadcasterAddress } = req.params;
        
        const followers = await Follower.find({ 
            broadcasterAddress: broadcasterAddress.toLowerCase() 
        })
        .select('followerAddress followedAt')
        .sort({ followedAt: -1 });

        res.json({
            broadcaster: broadcasterAddress.toLowerCase(),
            followers: followers.map(f => f.followerAddress),
            count: followers.length,
            details: followers
        });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get follower count for a broadcaster
 */
app.get('/followers/:broadcasterAddress/count', async (req, res) => {
    try {
        const { broadcasterAddress } = req.params;
        
        const count = await Follower.countDocuments({ 
            broadcasterAddress: broadcasterAddress.toLowerCase() 
        });

        res.json({
            broadcaster: broadcasterAddress.toLowerCase(),
            count
        });
    } catch (error) {
        console.error('Error counting followers:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get broadcasters that a user is following
 */
app.get('/following/:userAddress', async (req, res) => {
    try {
        const { userAddress } = req.params;
        
        const following = await Follower.find({ 
            followerAddress: userAddress.toLowerCase() 
        })
        .select('broadcasterAddress followedAt')
        .sort({ followedAt: -1 });

        res.json({
            user: userAddress.toLowerCase(),
            following: following.map(f => f.broadcasterAddress),
            count: following.length,
            details: following
        });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Register user's Telegram chat ID
 */
app.post('/register-user', async (req, res) => {
    try {
        const { userAddress, chatId } = req.body;

        if (!userAddress || !chatId) {
            return res.status(400).json({ error: 'userAddress and chatId are required' });
        }

        const userChat = await UserChat.findOneAndUpdate(
            { userAddress: userAddress.toLowerCase() },
            { 
                userAddress: userAddress.toLowerCase(),
                chatId,
                lastActive: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            user: userChat
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Follow a broadcaster (save follower relationship to MongoDB)
 */
app.post('/follow', async (req, res) => {
    try {
        const { followerAddress, broadcasterAddress } = req.body;

        if (!followerAddress || !broadcasterAddress) {
            return res.status(400).json({ error: 'followerAddress and broadcasterAddress are required' });
        }

        const follower = await Follower.findOneAndUpdate(
            { 
                followerAddress: followerAddress.toLowerCase(),
                broadcasterAddress: broadcasterAddress.toLowerCase()
            },
            { 
                followerAddress: followerAddress.toLowerCase(),
                broadcasterAddress: broadcasterAddress.toLowerCase(),
                followedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            follower: follower
        });
    } catch (error) {
        console.error('Error following broadcaster:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Broadcast signal to all followers
 */
app.post('/broadcast', async (req, res) => {
    try {
        const signal = req.body;
        const { broadcasterAddress, signalType, tokenIn, tokenOut, amount } = signal;

        if (!broadcasterAddress || !signalType || !tokenIn || !tokenOut || !amount) {
            return res.status(400).json({ 
                error: 'Missing required fields: broadcasterAddress, signalType, tokenIn, tokenOut, amount' 
            });
        }

        console.log(`📡 Broadcasting signal from ${broadcasterAddress}`);

        // Get all followers
        const followers = await Follower.find({ 
            broadcasterAddress: broadcasterAddress.toLowerCase() 
        }).select('followerAddress');

        const followerAddresses = followers.map(f => f.followerAddress);

        console.log(`Found ${followerAddresses.length} followers`);

        if (followerAddresses.length === 0) {
            // Save signal even if no followers
            const savedSignal = await Signal.create({
                broadcasterAddress: broadcasterAddress.toLowerCase(),
                signalType,
                tokenIn,
                tokenOut,
                amount,
                followerCount: 0,
                executedCount: 0,
                signature: signal.signature,
                metadata: signal.metadata
            });

            return res.json({
                success: true,
                message: 'No followers to broadcast to',
                signalId: savedSignal._id,
                followerCount: 0,
                notified: 0
            });
        }

        // Get chat IDs for followers
        const userChats = await UserChat.find({
            userAddress: { $in: followerAddresses }
        });

        console.log(`Found ${userChats.length} registered user chats`);

        // Send notifications to followers
        let notifiedCount = 0;
        const userBotToken = process.env.user_bot_token;

        for (const userChat of userChats) {
            try {
                await notifyFollower(userChat.chatId, signal, userBotToken);
                notifiedCount++;
            } catch (error) {
                console.error(`Failed to notify ${userChat.userAddress}:`, error.message);
            }
        }

        // Save signal to database
        const savedSignal = await Signal.create({
            broadcasterAddress: broadcasterAddress.toLowerCase(),
            signalType,
            tokenIn,
            tokenOut,
            amount,
            followerCount: followerAddresses.length,
            executedCount: 0,
            signature: signal.signature,
            metadata: signal.metadata
        });

        res.json({
            success: true,
            signalId: savedSignal._id,
            followerCount: followerAddresses.length,
            notified: notifiedCount,
            message: `Signal broadcasted to ${notifiedCount}/${followerAddresses.length} followers`
        });

    } catch (error) {
        console.error('Error broadcasting signal:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get signal history for a broadcaster
 */
app.get('/signals/:broadcasterAddress', async (req, res) => {
    try {
        const { broadcasterAddress } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        const signals = await Signal.find({ 
            broadcasterAddress: broadcasterAddress.toLowerCase() 
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);

        const total = await Signal.countDocuments({ 
            broadcasterAddress: broadcasterAddress.toLowerCase() 
        });

        res.json({
            broadcaster: broadcasterAddress.toLowerCase(),
            signals,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error('Error fetching signals:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Trigger manual sync
 */
app.post('/sync', async (req, res) => {
    try {
        console.log('🔄 Manual sync triggered');
        await eventSync.incrementalSync();
        res.json({ success: true, message: 'Sync completed' });
    } catch (error) {
        console.error('Error during manual sync:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get sync status
 */
app.get('/sync/status', async (req, res) => {
    try {
        const SyncState = require('./models/SyncState');
        const syncStates = await SyncState.find();
        
        res.json({
            syncStates,
            isListening: eventSync ? eventSync.isListening : false
        });
    } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Send notification to follower via Telegram
 */
async function notifyFollower(chatId, signal, botToken) {
    const message = `
🚨 *New Signal Alert!*

*Type:* ${signal.signalType === 'BUY' ? '📈 BUY' : '📉 SELL'}
*From:* ${signal.tokenIn}
*To:* ${signal.tokenOut}
*Amount:* ${signal.amount}

*Broadcaster:* \`${signal.broadcasterAddress.slice(0, 10)}...\`

Do you want to copy this trade?
    `;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '✅ Execute Trade', callback_data: `execute_${signal.broadcasterAddress}_${Date.now()}` },
                { text: '❌ Skip', callback_data: 'skip_signal' }
            ]
        ]
    };

    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    } catch (error) {
        throw new Error(`Telegram API error: ${error.message}`);
    }
}

// ==================== SERVER INITIALIZATION ====================

async function startServer() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Initialize event sync service
        eventSync = new EventSyncService(provider, registry);

        // Perform initial sync
        await eventSync.initialSync();

        // Start listening to new events
        eventSync.startListening();

        // Start incremental sync every 5 minutes
        setInterval(() => {
            console.log('🔄 Running incremental sync...');
            eventSync.incrementalSync();
        }, 5 * 60 * 1000);

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n🎙️ Broadcaster Service running on port ${PORT}`);
            console.log(`📡 RPC: ${RPC_URL}`);
            console.log(`📝 BroadcasterRegistry: ${CONTRACTS.BroadcasterRegistry}`);
            console.log(`\n✅ Service ready!\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (eventSync) {
        eventSync.stopListening();
    }
    await mongoose.connection.close();
    process.exit(0);
});

// Start the server
startServer();
