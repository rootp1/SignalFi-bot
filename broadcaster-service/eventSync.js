const { ethers } = require('ethers');
const Follower = require('./models/Follower');
const SyncState = require('./models/SyncState');

class EventSyncService {
    constructor(provider, registryContract) {
        this.provider = provider;
        this.registry = registryContract;
        this.isListening = false;
    }

    /**
     * Initial sync - fetch all historical events from blockchain
     */
    async initialSync() {
        console.log('🔄 Starting initial blockchain event sync...');

        try {
            // Get the deployment block (or start from 0)
            const deploymentBlock = 0;
            const currentBlock = await this.provider.getBlockNumber();

            console.log(`📊 Syncing from block ${deploymentBlock} to ${currentBlock}`);

            // Sync FollowerAdded events
            await this.syncFollowerAddedEvents(deploymentBlock, currentBlock);

            // Sync FollowerRemoved events
            await this.syncFollowerRemovedEvents(deploymentBlock, currentBlock);

            console.log('✅ Initial sync completed!');
        } catch (error) {
            console.error('❌ Error during initial sync:', error);
            throw error;
        }
    }

    /**
     * Sync FollowerAdded events
     */
    async syncFollowerAddedEvents(fromBlock, toBlock) {
        console.log('📥 Syncing FollowerAdded events...');

        const filter = this.registry.filters.FollowerAdded();
        const events = await this.registry.queryFilter(filter, fromBlock, toBlock);

        console.log(`Found ${events.length} FollowerAdded events`);

        for (const event of events) {
            await this.handleFollowerAdded(event);
        }

        // Update sync state
        await SyncState.findOneAndUpdate(
            { eventType: 'FollowerAdded' },
            { lastSyncedBlock: toBlock, lastSyncedAt: new Date() },
            { upsert: true }
        );
    }

    /**
     * Sync FollowerRemoved events
     */
    async syncFollowerRemovedEvents(fromBlock, toBlock) {
        console.log('📥 Syncing FollowerRemoved events...');

        const filter = this.registry.filters.FollowerRemoved();
        const events = await this.registry.queryFilter(filter, fromBlock, toBlock);

        console.log(`Found ${events.length} FollowerRemoved events`);

        for (const event of events) {
            await this.handleFollowerRemoved(event);
        }

        // Update sync state
        await SyncState.findOneAndUpdate(
            { eventType: 'FollowerRemoved' },
            { lastSyncedBlock: toBlock, lastSyncedAt: new Date() },
            { upsert: true }
        );
    }

    /**
     * Handle FollowerAdded event
     */
    async handleFollowerAdded(event) {
        const { user, broadcaster, timestamp } = event.args;
        const blockNumber = event.blockNumber;
        const transactionHash = event.transactionHash;

        try {
            // Insert or update follower record
            await Follower.findOneAndUpdate(
                {
                    broadcasterAddress: broadcaster.toLowerCase(),
                    followerAddress: user.toLowerCase()
                },
                {
                    broadcasterAddress: broadcaster.toLowerCase(),
                    followerAddress: user.toLowerCase(),
                    followedAt: new Date(timestamp.toNumber() * 1000),
                    blockNumber,
                    transactionHash
                },
                { upsert: true, new: true }
            );

            console.log(`✅ Follower added: ${user.slice(0, 8)}... → ${broadcaster.slice(0, 8)}...`);
        } catch (error) {
            // Ignore duplicate key errors (already exists)
            if (error.code !== 11000) {
                console.error('Error handling FollowerAdded:', error);
            }
        }
    }

    /**
     * Handle FollowerRemoved event
     */
    async handleFollowerRemoved(event) {
        const { user, broadcaster } = event.args;

        try {
            // Delete follower record
            await Follower.deleteOne({
                broadcasterAddress: broadcaster.toLowerCase(),
                followerAddress: user.toLowerCase()
            });

            console.log(`❌ Follower removed: ${user.slice(0, 8)}... → ${broadcaster.slice(0, 8)}...`);
        } catch (error) {
            console.error('Error handling FollowerRemoved:', error);
        }
    }

    /**
     * Start listening to new events in real-time
     */
    startListening() {
        if (this.isListening) {
            console.log('⚠️ Already listening to events');
            return;
        }

        console.log('👂 Starting real-time event listener...');

        // Listen for FollowerAdded events
        this.registry.on('FollowerAdded', async (user, broadcaster, timestamp, event) => {
            console.log(`🔔 New FollowerAdded event detected`);
            await this.handleFollowerAdded(event);
        });

        // Listen for FollowerRemoved events
        this.registry.on('FollowerRemoved', async (user, broadcaster, timestamp, event) => {
            console.log(`🔔 New FollowerRemoved event detected`);
            await this.handleFollowerRemoved(event);
        });

        this.isListening = true;
        console.log('✅ Real-time event listener started');
    }

    /**
     * Stop listening to events
     */
    stopListening() {
        this.registry.removeAllListeners('FollowerAdded');
        this.registry.removeAllListeners('FollowerRemoved');
        this.isListening = false;
        console.log('🛑 Event listener stopped');
    }

    /**
     * Incremental sync - sync new events since last sync
     */
    async incrementalSync() {
        try {
            const currentBlock = await this.provider.getBlockNumber();

            // Sync FollowerAdded
            const addedState = await SyncState.findOne({ eventType: 'FollowerAdded' });
            const addedFromBlock = addedState ? addedState.lastSyncedBlock + 1 : 0;
            if (addedFromBlock <= currentBlock) {
                await this.syncFollowerAddedEvents(addedFromBlock, currentBlock);
            }

            // Sync FollowerRemoved
            const removedState = await SyncState.findOne({ eventType: 'FollowerRemoved' });
            const removedFromBlock = removedState ? removedState.lastSyncedBlock + 1 : 0;
            if (removedFromBlock <= currentBlock) {
                await this.syncFollowerRemovedEvents(removedFromBlock, currentBlock);
            }
        } catch (error) {
            console.error('Error during incremental sync:', error);
        }
    }
}

module.exports = EventSyncService;
