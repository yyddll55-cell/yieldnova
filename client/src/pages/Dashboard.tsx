import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// BSC USDT 및 마케팅 게이트웨이 컨트랙트 주소 설정
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
const GATEWAY_ADDRESS = "0x55d398326f99059ff775485246999027b3197955"; // 실제 배포된 컨트랙트 주소로 대체 가능

const erc20Abi = ["function approve(address spender, uint256 amount) external returns (bool)"];
const gatewayAbi = ["function depositUSDT(uint256 _amount) external"];

export default function Dashboard() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);

  // 페이지 로드 시 지갑이 이미 연결되어 있는지 자동 확인 (크레딧 절감 및 UX 향상)
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const currentSigner = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(currentSigner);
          setAccount(accounts[0]);
        }
      }
    };
    checkConnection();
  }, []);

  // 지갑 연결 함수
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const currentSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(currentSigner);
        setAccount(accounts[0]);
        alert("지갑 연결 성공!");
      } catch (err) {
        console.error(err);
        alert("지갑 연결에 실패했습니다.");
      }
    } else {
      alert("토큰포켓 DApp 브라우저로 접속하거나 메타마스크를 설치해주세요.");
    }
  };

  // 레벨업 기부 및 투자 기능 (USDT 입금)
  const buyLevel = async (amount: number) => {
    if (!signer) return alert("지갑을 먼저 연결해 주세요.");
    const parsedAmount = ethers.parseUnits(amount.toString(), 18);

    try {
      const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20Abi, signer);
      const gatewayContract = new ethers.Contract(GATEWAY_ADDRESS, gatewayAbi, signer);

      alert("1단계: USDT 사용 승인(Approve)을 진행합니다.");
      const tx1 = await usdtContract.approve(GATEWAY_ADDRESS, parsedAmount);
      await tx1.wait();

      alert("2단계: 레벨업 기부 입금(Deposit)을 진행합니다.");
      const tx2 = await gatewayContract.depositUSDT(parsedAmount);
      await tx2.wait();

      alert("입금 완료! 전산 포인트는 잠시 후 자동으로 충전됩니다.");
    } catch (err) {
      console.error(err);
      alert("트랜잭션이 거부되었거나 실패했습니다.");
    }
  };

  // 지갑 주소 생략 표기 함수
  const formatAddress = (addr: string) => {
    return addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
  };

  return (
    <div style={{ backgroundColor: '#060b13', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#00bfff' }}>YieldNova</h2>
        <button 
          onClick={connectWallet} 
          style={{ backgroundColor: '#009bf2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {account ? formatAddress(account) : "지갑 연결"}
        </button>
      </div>

      
      <div style={{ border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', marginBottom: '20px', backgroundColor: '#0f172a' }}>
        <p style={{ color: '#94a3b8' }}>일드노바 (DSHIB)</p>
        <h1 style={{ color: '#00bfff', margin: '10px 0' }}>0</h1>
        <p style={{ color: '#64748b' }}>≈ ₩0</p>
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', backgroundColor: '#0f172a' }}>
        <p style={{ color: '#94a3b8' }}>현재 레벨</p>
        <h1 style={{ color: '#00bfff', margin: '10px 0' }}>0</h1>
        <p style={{ color: '#64748b' }}>미참여</p>
      </div>

      
      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <button onClick={() => buyLevel(30000)} style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '15px', borderRadius: '8px', cursor: 'pointer' }}>
          1레벨 신청 (30,000 USDT)
        </button>
        <button onClick={() => buyLevel(50000)} style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '15px', borderRadius: '8px', cursor: 'pointer' }}>
          2레벨 신청 (50,000 USDT)
        </button>
      </div>
    </div>
  );
}
