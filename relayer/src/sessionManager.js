import { createAppSessionMessage } from '@erc7824/nitrolite';
import clearnode from './clearNode.js';
import config from './config.js';
import { createRelayerSigner } from './utils/signer.js';

// Track all user sessions
const userSessions = new Map();

export async function openChannelForUser(userAddress, depositAmount) {
  console.log(`📡 Opening state channel for ${userAddress}...`);
  
  const relayerAddress = await createRelayerSigner().getAddress();
  
  // Define session parameters
  const appDefinition = {
    protocol: 'copy-trading-v1',
    participants: [userAddress, relayerAddress],
    weights: [50, 50],
    quorum: 100,
    challenge: 0,
    nonce: Date.now()
  };

  const allocations = [
    {
      participant: userAddress,
      asset: 'usdc',
      amount: depositAmount.toString()
    },
    {
      participant: relayerAddress,
      asset: 'usdc',
      amount: '0' // Relayer starts with 0
    }
  ];

  try {
    const messageSigner = await createRelayerSigner().messageSigner;
    
    const sessionMessage = await createAppSessionMessage(
      messageSigner,
      [{ definition: appDefinition, allocations }]
    );

    clearnode.send(sessionMessage);
    
    // Store session info
    userSessions.set(userAddress.toLowerCase(), {
      status: 'pending',
      appDefinition,
      allocations,
      following: null,
      createdAt: Date.now()
    });

    console.log(`✅ Channel opened for ${userAddress}`);
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export function getSession(userAddress) {
  return userSessions.get(userAddress.toLowerCase());
}

export function updateSession(userAddress, updates) {
  const session = userSessions.get(userAddress.toLowerCase());
  if (session) {
    userSessions.set(userAddress.toLowerCase(), { ...session, ...updates });
  }
}
clearnode.onMessage('session_created', (message) => {
  console.log('✅ Session confirmed:', message);
  const userAddress = message.participants?.[0];
  if (userAddress) {
    updateSession(userAddress, { 
      status: 'active',
      sessionId: message.sessionId 
    });
  }
});
