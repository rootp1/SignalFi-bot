const mongoose = require('mongoose');

const broadcasterSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    feePercentage: {
        type: Number,
        required: true,
        min: 10,
        max: 20
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    transactionHash: {
        type: String,
        required: true
    },
    blockNumber: {
        type: Number
    }
}, {
    timestamps: true
});

// Index for faster queries
broadcasterSchema.index({ address: 1 });

module.exports = mongoose.model('Broadcaster', broadcasterSchema);
