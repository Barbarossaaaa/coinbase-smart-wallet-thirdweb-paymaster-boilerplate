import React, { useState } from "react";
import { ThirdwebProvider, ConnectButton, useSendCalls, useActiveWallet, useSwitchActiveWalletChain, useActiveWalletChain, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { base } from 'thirdweb/chains';
import { createWallet } from "thirdweb/wallets";
import { waitForCallsReceipt } from "thirdweb/wallets/eip5792";

export const HIGH_GAS_LIMIT = 1000000n;

const clientId = 'replace-with-your-thirdweb-client-id'

// Explicitly configure client for Base network
const client = createThirdwebClient({ 
  clientId,
  chain: base,
});
const thirdwebPaymasterUrl = `https://${base.id}.bundler.thirdweb.com/${client.clientId}`;

const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const WETH_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'dst', type: 'address', indexed: true, internalType: 'address' },
      { name: 'wad', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawal',
    inputs: [
      { name: 'src', type: 'address', indexed: true, internalType: 'address' },
      { name: 'wad', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true, internalType: 'address' },
      { name: 'to', type: 'address', indexed: true, internalType: 'address' },
      { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false,
  }
];

// Configure wallets with explicit Base network preference
const wallets = [
  createWallet("com.coinbase.wallet", {
    // Force Base network
    chain: base,
  })
];

function App() {
  const switchChain = useSwitchActiveWalletChain();
  const activeWalletChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();

  console.log('active wallet', activeAccount)
  const [amount, setAmount] = useState('0.001');
  const [recipient, setRecipient] = useState('');
  const [transactionType, setTransactionType] = useState('deposit'); // 'deposit', 'withdraw', 'transfer'

  const { mutateAsync: sendCalls } = useSendCalls();

  const handleSponsoredTx = async () => {
    if (activeWalletChain?.id !== base.id) {
      await switchChain(base);
    }

    try {
      const wethContract = getContract({
        client,
        chain: base,
        address: WETH_ADDRESS,
        abi: WETH_ABI,
      });

      let call;
      
      if (transactionType === 'deposit') {
        const amountInWei = parseFloat(amount) * Math.pow(10, 18);
        
        call = prepareContractCall({
          contract: wethContract,
          method: 'function deposit()',
          params: [],
          value: amountInWei, // Send ETH with the transaction
          gas: HIGH_GAS_LIMIT,
        });
      } else if (transactionType === 'withdraw') {
        // Convert ETH amount to wei (18 decimals)
        const amountInWei = parseFloat(amount) * Math.pow(10, 18);
        
        call = prepareContractCall({
          contract: wethContract,
          method: 'function withdraw(uint256)',
          params: [amountInWei],
          gas: HIGH_GAS_LIMIT,
        });
      } else if (transactionType === 'transfer') {
        if (!recipient || recipient.length !== 42) {
          alert('Please enter a valid recipient address (0x... format)');
          return;
        }
        
        // Convert ETH amount to wei (18 decimals)
        const amountInWei = parseFloat(amount) * Math.pow(10, 18);
        
        call = prepareContractCall({
          contract: wethContract,
          method: 'function transfer(address,uint256)',
          params: [recipient, amountInWei],
          gas: HIGH_GAS_LIMIT,
        });
      }
  
      const calls = await sendCalls({
        calls: [
          {
            ...call,
            __contract: undefined,
            __preparedMethod: undefined,
          },
        ],
        capabilities: { paymasterService: { url: thirdwebPaymasterUrl } },
      });

      await waitForCallsReceipt(calls);
      
      return calls.id;
    } catch (error) {
      console.error("Transaction failed:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  };

  return <>
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Base Network Smart Wallet Paymaster</h2>
      <p>Network: {base.name} (Chain ID: {base.id})</p>
      <p>Connected: {activeAccount?.address ? `Yes (${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)})` : 'No'}</p>
      
      <ConnectButton 
        client={client}
        connectModal={{ 
          size: "compact",
          // Force Base network in the modal
          chain: base,
        }}
        wallets={wallets}
      />
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>WETH Contract Interaction</h3>
        <p>This demonstrates a simple contract interaction with WETH (Wrapped ETH) on Base network.</p>
        
        <div style={{ marginBottom: '15px' }}>
          <label>
            Transaction Type:
            <select 
              value={transactionType} 
              onChange={(e) => setTransactionType(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="deposit">Deposit ETH → WETH</option>
              <option value="withdraw">Withdraw WETH → ETH</option>
              <option value="transfer">Transfer WETH</option>
            </select>
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>
            Amount (ETH):
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              step="0.001"
              min="0"
              style={{ marginLeft: '10px', padding: '5px', width: '150px' }}
            />
          </label>
        </div>
        
        {transactionType === 'transfer' && (
          <div style={{ marginBottom: '15px' }}>
            <label>
              Recipient Address:
              <input 
                type="text" 
                value={recipient} 
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              />
            </label>
          </div>
        )}
        
        <button 
          onClick={handleSponsoredTx}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#0052ff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Execute {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Transaction
        </button>
        
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <p><strong>What this does:</strong></p>
          <ul>
            <li><strong>Deposit:</strong> Converts your ETH to WETH (Wrapped ETH)</li>
            <li><strong>Withdraw:</strong> Converts your WETH back to ETH</li>
            <li><strong>Transfer:</strong> Sends WETH to another address</li>
          </ul>
          <p><strong>Why WETH?</strong> It's a standard ERC20 token that wraps ETH, available on every network, and doesn't require any pre-existing instances or complex setup.</p>
        </div>
      </div>
    </div>
  </>;
}

export default function Root() {
  return (
    <ThirdwebProvider 
      client={client}
      // Explicitly set the default chain to Base
      defaultChain={base}
    >
      <App />
    </ThirdwebProvider>
  );
}
