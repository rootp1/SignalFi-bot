import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, PYUSD_ADDRESS, WETH_ADDRESS, PYUSD_FAUCET_ADDRESS, FAUCET_SERVER_URL, ERC20_ABI, PYUSD_FAUCET_ABI } from './config';
import { queryBalance, queryFaucetCooldown } from './arcologyHelpers';

function App() {
  const [account, setAccount] = useState('');
  const [pyusdBalance, setPyusdBalance] = useState('0');
  const [arcBalance, setArcBalance] = useState('0');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [status, setStatus] = useState('');
  const [hasClaimedARC, setHasClaimedARC] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setStatus('Please install MetaMask!');
      return;
    }

    try {
      setStatus('Connecting to wallet...');
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setStatus('Wallet connected!');
        await checkNetwork();
      } else {
        setStatus('No accounts found. Please unlock MetaMask.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      
      if (error.code === 4001) {
        setStatus('Connection rejected by user');
      } else if (error.code === -32002) {
        setStatus('Connection request already pending. Please check MetaMask.');
      } else {
        setStatus('Error connecting wallet: ' + error.message);
      }
    }
  };

  // Check if on correct network
  const checkNetwork = async () => {
    if (!isMetaMaskInstalled()) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setIsCorrectNetwork(chainId === NETWORK_CONFIG.chainId);
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  // Add Arcology Network to MetaMask
  const addNetwork = async () => {
    if (!isMetaMaskInstalled()) {
      setStatus('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [NETWORK_CONFIG]
      });
      setStatus('Network added! Please switch to Arcology Devnet');
      setTimeout(checkNetwork, 1000);
    } catch (error) {
      setStatus('Error adding network: ' + error.message);
    }
  };

  // Switch to Arcology Network
  const switchNetwork = async () => {
    if (!isMetaMaskInstalled()) {
      setStatus('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }]
      });
      setStatus('Switched to Arcology Devnet!');
      setTimeout(checkNetwork, 1000);
    } catch (error) {
      if (error.code === 4902) {
        // Network not added yet
        await addNetwork();
      } else {
        setStatus('Error switching network: ' + error.message);
      }
    }
  };

  // Claim ARC from faucet server
  const claimARC = async () => {
    if (!account) {
      setStatus('Please connect wallet first!');
      return;
    }

    if (!isCorrectNetwork) {
      setStatus('Please switch to Arcology Devnet first!');
      return;
    }

    // Check if balance is already > 0.5 ARC (threshold to allow re-claims if balance is very low)
    if (parseFloat(arcBalance) > 0.5) {
      setStatus('You already have ARC! Balance: ' + arcBalance + ' ARC');
      // Don't set as claimed if they just have balance, only if they actually claimed from faucet
      return;
    }

    // Check if already claimed from localStorage (prevent multiple claims in 24h)
    const claimKey = `arc_claimed_${account.toLowerCase()}`;
    const lastClaimTime = localStorage.getItem(claimKey);
    
    if (lastClaimTime) {
      const timeSinceLastClaim = Date.now() - parseInt(lastClaimTime);
      const hoursRemaining = 24 - Math.floor(timeSinceLastClaim / (1000 * 60 * 60));
      
      if (hoursRemaining > 0) {
        setStatus(`Please wait ${hoursRemaining} hours before claiming again!`);
        return;
      }
    }

    try {
      setStatus('Requesting 10 ARC from faucet...');

      // Call faucet server
      const response = await fetch(`${FAUCET_SERVER_URL}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: account })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Faucet request failed');
      }

      // Mark claim time in localStorage (store timestamp instead of boolean)
      localStorage.setItem(claimKey, Date.now().toString());
      setHasClaimedARC(true);

      setStatus(`Successfully claimed 10 ARC! TX: ${data.txHash.slice(0, 10)}...`);

      // Wait a moment then update balance
      setTimeout(() => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        provider.getBalance(account).then(arcBal => {
          setArcBalance(ethers.utils.formatEther(arcBal));
        });
      }, 2000);

    } catch (error) {
      setStatus('Error claiming ARC: ' + error.message);
      console.error('Full error:', error);
    }
  };

  // Add token to MetaMask
  const addTokenToMetaMask = async (tokenAddress, symbol, decimals) => {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: symbol,
            decimals: decimals,
          },
        },
      });
    } catch (error) {
      console.error('Error adding token:', error);
    }
  };

  // Claim PYUSD from faucet (unlimited, no cooldown)
  const claimPYUSD = async () => {
    if (!account) {
      setStatus('Please connect wallet first!');
      return;
    }

    if (!isCorrectNetwork) {
      setStatus('Please switch to Arcology Devnet first!');
      return;
    }

    try {
      setStatus('Claiming 100 PYUSD from faucet...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const faucetContract = new ethers.Contract(PYUSD_FAUCET_ADDRESS, PYUSD_FAUCET_ABI, signer);

      // Claim PYUSD with explicit gas limit
      const tx = await faucetContract.claimPYUSD({
        gasLimit: 200000
      });
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);

      const receipt = await tx.wait();
      console.log('Claim receipt:', receipt);

      if (receipt.status === 1) {
        setStatus('Successfully claimed 100 PYUSD! Adding token to MetaMask...');

        // Automatically add token to MetaMask
        await addTokenToMetaMask(PYUSD_ADDRESS, 'PYUSD', 6);

        // Update balance
        await loadBalances(true); // Force refresh

        setTimeout(async () => {
          await loadBalances(true); // Force refresh
          setStatus('100 PYUSD claimed successfully! Check your wallet or click "Refresh Tokens"');
        }, 2000);
      } else {
        setStatus('Transaction failed!');
      }
    } catch (error) {
      setStatus('Error claiming PYUSD: ' + error.message);
      console.error('Full error:', error);
    }
  };

  // Load token balances (Arcology pattern)
  const loadBalances = async (forceRefresh = false) => {
    if (!account || !isCorrectNetwork) return;
    if (isLoadingBalances && !forceRefresh) return; // Prevent multiple simultaneous calls

    try {
      setIsLoadingBalances(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get ARC balance (native currency - works normally, no transaction needed)
      const arcBal = await provider.getBalance(account);
      setArcBalance(ethers.utils.formatEther(arcBal));
      console.log('ARC Balance:', ethers.utils.formatEther(arcBal));

      // For Arcology tokens, querying requires transactions (MetaMask prompts!)
      // Only query if forced or if we have 0 balance (initial load)
      if (forceRefresh || pyusdBalance === '0') {
        setStatus('Querying PYUSD balance (requires signature)...');
        
        const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, ERC20_ABI, signer);

        console.log('Querying PYUSD balance...');
        const pyusdBal = await queryBalance(pyusdContract, account).catch(err => {
          console.warn('PYUSD balance query failed:', err.message);
          return ethers.BigNumber.from(0);
        });

        const formattedPYUSD = ethers.utils.formatUnits(pyusdBal, 6);
        console.log('PYUSD Balance:', formattedPYUSD, 'Raw:', pyusdBal.toString());
        setPyusdBalance(formattedPYUSD);
      }
      
      setStatus('Balances loaded!');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      console.error('Error loading balances:', error);
      setStatus('Error loading balances: ' + error.message);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Listen for account and network changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || '');
      });

      window.ethereum.on('chainChanged', () => {
        checkNetwork();
      });
    }
  }, []);

  // Load balances when account or network changes
  useEffect(() => {
    if (account && isCorrectNetwork) {
      // Only auto-load ARC balance (no MetaMask popup)
      // Token balances require user to click "Refresh" button
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.getBalance(account).then(arcBal => {
        setArcBalance(ethers.utils.formatEther(arcBal));
      });
    }
  }, [account, isCorrectNetwork]);

  // Check claim status when account or balance changes
  useEffect(() => {
    if (account) {
      const claimKey = `arc_claimed_${account.toLowerCase()}`;
      const lastClaimTime = localStorage.getItem(claimKey);
      
      if (lastClaimTime) {
        const timeSinceLastClaim = Date.now() - parseInt(lastClaimTime);
        const hoursRemaining = 24 - Math.floor(timeSinceLastClaim / (1000 * 60 * 60));
        
        // Mark as claimed only if within 24 hour cooldown period
        setHasClaimedARC(hoursRemaining > 0);
      } else {
        setHasClaimedARC(false);
      }
    }
  }, [account, arcBalance]); // Re-check when account or balance changes

  return (
    <div className="relative">
      {/* floating grid for futuristic depth */}
      <div className="floating-grid" aria-hidden>
        <div className="grid-cell" style={{ left: '10%' }} />
        <div className="grid-cell" style={{ left: '40%', top: '60%', transform: 'rotate(6deg) translateX(40px)' }} />
      </div>

      <main className="faucet-shell relative z-10">
        <header className="flex items-center justify-between mb-6">
          <div className="crazy-header">
            <h1 className="neon-title">SignalFi PYUSD</h1>
            <div className="mt-1 text-xs neon-pink">PayPal USD Faucet • Hackathon Edition</div>
          </div>
          <div className="space-x-3">
            {!account ? (
              <button className="neon-btn" onClick={connectWallet}>Connect Wallet</button>
            ) : (
              <div className="stat-chip">
                <span className="text-xs">{account.slice(0,6)}...{account.slice(-4)}</span>
              </div>
            )}
          </div>
        </header>

        {status && (
          <div className="crazy-status neon-pink">{status}</div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-2xl border border-transparent" style={{ background: 'linear-gradient(135deg, rgba(0,255,208,0.02), rgba(255,0,200,0.02))' }}>
            <h2 className="text-lg font-semibold neon-green">Network</h2>
            {!isCorrectNetwork ? (
              <div className="mt-3">
                <div className="text-sm mb-3">You need to be on Arcology Devnet</div>
                <div className="flex gap-3">
                  <button className="glass-btn" onClick={addNetwork}>Add Arcology</button>
                  <button className="glass-btn" onClick={switchNetwork}>Switch</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 neon-green">✓ Connected to Arcology Devnet</div>
            )}
          </div>

          <div className="p-4 rounded-2xl">
            <h2 className="text-lg font-semibold neon-pink">Balances</h2>
            {account && isCorrectNetwork ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between"><span className="text-sm">ARC</span><span className="neon-green font-mono">{arcBalance}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm">PYUSD</span><span className="neon-pink font-mono">{pyusdBalance}</span></div>
                <div className="mt-3 space-x-2">
                  <button 
                    className="glass-btn" 
                    onClick={() => loadBalances(true)}
                    disabled={isLoadingBalances}
                  >
                    {isLoadingBalances ? 'Loading...' : 'Refresh PYUSD'}
                  </button>
                  <span className="text-xs text-gray-400">(requires signature)</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm">Connect wallet and switch to the network to see balances.</div>
            )}
          </div>
        </section>

        <section className="mt-6 p-4 rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.02)' }}>
          <h3 className="text-lg font-semibold neon-pink">Get Test Tokens</h3>

          {account && isCorrectNetwork && parseFloat(arcBalance) < 1 && !hasClaimedARC && (
            <div className="mt-3 p-3 rounded-lg border-l-4" style={{ borderColor: '#ffcc00', background: 'rgba(255,204,0,0.03)' }}>
              <strong className="neon-yellow">⚠ Low ARC balance!</strong>
              <div className="text-sm">Click below to get 10 ARC for gas.</div>
            </div>
          )}

          {account && isCorrectNetwork && (hasClaimedARC || parseFloat(arcBalance) > 0) && (
            <div className="mt-3 p-3 rounded-lg" style={{ border: '1px solid rgba(0,255,208,0.06)', background: 'rgba(0,255,208,0.02)' }}>
              <strong className="neon-green">✅ You already have ARC</strong>
              <div className="text-sm">Balance: {arcBalance} ARC</div>
            </div>
          )}

          <div className="mt-4 button-row">
            <button className="neon-btn" onClick={claimARC} disabled={!account || !isCorrectNetwork || hasClaimedARC || parseFloat(arcBalance) > 0}>
              {hasClaimedARC || parseFloat(arcBalance) > 0 ? '✓ Already Claimed' : 'Get 10 ARC'}
            </button>
            <button 
              className="neon-btn" 
              onClick={claimPYUSD} 
              disabled={!account || !isCorrectNetwork}
            >
              Get 100 PYUSD
            </button>
          </div>
        </section>

        <footer className="mt-6 text-sm neon-pink">
          <div>PYUSD: {PYUSD_ADDRESS}</div>
          <div>PYUSD Faucet: {PYUSD_FAUCET_ADDRESS}</div>
        </footer>
      </main>
    </div>
  );
}

export default App;
