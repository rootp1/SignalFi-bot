import dotenv from 'dotenv'
dotenv.config()

export default {
  l1: {
    rpcUrl: process.env.L1_RPC_URL,
    chainId: parseInt(process.env.L1_CHAIN_ID || '8888'),
    

    pyusdVault: process.env.SETTLEMENT_CONTRACT_ADDRESS,
    simpleAMM: process.env.AMM_CONTRACT_ADDRESS,
    parallelBatchExecutor: process.env.PARALLEL_BATCH_EXECUTOR_ADDRESS,

    pyusd: process.env.PYUSD_ADDRESS,
    eth: process.env.ETH_ADDRESS,
    
  
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY
  },
  
  clearnode: {
    endpoint: process.env.CLEARNODE_ENDPOINT,
    timeout: 30000,
    retryAttempts: 3
  },
  
  api: {
    port: parseInt(process.env.API_PORT || '3000'),
    host: process.env.API_HOST || '0.0.0.0'
  },
  
  broadcasting: {
    defaultBroadcaster: process.env.BROADCASTER_ADDRESS,
    feePercent: parseInt(process.env.BROADCASTER_FEE_PERCENT || '15')
  },
  
  fees: {
    deposit: process.env.DEPOSIT_FEE_PYUSD || '0.50',
    withdrawal: process.env.WITHDRAWAL_FEE_PYUSD || '0.50',
    trade: process.env.TRADE_FEE_PYUSD || '1.50'
  },
  
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  }
}