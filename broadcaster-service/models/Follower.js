const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
    broadcasterAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    followerAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    followedAt: {
        type: Date,
        default: Date.now
    },
    blockNumber: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index for unique broadcaster-follower pairs
followerSchema.index({ broadcasterAddress: 1, followerAddress: 1 }, { unique: true });

// Index for querying followers of a specific broadcaster
followerSchema.index({ broadcasterAddress: 1, followedAt: -1 });

module.exports = mongoose.model('Follower', followerSchema);
