import dotenv from 'dotenv';
dotenv.config();

export default {
  l1: {
    rpcUrl: process.env.L1_RPC_URL,
    settlementContract: process.env.SETTLEMENT_CONTRACT_ADDRESS,
    ammContract: process.env.AMM_CONTRACT_ADDRESS,
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY
  },
  clearnode: {
    endpoint: process.env.CLEARNODE_ENDPOINT,
    timeout: 30000,
    retryAttempts: 3
  },
  api: {
    port: process.env.API_PORT || 3000
  },
  broadcaster: process.env.BROADCASTER_ADDRESS
}
