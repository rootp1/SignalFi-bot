import { useWallet } from '../context/WalletContext';
import './WalletConnect.css';

const WalletConnect = () => {
  const { 
    account, 
    isConnected, 
    isConnecting, 
    isCorrectNetwork,
    connectWallet, 
    disconnectWallet,
    error 
  } = useWallet();

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-connect-container">
      {!isConnected ? (
        <button 
          className="connect-button"
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : '🦊 Connect Wallet'}
        </button>
      ) : (
        <div className="wallet-info">
          {!isCorrectNetwork && (
            <div className="network-warning">
              ⚠️ Wrong Network - Please switch to Arcology Devnet
            </div>
          )}
          <div className="account-display">
            <span className="account-icon">👤</span>
            <span className="account-address">{formatAddress(account)}</span>
            <button 
              className="disconnect-button"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
      
      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
};

export default WalletConnect;
