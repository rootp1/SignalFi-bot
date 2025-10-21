import { ethers } from 'ethers';
import config from '../config.js';
let relayerWallet = null
export function createRelayerSigner() {
  if (!relayerWallet) {
    relayerWallet = new ethers.Wallet(config.l1.relayerPrivateKey)
  }

  return {
    getAddress: async () => relayerWallet.address,
    messageSigner: async (message) => {
      return await relayerWallet.signMessage(message)
    }
  }
}
