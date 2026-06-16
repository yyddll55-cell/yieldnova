import { ethers } from "ethers";

// Contract addresses
export const YNV_CONTRACT_ADDRESS = import.meta.env.VITE_YNV_CONTRACT_ADDRESS;
export const USDT_CONTRACT_ADDRESS = import.meta.env.VITE_USDT_CONTRACT_ADDRESS;
export const BSC_CHAIN_ID = parseInt(import.meta.env.VITE_BSC_CHAIN_ID || "56");
export const BSC_RPC_URL = import.meta.env.VITE_BSC_RPC_URL;

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

export interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export interface TokenBalance {
  balance: string;
  decimals: number;
  symbol: string;
}

/**
 * Check if wallet is available (MetaMask, TokenPocket, etc.)
 */
export function isWalletAvailable(): boolean {
  if (typeof window === "undefined") return false;
  
  // MetaMask, TokenPocket, 기타 Web3 지갑 감지
  const hasEthereum = window.ethereum !== undefined && window.ethereum !== null;
  const hasWeb3Provider = (window as any).web3?.currentProvider !== undefined;
  
  return hasEthereum || hasWeb3Provider;
}

/**
 * Connect wallet and return wallet info
 */
export async function connectWallet(): Promise<WalletInfo> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet detected. Please install MetaMask or TokenPocket.");
  }

  const accounts = await window.ethereum!.request({
    method: "eth_requestAccounts",
  });

  const chainId = await window.ethereum!.request({
    method: "eth_chainId",
  });

  return {
    address: accounts[0],
    chainId: parseInt(chainId as string, 16),
    isConnected: true,
  };
}

/**
 * Get current wallet info
 */
export async function getWalletInfo(): Promise<WalletInfo | null> {
  if (!isWalletAvailable()) {
    return null;
  }

  try {
    const accounts = await window.ethereum!.request({
      method: "eth_accounts",
    });

    if (!accounts || accounts.length === 0) {
      return null;
    }

    const chainId = await window.ethereum!.request({
      method: "eth_chainId",
    });

    return {
      address: (accounts as string[])[0],
      chainId: parseInt(chainId as string, 16),
      isConnected: true,
    };
  } catch (error) {
    console.error("Error getting wallet info:", error);
    return null;
  }
}

/**
 * Switch to BSC network
 */
export async function switchToBSC(): Promise<void> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet detected");
  }

  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }],
    });
  } catch (error: any) {
    // If network not added, add it
    if (error.code === 4902) {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
            chainName: "BNB Chain",
            rpcUrls: [BSC_RPC_URL],
            nativeCurrency: {
              name: "BNB",
              symbol: "BNB",
              decimals: 18,
            },
            blockExplorerUrls: ["https://bscscan.com"],
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Sign message for authentication
 */
export async function signMessage(message: string, address: string): Promise<string> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet detected");
  }

  const signature = await window.ethereum!.request({
    method: "personal_sign",
    params: [message, address],
  });

  return signature as string;
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<TokenBalance> {
  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  const balance = await contract.balanceOf(walletAddress);
  const decimals = await contract.decimals();
  const symbol = await contract.symbol();

  return {
    balance: balance.toString(),
    decimals,
    symbol,
  };
}

/**
 * Get formatted token balance
 */
export async function getFormattedTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<string> {

  // 토큰 주소가 없는 경우
  if (!tokenAddress) {
    return "0";
  }

  try {
    const { balance, decimals } = await getTokenBalance(
      tokenAddress,
      walletAddress
    );

    return ethers.formatUnits(
      balance,
      decimals
    );
  } catch (error) {
    console.error(
      "Token balance error:",
      error
    );

    return "0";
  }
}

/**
 * Get USDT balance
 */
export async function getUSDTBalance(walletAddress: string): Promise<string> {
  return getFormattedTokenBalance(USDT_CONTRACT_ADDRESS, walletAddress);
}

/**
 * Get YNV balance
 */
export async function getYNVBalance(
  walletAddress: string
): Promise<string> {

  // 아직 YNV 토큰 미발행 상태
  if (!YNV_CONTRACT_ADDRESS) {
    return "토큰 준비중";
  }

  try {
    return await getFormattedTokenBalance(
      YNV_CONTRACT_ADDRESS,
      walletAddress
    );
  } catch (error) {
    console.error(
      "YNV balance error:",
      error
    );

    return "토큰 준비중";
  }
}

/**
 * Approve token spending
 */
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): Promise<string> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

  const tx = await contract.approve(spenderAddress, ethers.parseUnits(amount, 18));
  return tx.hash;
}

/**
 * Transfer token
 */
export async function transferToken(
  tokenAddress: string,
  toAddress: string,
  amount: string
): Promise<string> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

  const tx = await contract.transfer(toAddress, ethers.parseUnits(amount, 18));
  return tx.hash;
}

/**
 * Listen to wallet account changes
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  if (!isWalletAvailable()) return;

  window.ethereum!.on("accountsChanged", callback);
}

/**
 * Listen to chain changes
 */
export function onChainChanged(callback: (chainId: string) => void): void {
  if (!isWalletAvailable()) return;

  window.ethereum!.on("chainChanged", callback);
}

/**
 * Remove event listeners
 */
export function removeAccountsChangedListener(callback: (accounts: string[]) => void): void {
  if (!isWalletAvailable()) return;

  window.ethereum!.removeListener("accountsChanged", callback);
}

export function removeChainChangedListener(callback: (chainId: string) => void): void {
  if (!isWalletAvailable()) return;

  window.ethereum!.removeListener("chainChanged", callback);
}
