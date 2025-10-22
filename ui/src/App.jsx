0oimport { WalletProvider } from './context/WalletContext'
import WalletConnect from './components/WalletConnect'
import DepositUSDC from './components/DepositUSDC'
import './App.css'

function App() {
  return (
    <WalletProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>🚀 SignalFi - Arcology Devnet</h1>
          <p className="subtitle">Connect your wallet and deposit USDC to the Settlement Contract</p>
        </header>
        
        <main className="app-main">
          <WalletConnect />
          <DepositUSDC />
        </main>
        
        <footer className="app-footer">
          <p>Powered by Arcology Network</p>
        </footer>
      </div>
    </WalletProvider>
  )
}

export default App
