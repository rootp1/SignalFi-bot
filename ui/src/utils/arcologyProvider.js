import { ethers } from 'ethers';

/**
 * Custom JsonRpcProvider that adds 'from' field to eth_call requests
 * This is required for Arcology RPC which validates the 'from' field
 */
export class ArcologyProvider extends ethers.JsonRpcProvider {
  constructor(url, network, account) {
    super(url, network);
    this.defaultAccount = account;
  }

  setDefaultAccount(account) {
    this.defaultAccount = account;
  }

  async send(method, params) {
    // Intercept eth_call and add 'from' field if missing
    if (method === 'eth_call' && params && params[0]) {
      if (!params[0].from && this.defaultAccount) {
        params[0] = {
          ...params[0],
          from: this.defaultAccount
        };
      }
    }
    
    return super.send(method, params);
  }
}

/**
 * Create an Arcology-compatible provider from MetaMask's provider
 */
export function createArcologyProvider(ethereumProvider, account) {
  // Wrap the MetaMask provider with our custom provider logic
  const provider = new ethers.BrowserProvider(ethereumProvider);
  
  // Override the call method to add 'from' field
  const originalCall = provider.call.bind(provider);
  provider.call = async function(transaction) {
    // Ensure 'from' field is set for Arcology RPC
    if (!transaction.from && account) {
      transaction = {
        ...transaction,
        from: account
      };
    }
    return originalCall(transaction);
  };
  
  return provider;
}

/**
 * Create a signer with Arcology-compatible provider
 */
export async function createArcologySigner(ethereumProvider, account) {
  const provider = createArcologyProvider(ethereumProvider, account);
  const signer = await provider.getSigner();
  
  // Override estimateGas to include 'from'
  const originalEstimateGas = signer.estimateGas.bind(signer);
  signer.estimateGas = async function(transaction) {
    if (!transaction.from) {
      transaction = {
        ...transaction,
        from: account
      };
    }
    return originalEstimateGas(transaction);
  };
  
  return signer;
}
