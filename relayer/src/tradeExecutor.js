import { createStateUpdateMessage } from '@erc7824/nitrolite'
import clearnode from './clearNode.js'
import { getSession, updateSession } from './sessionManager.js'
import { createRelayerSigner } from './utils/signer.js'
import { submitBundleToL1 } from './l1Submitter.js'
const followers = new Map();
export async function registerFollower(userAddress, broadcasterAddress) {
  console.log(`👤 ${userAddress} following ${broadcasterAddress}`)
  if (!followers.has(broadcasterAddress)) {
    followers.set(broadcasterAddress, new Set())
  }
  
  followers.get(broadcasterAddress).add(userAddress.toLowerCase())
  updateSession(userAddress, { following: broadcasterAddress })
  return { success: true }
}
export async function broadcastTrade(broadcasterAddress, trade) {
  console.log(`📡 Broadcasting trade from ${broadcasterAddress}:`, trade)
    const followerAddresses = followers.get(broadcasterAddress.toLowerCase())
   if (!followerAddresses || followerAddresses.size === 0) {
    console.log('No followers for this broadcaster')
    return}

  console.log(`👥 Found ${followerAddresses.size} followers`)
  const tradeProposals = []
  tradeProposals.push({
    trader: broadcasterAddress,
    fromToken: trade.fromToken,
    toToken: trade.toToken,
    amount: trade.amount,
    signature: trade.signature
  })
  for (const followerAddress of followerAddresses) {
    const session = getSession(followerAddress)
    if (!session || session.status !== 'active') {
      console.log(`⚠️ Skipping ${followerAddress}: inactive session`);
      continue
    }
    const followerTrade = await createFollowerTrade(
      followerAddress,
      trade,
      session
    )
    
    if (followerTrade) {
      tradeProposals.push(followerTrade)
    }
  }

  console.log(`📦 Bundling ${tradeProposals.length} trades...`)
  await submitBundleToL1(tradeProposals);
}

async function createFollowerTrade(followerAddress, broadcasterTrade, session) {
  try {
    const userAllocation = session.allocations.find(
      a => a.participant.toLowerCase() === followerAddress.toLowerCase()
    )
if (!userAllocation) {
      console.error(`No allocation found for ${followerAddress}`)
      return null
    }
    const followerAmount = userAllocation.amount
    
    if (BigInt(followerAmount) < BigInt(broadcasterTrade.amount)) {
      console.log(`⚠️ ${followerAddress} has insufficient balance`)
      return null
    }
    const stateUpdate = {
      intent: 0, 
      version: BigInt(session.version || 1),
      data: JSON.stringify({
        type: 'swap',
        fromToken: broadcasterTrade.fromToken,
        toToken: broadcasterTrade.toToken,
        amount: broadcasterTrade.amount
      }),
      allocations: [
        {
          destination: followerAddress,
          token: broadcasterTrade.toToken,
          amount: broadcasterTrade.amount 
        }
      ]
    }
const messageSigner = (await createRelayerSigner()).messageSigner
    const signature = await messageSigner(JSON.stringify(stateUpdate))
return {
      trader: followerAddress,
      fromToken: broadcasterTrade.fromToken,
      toToken: broadcasterTrade.toToken,
      amount: broadcasterTrade.amount,
      signature
    }
  } catch (error) {
    console.error(`Error creating follower trade for ${followerAddress}:`, error)
    return null
  }
}
export function watchBroadcasterTrades() {
  console.log('👀 Watching for broadcaster trades...')
}
