import { describe, it, expect } from "vitest";

describe("Web3 Configuration", () => {
  it("should have YNV contract address configured", () => {
    const ynvAddress = process.env.VITE_YNV_CONTRACT_ADDRESS;
    expect(ynvAddress).toBe("0x6468648d3949ae1f3d02888515f9b49b8ee1655f");
    expect(ynvAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should have USDT contract address configured", () => {
    const usdtAddress = process.env.VITE_USDT_CONTRACT_ADDRESS;
    expect(usdtAddress).toBe("0x55d398326f99059fF775485246999027B3197955");
    expect(usdtAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should have BSC RPC URL configured", () => {
    const rpcUrl = process.env.VITE_BSC_RPC_URL;
    expect(rpcUrl).toBeDefined();
    expect(rpcUrl).toContain("bsc");
  });

  it("should have BSC chain ID configured", () => {
    const chainId = process.env.VITE_BSC_CHAIN_ID;
    expect(chainId).toBe("56");
  });

  it("should have backend YNV contract address", () => {
    const ynvAddress = process.env.BUILT_IN_YNV_CONTRACT_ADDRESS;
    expect(ynvAddress).toBe("0x6468648d3949ae1f3d02888515f9b49b8ee1655f");
  });

  it("should have backend USDT contract address", () => {
    const usdtAddress = process.env.BUILT_IN_USDT_CONTRACT_ADDRESS;
    expect(usdtAddress).toBe("0x55d398326f99059fF775485246999027B3197955");
  });
});
