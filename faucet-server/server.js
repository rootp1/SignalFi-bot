const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const RPC_URL = 'https://yttric-socorro-maniacally.ngrok-free.dev';
const FAUCET_PRIVATE_KEY = '134aea740081ac7e0e892ff8e5d0a763ec400fcd34bae70bcfe6dae3aceeb7f0'; // Account #10 from network.json
const CLAIM_AMOUNT = ethers.utils.parseEther('10'); // 10 ARC
const COOLDOWN_TIME = 0; // No cooldown for testing (set to 86400 for 24h)

// Track last claim times
const lastClaims = new Map();

// Setup provider and wallet
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);

console.log('🚰 ARC Faucet Server Starting...');
console.log(`Faucet Address: ${faucetWallet.address}`);

// Check faucet balance on startup
faucetWallet.getBalance().then(balance => {
    console.log(`Faucet Balance: ${ethers.utils.formatEther(balance)} ARC`);
    console.log(`Can serve ${Math.floor(parseFloat(ethers.utils.formatEther(balance)) / 10)} users\n`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', faucetAddress: faucetWallet.address });
});

// Get faucet balance
app.get('/balance', async (req, res) => {
    try {
        const balance = await faucetWallet.getBalance();
        res.json({
            balance: ethers.utils.formatEther(balance),
            address: faucetWallet.address
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Claim ARC endpoint
app.post('/claim', async (req, res) => {
    try {
        const { address } = req.body;

        // Validate address
        if (!address || !ethers.utils.isAddress(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }

        // Check cooldown
        const lastClaim = lastClaims.get(address.toLowerCase());
        if (lastClaim) {
            const timeSinceLastClaim = Date.now() - lastClaim;
            if (timeSinceLastClaim < COOLDOWN_TIME * 1000) {
                const timeLeft = Math.ceil((COOLDOWN_TIME * 1000 - timeSinceLastClaim) / 1000);
                return res.status(429).json({
                    error: 'Cooldown active',
                    timeLeft: timeLeft,
                    message: `Please wait ${timeLeft} seconds before claiming again`
                });
            }
        }

        // Check faucet balance
        const faucetBalance = await faucetWallet.getBalance();
        if (faucetBalance.lt(CLAIM_AMOUNT)) {
            return res.status(503).json({ error: 'Faucet is empty' });
        }

        // Send ARC
        console.log(`Sending 10 ARC to ${address}...`);
        const tx = await faucetWallet.sendTransaction({
            to: address,
            value: CLAIM_AMOUNT,
            gasLimit: 21000
        });

        console.log(`Transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();

        // Update last claim time
        lastClaims.set(address.toLowerCase(), Date.now());

        console.log(`✅ Success! Block: ${receipt.blockNumber}`);

        res.json({
            success: true,
            txHash: tx.hash,
            amount: '10',
            message: 'Successfully sent 10 ARC!'
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n✅ Faucet server running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   POST /claim - Claim 10 ARC`);
    console.log(`   GET /balance - Check faucet balance`);
    console.log(`   GET /health - Health check\n`);
});
