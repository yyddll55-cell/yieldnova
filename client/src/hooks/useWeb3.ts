import { useState, useEffect, useCallback } from "react";
import {
  isWalletAvailable,
  connectWallet,
  getWalletInfo,
  switchToBSC,
  signMessage,
  getUSDTBalance,
  getYNVBalance,
  onAccountsChanged,
  
  onChainChanged,
  removeAccountsChangedListener,
  removeChainChangedListener,
  WalletInfo,
} from "@/lib/web3";

export interface Web3State {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  usdtBalance: string | null;
  ynvBalance: string | null;
}

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    wallet: null,
    isConnecting: false,
    error: null,
    usdtBalance: null,
    ynvBalance: null,
  });

  // Check wallet on mount
  useEffect(() => {
    const checkWallet = async () => {
      if (!isWalletAvailable()) {
        setState((prev) => ({ ...prev, error: "Wallet not available" }));
        return;
      }

      try {
        const info = await getWalletInfo();
        if (info) {
          setState((prev) => ({ ...prev, wallet: info, error: null }));

          // Load balances
          const usdt = await getUSDTBalance(info.address);
          const ynv = await getYNVBalance(info.address);
          setState((prev) => ({ ...prev, usdtBalance: usdt, ynvBalance: ynv }));
        }
      } catch (err) {
        console.error("Error checking wallet:", err);
      }
    };

    checkWallet();
    
    // 저장된 지갑 주소가 있으면 로드
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet) {
      // 저장된 주소가 있으면 상태에 반영
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!isWalletAvailable()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState((prev) => ({ ...prev, wallet: null }));
      } else {
        setState((prev) => ({
          ...prev,
          wallet: prev.wallet ? { ...prev.wallet, address: accounts[0] } : null,
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      setState((prev) => ({
        ...prev,
        wallet: prev.wallet ? { ...prev.wallet, chainId: newChainId } : null,
      }));
    };

    onAccountsChanged(handleAccountsChanged);
    onChainChanged(handleChainChanged);

    return () => {
      removeAccountsChangedListener(handleAccountsChanged);
      removeChainChangedListener(handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (!isWalletAvailable()) {
        throw new Error("Wallet not available. Please install MetaMask or TokenPocket.");
      }

      // Switch to BSC
      try {
  await switchToBSC();
} catch (e) {
  console.warn("switchToBSC skipped", e);
} 

      // Connect wallet
      const info = await connectWallet();
      setState((prev) => ({ ...prev, wallet: info, error: null }));
      
      // localStorage에 지갑 주소 저장
      localStorage.setItem("walletAddress", info.address.toLowerCase());

      // Load balances
      const usdt = await getUSDTBalance(info.address);
      const ynv = await getYNVBalance(info.address);
      setState((prev) => ({ ...prev, usdtBalance: usdt, ynvBalance: ynv }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setState((prev) => ({ ...prev, isConnecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    // localStorage에서 지갑 주소 제거
    localStorage.removeItem("walletAddress");
    setState({
      wallet: null,
      isConnecting: false,
      error: null,
      usdtBalance: null,
      ynvBalance: null,
    });
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!state.wallet) return;

    try {
      const usdt = await getUSDTBalance(state.wallet.address);
      const ynv = await getYNVBalance(state.wallet.address);
      setState((prev) => ({ ...prev, usdtBalance: usdt, ynvBalance: ynv }));
    } catch (err) {
      console.error("Error refreshing balances:", err);
    }
  }, [state.wallet]);

  return {
    ...state,
    connect,
    disconnect,
    refreshBalances,
    isWalletAvailable: isWalletAvailable(),
  };
}
commit message
