import { createAppSessionMessage } from '@erc7824/nitrolite'
import clearnode from './clearNode.js'
import { createRelayerSigner } from './utils/signer.js'

const userSessions = new Map()
const pendingStateUpdates = new Map()

export async function openChannelForUser(userAddress, depositAmount) {
  console.log(`📡 Opening state channel for ${userAddress}...`)
  
  const relayerAddress = await createRelayerSigner().getAddress()
  const appDefinition = {
    protocol: 'copy-trading-v1',
    participants: [userAddress, relayerAddress],
    weights: [50, 50],
    quorum: 100,
    challenge: 0,
    nonce: Date.now()
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
    const messageSigner = await createRelayerSigner().messageSigner
    const sessionMessage = await createAppSessionMessage(
      messageSigner,
      [{ definition: appDefinition, allocations }]
    )

    clearnode.send(sessionMessage)
    userSessions.set(userAddress.toLowerCase(), {
      status: 'pending',
      appDefinition,
      allocations,
      following: null,
      createdAt: Date.now()
    })

    console.log(`✅ Channel opened for ${userAddress}`)
  } catch (error) {
    console.error('Failed to create session:', error)
    throw error
  }
}
export function getSession(userAddress) {
  return userSessions.get(userAddress.toLowerCase())
}
export function updateSession(userAddress, updates) {
  const session = userSessions.get(userAddress.toLowerCase())
  if (session) {
    userSessions.set(userAddress.toLowerCase(), { ...session, ...updates })
  }
}
clearnode.onMessage('session_created', (message) => {
  console.log('✅ Session confirmed:', message)
  const userAddress = message.participants?.[0]
  if (userAddress) {
    updateSession(userAddress, { 
      status: 'active',
      sessionId: message.sessionId 
    })
  }
})
export async function proposeStateUpdate(userAddress, update) {
  const session = getSession(userAddress)
  if (!session) throw new Error('No active session')
  const relayerSigner = await createRelayerSigner()
  const relayerSignature = await relayerSigner.messageSigner(
    JSON.stringify(update)
  )
  const updateId = `${userAddress}-${Date.now()}`
  pendingStateUpdates.set(updateId, {
    update,
    relayerSignature,
    userSignature: null,
    status: 'pending'
  })
  const stateMessage = await createStateUpdateMessage(
    relayerSigner.messageSigner,
    update
  )
  clearnode.send(stateMessage)
  return updateId
}
clearnode.onMessage('state_signed', (message) => {
  const { updateId, signature, signer } = message
 const pending = pendingStateUpdates.get(updateId)
  if (pending) {
    pending.userSignature = signature
    pending.status = 'signed'
    console.log('✅ State update fully signed:', updateId)
  }
})