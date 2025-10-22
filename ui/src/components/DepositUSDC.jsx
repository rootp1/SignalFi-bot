import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS, ERC20_ABI, SETTLEMENT_ABI, USDC_DECIMALS } from '../config';
import './DepositUSDC.css';

const DepositUSDC = () => {
  const { signer, account, isConnected } = useWallet();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [depositBalance, setDepositBalance] = useState('0');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load user balances
  const loadBalances = async () => {
    if (!signer || !account) return;

    try {
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
      const settlementContract = new ethers.Contract(CONTRACTS.SETTLEMENT, SETTLEMENT_ABI, signer);

      // Get USDC balance
      const bal = await usdcContract.balanceOf(account);
      setBalance(ethers.formatUnits(bal, USDC_DECIMALS));

      // Get allowance
      const allow = await usdcContract.allowance(account, CONTRACTS.SETTLEMENT);
      setAllowance(ethers.formatUnits(allow, USDC_DECIMALS));

      // Get deposit balance in settlement contract
      const depBal = await settlementContract.getDeposit(account);
      setDepositBalance(ethers.formatUnits(depBal, USDC_DECIMALS));
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadBalances();
    }
  }, [signer, account, isConnected]);

  // Approve USDC
  const handleApprove = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsApproving(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      const usdcContract = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
      const amountInWei = ethers.parseUnits(amount, USDC_DECIMALS);

      const tx = await usdcContract.approve(CONTRACTS.SETTLEMENT, amountInWei);
      setTxHash(tx.hash);
      setSuccess('Approval transaction submitted. Waiting for confirmation...');

      await tx.wait();
      setSuccess('USDC approved successfully!');
      await loadBalances();
    } catch (err) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve USDC');
    } finally {
      setIsApproving(false);
    }
  };

  // Deposit USDC
  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient USDC balance');
      return;
    }

    if (parseFloat(amount) > parseFloat(allowance)) {
      setError('Please approve USDC first');
      return;
    }

    setIsDepositing(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      const settlementContract = new ethers.Contract(CONTRACTS.SETTLEMENT, SETTLEMENT_ABI, signer);
      const amountInWei = ethers.parseUnits(amount, USDC_DECIMALS);

      const tx = await settlementContract.deposit(amountInWei);
      setTxHash(tx.hash);
      setSuccess('Deposit transaction submitted. Waiting for confirmation...');

      await tx.wait();
      setSuccess('USDC deposited successfully!');
      setAmount('');
      await loadBalances();
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit USDC');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(balance);
  };

  if (!isConnected) {
    return (
      <div className="deposit-container">
        <p className="connect-message">Please connect your wallet to deposit USDC</p>
      </div>
    );
  }

  return (
    <div className="deposit-container">
      <h2>Deposit USDC</h2>
      
      <div className="balance-info">
        <div className="balance-item">
          <span className="balance-label">Wallet Balance:</span>
          <span className="balance-value">{parseFloat(balance).toFixed(2)} USDC</span>
        </div>
        <div className="balance-item">
          <span className="balance-label">Allowance:</span>
          <span className="balance-value">{parseFloat(allowance).toFixed(2)} USDC</span>
        </div>
        <div className="balance-item">
          <span className="balance-label">Deposited:</span>
          <span className="balance-value">{parseFloat(depositBalance).toFixed(2)} USDC</span>
        </div>
      </div>

      <div className="input-group">
        <label>Amount (USDC)</label>
        <div className="input-wrapper">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isApproving || isDepositing}
          />
          <button 
            className="max-button"
            onClick={handleMaxClick}
            disabled={isApproving || isDepositing}
          >
            MAX
          </button>
        </div>
      </div>

      <div className="button-group">
        <button
          className="approve-button"
          onClick={handleApprove}
          disabled={isApproving || isDepositing || !amount}
        >
          {isApproving ? 'Approving...' : 'Approve USDC'}
        </button>

        <button
          className="deposit-button"
          onClick={handleDeposit}
          disabled={isDepositing || isApproving || !amount}
        >
          {isDepositing ? 'Depositing...' : 'Deposit USDC'}
        </button>
      </div>

      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}
      {txHash && (
        <div className="tx-hash">
          <span>Transaction: </span>
          <a 
            href={`https://yttric-socorro-maniacally.ngrok-free.dev/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
          </a>
        </div>
      )}
    </div>
  );
};

export default DepositUSDC;
