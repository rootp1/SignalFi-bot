const mongoose = require('mongoose');

const userChatSchema = new mongoose.Schema({
    userAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    chatId: {
        type: String,
        required: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserChat', userChatSchema);
