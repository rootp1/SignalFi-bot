import nitrolite from '@erc7824/nitrolite'
const { createAppSessionMessage } = nitrolite;
import clearnode from './clearnode.js'
import { createRelayerSigner } from './utils/signer.js'
import config from './config.js'

const userSessions = new Map()


export async function openChannelForUser(userAddress, depositAmount) {
  console.log(`📡 Opening state channel for ${userAddress}...`)
  console.log(`💰 Initial deposit: ${depositAmount} PYUSD`)
  
  const signer = createRelayerSigner()
  const relayerAddress = await signer.getAddress()
  const nonce = Date.now()
  
  const appDefinition = {
    protocol: 'pyusd-copybot-v1',
    participants: [userAddress, relayerAddress],
    weights: [50, 50],
    quorum: 100,
    challenge: 0,
    nonce: nonce
  }
  
  const allocations = [
    {
      participant: userAddress,
      asset: 'usdc',
      amount: depositAmount.toString()
    },
    {
      participant: relayerAddress,
      asset: 'usdc',
      amount: '0' 
    }
  ]

  try {
    const sessionMessage = await createAppSessionMessage(
      signer.messageSigner,
      [{ definition: appDefinition, allocations }]
    )

    clearnode.send(sessionMessage)
    userSessions.set(userAddress.toLowerCase(), {
      status: 'pending',
      appDefinition,
      allocations,
      following: null,
     positions: {
        pyusd: depositAmount.toString(),
        eth: '0'
      },
      pnl: {
        realized: '0',    
        unrealized: '0',  
        total: '0'
      },
      fees: {
        paid: '0',        
        owed: '0'         
      },
      trades: [],         
      createdAt: Date.now(),
      lastUpdated: Date.now()

    })

    console.log(`✅ Channel opened for ${userAddress}`)
  } catch (error) {
    console.error('Failed to create session:', error)
    throw error
  }
}

export function getSession(userAddress) {
  return userSessions.get(userAddress.toLowerCase());
}

export function updateSession(userAddress, updates) {
  const session = userSessions.get(userAddress.toLowerCase());
  if (session) {
    userSessions.set(userAddress.toLowerCase(), { 
      ...session, 
      ...updates,
      lastUpdated: Date.now()
    })
  }
}


export function updateUserBalance(userAddress, token, amount, operation = 'add') {
  const session = getSession(userAddress);
  if (!session) return;
  
  const currentAmount = BigInt(session.positions[token] || '0');
  const changeAmount = BigInt(amount);
  
  const newAmount = operation === 'add' 
    ? currentAmount + changeAmount 
    : currentAmount - changeAmount;
  
  updateSession(userAddress, {
    positions: {
      ...session.positions,
      [token]: newAmount.toString()
    }
  });
  
  console.log(`💼 Updated ${userAddress} balance: ${token} = ${newAmount.toString()}`);
}

export function updateUserPnL(userAddress, ethPrice) {
  const session = getSession(userAddress)
  if (!session) return
  
  
  const ethPosition = BigInt(session.positions.eth || '0')
  const ethValue = ethPosition * BigInt(Math.floor(ethPrice * 1e6)) / BigInt(1e18); // Convert to PYUSD
  
  const pyusdBalance = BigInt(session.positions.pyusd || '0')
  const totalValue = pyusdBalance + ethValue
  

  const initialDeposit = BigInt(session.allocations[0]?.amount || '0')
  const unrealizedPnL = totalValue - initialDeposit
  
  updateSession(userAddress, {
    pnl: {
      ...session.pnl,
      unrealized: unrealizedPnL.toString(),
      total: (BigInt(session.pnl.realized) + unrealizedPnL).toString()
    }
  });
}


export function recordTrade(userAddress, trade) {
  const session = getSession(userAddress)
  if (!session) return
  
  const tradeRecord = {
    timestamp: Date.now(),
    type: trade.type,     
    fromToken: trade.fromToken,
    toToken: trade.toToken,
    amountIn: trade.amountIn,
    amountOut: trade.amountOut,
    price: trade.price,
    txHash: trade.txHash
  }
  
  updateSession(userAddress, {
    trades: [...session.trades, tradeRecord]
  })
}


clearnode.onMessage('session_created', (message) => {
  console.log('✅ Yellow session confirmed:', message)
  
  const userAddress = message.participants?.[0]
  if (userAddress) {
    updateSession(userAddress, { 
      status: 'active',
      sessionId: message.sessionId 
    })
  }
})