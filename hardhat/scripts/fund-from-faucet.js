const axios = require('axios');

const FAUCET_URL = 'http://localhost:3001';
const DEPLOYER_ADDRESS = '0xc8bc50cA2443F4cE0ebF1bC9396B7f53f62e9C13';

async function fundAccount() {
    console.log('🚰 Requesting ARC from Faucet Server...\n');
    
    try {
        // Check faucet health
        const healthResponse = await axios.get(`${FAUCET_URL}/health`);
        console.log(`✅ Faucet server is running`);
        console.log(`   Faucet address: ${healthResponse.data.faucetAddress}\n`);
        
        // Check faucet balance
        const balanceResponse = await axios.get(`${FAUCET_URL}/balance`);
        console.log(`💰 Faucet balance: ${balanceResponse.data.balance} ARC\n`);
        
        // Claim ARC
        console.log(`📤 Claiming 10 ARC for ${DEPLOYER_ADDRESS}...`);
        const claimResponse = await axios.post(`${FAUCET_URL}/claim`, {
            address: DEPLOYER_ADDRESS
        });
        
        console.log('✅ Success!');
        console.log(`   Transaction hash: ${claimResponse.data.txHash}`);
        console.log(`   Amount sent: ${claimResponse.data.amount} ARC`);
        console.log(`   New faucet balance: ${claimResponse.data.newBalance} ARC\n`);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Faucet server is not running. Start it with:');
            console.log('   cd faucet-server && npm start');
        }
    }
}

fundAccount();
