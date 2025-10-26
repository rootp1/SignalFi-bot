const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        unique: true,
        enum: ['FollowerAdded', 'FollowerRemoved']
    },
    lastSyncedBlock: {
        type: Number,
        default: 0
    },
    lastSyncedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SyncState', syncStateSchema);
