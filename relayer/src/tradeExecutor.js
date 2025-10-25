import { createStateUpdateMessage } from '@erc7824/nitrolite';
import clearnode from './clearNode.js';
import { 
  getSession, 
  updateSession, 
  updateUserBalance, 
  updateUserPnL,
  recordTrade 
} from './sessionManager.js';
import { createRelayerSigner } from './utils/signer.js'
import { submitBundleToL1 } from './l1submitter.js'
import config from './config.js'


const followers = new Map()

export async function registerFollower(userAddress, broadcasterAddress) {
  console.log(`👤 ${userAddress} following ${broadcasterAddress}`)
  
  if (!followers.has(broadcasterAddress)) {
    followers.set(broadcasterAddress, new Set())
  }
  
  followers.get(broadcasterAddress).add(userAddress.toLowerCase());
  
  updateSession(userAddress, { 
    following: broadcasterAddress,
    followedAt: Date.now()
  })
  
  return { 
    success: true,
    message: `Now following ${broadcasterAddress}`,
    broadcasterFee: `${config.broadcasting.feePercent}% of profits`
  }
}

export async function unregisterFollower(userAddress, broadcasterAddress) {
  const followerSet = followers.get(broadcasterAddress.toLowerCase())
  if (followerSet) {
    followerSet.delete(userAddress.toLowerCase())
  }
  
  updateSession(userAddress, { 
    following: null,
    unfollowedAt: Date.now()
  })
  
  return { success: true, message: 'Unfollowed broadcaster' }
}

export async function broadcastTrade(broadcasterAddress, trade, currentEthPrice) {
  console.log(`📡 Broadcasting trade from ${broadcasterAddress}:`, trade)
  
  const followerAddresses = followers.get(broadcasterAddress.toLowerCase())
  
  if (!followerAddresses || followerAddresses.size === 0) {
    console.log('ℹ️ No followers for this broadcaster')
    return { success: true, followersExecuted: 0 }
  }

  console.log(`👥 Found ${followerAddresses.size} followers`)
  
  const tradeProposals = []
  const executedFollowers = []
  

  tradeProposals.push({
    trader: broadcasterAddress,
    fromToken: trade.fromToken,
    toToken: trade.toToken,
    amount: trade.amount,
    signature: trade.signature,
    isBroadcaster: true
  })


  for (const followerAddress of followerAddresses) {
    const session = getSession(followerAddress)
    
    if (!session || session.status !== 'active') {
      console.log(`⚠️ Skipping ${followerAddress}: inactive session`)
      continue
    }

    const followerTrade = await createFollowerTrade(
      followerAddress,
      trade,
      session,
      currentEthPrice
    )
    
    if (followerTrade) {
      tradeProposals.push(followerTrade);
      executedFollowers.push(followerAddress);
    }
  }

  console.log(`📦 Bundling ${tradeProposals.length} trades (1 broadcaster + ${executedFollowers.length} followers)...`)
  
  const result = await submitBundleToL1(tradeProposals)
  

  if (result.success) {
    for (const followerAddress of executedFollowers) {
   
      if (trade.type === 'buy') {
     
        updateUserBalance(followerAddress, 'pyusd', trade.amount, 'subtract')
       
        const ethReceived = (BigInt(trade.amount) * BigInt(1e18)) / BigInt(Math.floor(currentEthPrice * 1e6))
        updateUserBalance(followerAddress, 'eth', ethReceived.toString(), 'add')
      } else {
      
        updateUserBalance(followerAddress, 'eth', trade.amount, 'subtract')
        const pyusdReceived = (BigInt(trade.amount) * BigInt(Math.floor(currentEthPrice * 1e6))) / BigInt(1e18)
        updateUserBalance(followerAddress, 'pyusd', pyusdReceived.toString(), 'add')
      }
      
     
      updateUserPnL(followerAddress, currentEthPrice)
      
     
      recordTrade(followerAddress, {
        type: trade.type,
        fromToken: trade.fromToken,
        toToken: trade.toToken,
        amountIn: trade.amount,
        amountOut: '0', 
        price: currentEthPrice,
        txHash: result.txHash
      })
    }
  }
  
  return {
    success: result.success,
    followersExecuted: executedFollowers.length,
    txHash: result.txHash,
    gasUsed: result.gasUsed
  }
}

async function createFollowerTrade(followerAddress, broadcasterTrade, session, ethPrice) {
  try {
    const pyusdBalance = session.positions.pyusd || '0'
    
   
    if (BigInt(pyusdBalance) < BigInt(broadcasterTrade.amount)) {
      console.log(`⚠️ ${followerAddress} has insufficient PYUSD balance`)
      console.log(`   Required: ${broadcasterTrade.amount}, Available: ${pyusdBalance}`)
      return null
    }

    const stateUpdate = {
      intent: 0, 
      version: BigInt(session.version || 1),
      data: JSON.stringify({
        type: 'swap',
        protocol: 'pyusd-copybot-v1',
        fromToken: broadcasterTrade.fromToken,
        toToken: broadcasterTrade.toToken,
        amount: broadcasterTrade.amount,
        ethPrice: ethPrice
      }),
      allocations: session.allocations 
    }

    const messageSigner = (await createRelayerSigner()).messageSigner
    const signature = await messageSigner(JSON.stringify(stateUpdate))

    return {
      trader: followerAddress,
      fromToken: broadcasterTrade.fromToken,
      toToken: broadcasterTrade.toToken,
      amount: broadcasterTrade.amount,
      signature,
      isBroadcaster: false
    };
  } catch (error) {
    console.error(`❌ Error creating follower trade for ${followerAddress}:`, error);
    return null
  }
}

export function calculateBroadcasterFee(followerAddress, profit) {
  const session = getSession(followerAddress)
  if (!session || !session.following) return '0'
  
  const feePercent = config.broadcasting.feePercent;
  const fee = (BigInt(profit) * BigInt(feePercent)) / BigInt(100)
  
  const currentFees = BigInt(session.fees.owed || '0')
  updateSession(followerAddress, {
    fees: {
      ...session.fees,
      owed: (currentFees + fee).toString()
    }
  })
  
  console.log(`💰 Broadcaster fee calculated: ${fee.toString()} PYUSD (${feePercent}% of ${profit})`)
  
  return fee.toString()
}

export function watchBroadcasterTrades() {
  console.log('👀 Watching for broadcaster trades...')
}
export function getFollowerCount(broadcasterAddress) {
  const followerSet = followers.get(broadcasterAddress.toLowerCase())
  return followerSet ? followerSet.size : 0
}


export function getFollowers(broadcasterAddress) {
  const followerSet = followers.get(broadcasterAddress.toLowerCase())
  return followerSet ? Array.from(followerSet) : []
}
