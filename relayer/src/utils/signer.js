import { ethers } from 'ethers';
import nitrolite from '@erc7824/nitrolite'
const { createECDSAMessageSigner } = nitrolite
import config from '../config.js';

let relayerWallet = null

export function createRelayerSigner() {
  if (!relayerWallet) {
    relayerWallet = new ethers.Wallet(config.l1.relayerPrivateKey)
  }

  return {
    getAddress: async () => relayerWallet.address,
    messageSigner: createECDSAMessageSigner(config.l1.relayerPrivateKey)
  }
}
