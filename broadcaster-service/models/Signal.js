const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
    broadcasterAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    signalType: {
        type: String,
        enum: ['BUY', 'SELL'],
        required: true
    },
    tokenIn: {
        type: String,
        required: true
    },
    tokenOut: {
        type: String,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    followerCount: {
        type: Number,
        default: 0
    },
    executedCount: {
        type: Number,
        default: 0
    },
    signature: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

signalSchema.index({ broadcasterAddress: 1, timestamp: -1 });

module.exports = mongoose.model('Signal', signalSchema);
