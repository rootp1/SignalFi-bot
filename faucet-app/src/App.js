import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, USDC_ADDRESS, WETH_ADDRESS, FAUCET_SERVER_URL, ERC20_ABI } from './config';

function App() {
  const [account, setAccount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [wethBalance, setWethBalance] = useState('0');
  const [arcBalance, setArcBalance] = useState('0');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [status, setStatus] = useState('');
  const [hasClaimedARC, setHasClaimedARC] = useState(false);

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
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
      setStatus('Wallet connected!');
      checkNetwork();
    } catch (error) {
      setStatus('Error connecting wallet: ' + error.message);
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

    // Check if already claimed from localStorage
    const claimKey = `arc_claimed_${account.toLowerCase()}`;
    if (localStorage.getItem(claimKey)) {
      setStatus('You have already claimed ARC for this account!');
      return;
    }

    // Check if balance is already > 0
    if (parseFloat(arcBalance) > 0) {
      setStatus('You already have ARC! Balance: ' + arcBalance + ' ARC');
      return;
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

      // Mark as claimed in localStorage
      localStorage.setItem(claimKey, 'true');
      setHasClaimedARC(true);

      setStatus(`Successfully claimed 10 ARC! TX: ${data.txHash.slice(0, 10)}...`);

      // Wait a moment then update balance
      setTimeout(() => {
        loadBalances();
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

  // Mint USDC
  const mintUSDC = async () => {
    if (!account) {
      setStatus('Please connect wallet first!');
      return;
    }

    if (!isCorrectNetwork) {
      setStatus('Please switch to Arcology Devnet first!');
      return;
    }

    try {
      setStatus('Minting 100 USDC...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

      // Mint 100 USDC (6 decimals) with explicit gas limit
      const tx = await usdcContract.mint(
        account,
        ethers.utils.parseUnits('100', 6),
        {
          gasLimit: 100000  // Set explicit gas limit
        }
      );
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);

      const receipt = await tx.wait();
      console.log('Mint receipt:', receipt);

      if (receipt.status === 1) {
        setStatus('Successfully minted 100 USDC! Adding token to MetaMask...');

        // Automatically add token to MetaMask
        await addTokenToMetaMask(USDC_ADDRESS, 'USDC', 6);

        // Update balance immediately and again after a delay
        await loadBalances();

        setTimeout(async () => {
          await loadBalances();
          setStatus('100 USDC minted successfully! Check your wallet or click "Refresh Balances"');
        }, 2000);
      } else {
        setStatus('Transaction failed!');
      }
    } catch (error) {
      setStatus('Error minting USDC: ' + error.message);
      console.error('Full error:', error);
    }
  };

  // Mint WETH
  const mintWETH = async () => {
    if (!account) {
      setStatus('Please connect wallet first!');
      return;
    }

    if (!isCorrectNetwork) {
      setStatus('Please switch to Arcology Devnet first!');
      return;
    }

    try {
      setStatus('Minting 1 WETH...');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);

      // Mint 1 WETH (18 decimals) with explicit gas limit
      const tx = await wethContract.mint(
        account,
        ethers.utils.parseEther('1'),
        {
          gasLimit: 100000  // Set explicit gas limit
        }
      );
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);

      const receipt = await tx.wait();
      console.log('Mint receipt:', receipt);

      if (receipt.status === 1) {
        setStatus('Successfully minted 1 WETH! Adding token to MetaMask...');

        // Automatically add token to MetaMask
        await addTokenToMetaMask(WETH_ADDRESS, 'WETH', 18);

        // Update balance immediately and again after a delay
        await loadBalances();

        setTimeout(async () => {
          await loadBalances();
          setStatus('1 WETH minted successfully! Check your wallet or click "Refresh Balances"');
        }, 2000);
      } else {
        setStatus('Transaction failed!');
      }
    } catch (error) {
      setStatus('Error minting WETH: ' + error.message);
      console.error('Full error:', error);
    }
  };

  // Load token balances
  const loadBalances = async () => {
    if (!account || !isCorrectNetwork) return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get ARC balance
      const arcBal = await provider.getBalance(account);
      setArcBalance(ethers.utils.formatEther(arcBal));
      console.log('ARC Balance:', ethers.utils.formatEther(arcBal));

      // IMPORTANT: Arcology RPC requires 'from' address in eth_call
      // Use signer instead of provider to automatically include it
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);

      const usdcBal = await usdcContract.balanceOf(account);
      const wethBal = await wethContract.balanceOf(account);

      const formattedUSDC = ethers.utils.formatUnits(usdcBal, 6);
      const formattedWETH = ethers.utils.formatEther(wethBal);

      console.log('USDC Balance:', formattedUSDC, 'Raw:', usdcBal.toString());
      console.log('WETH Balance:', formattedWETH, 'Raw:', wethBal.toString());

      setUsdcBalance(formattedUSDC);
      setWethBalance(formattedWETH);
    } catch (error) {
      console.error('Error loading balances:', error);
      setStatus('Error loading balances: ' + error.message);
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
      loadBalances();
    }
  }, [account, isCorrectNetwork]);

  // Check claim status when account changes
  useEffect(() => {
    if (account) {
      const claimKey = `arc_claimed_${account.toLowerCase()}`;
      const hasClaimed = localStorage.getItem(claimKey) === 'true';
      setHasClaimedARC(hasClaimed);
    }
  }, [account]);

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
            <h1 className="neon-title">SignalFi</h1>
            <div className="mt-1 text-xs neon-pink">Cyberpunk Faucet • Hackathon Edition</div>
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
                <div className="flex items-center justify-between"><span className="text-sm">USDC</span><span className="neon-pink font-mono">{usdcBalance}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm">WETH</span><span className="neon-green font-mono">{wethBalance}</span></div>
                <div className="mt-3">
                  <button className="glass-btn" onClick={loadBalances}>Refresh</button>
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
            <button className="neon-btn" onClick={mintUSDC} disabled={!account || !isCorrectNetwork}>Get 100 USDC</button>
            <button className="neon-btn" onClick={mintWETH} disabled={!account || !isCorrectNetwork}>Get 1 WETH</button>
          </div>
        </section>

        <footer className="mt-6 text-sm neon-pink">
          <div>USDC: {USDC_ADDRESS}</div>
          <div>WETH: {WETH_ADDRESS}</div>
        </footer>
      </main>
    </div>
  );
}

export default App;
