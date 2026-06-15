# YieldNova 스마트컨트랙트 배포 및 통합 가이드

## 개요

YieldNova DeFi 시스템은 BSC(Binance Smart Chain) 메인넷에서 USDT와 YNV 토큰을 관리하는 스마트컨트랙트를 사용합니다. 이 가이드는 컨트랙트 배포 및 프론트엔드 통합 방법을 설명합니다.

## 토큰 정보

| 항목 | 값 |
|------|-----|
| **YNV 토큰** | 0x6468648d3949ae1f3d02888515f9b49b8ee1655f |
| **USDT 토큰** | 0x55d398326f99059fF775485246999027B3197955 |
| **네트워크** | BSC 메인넷 (Chain ID: 56) |
| **RPC URL** | https://bsc-dataseed1.binance.org:443 |

## 스마트컨트랙트 배포

### 1. 준비 사항

```bash
# Hardhat 설치
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 프로젝트 초기화
npx hardhat
```

### 2. 컨트랙트 배포 스크립트

`scripts/deploy.js` 파일 생성:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying YieldNovaExchange...");

  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
  const YNV_ADDRESS = "0x6468648d3949ae1f3d02888515f9b49b8ee1655f";

  const YieldNovaExchange = await hre.ethers.getContractFactory("YieldNovaExchange");
  const exchange = await YieldNovaExchange.deploy(USDT_ADDRESS, YNV_ADDRESS);

  await exchange.deployed();

  console.log("YieldNovaExchange deployed to:", exchange.address);
  console.log("\n=== 배포 정보 ===");
  console.log("컨트랙트 주소:", exchange.address);
  console.log("USDT 토큰:", USDT_ADDRESS);
  console.log("YNV 토큰:", YNV_ADDRESS);
  console.log("네트워크: BSC 메인넷");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. Hardhat 설정

`hardhat.config.js` 파일:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    bsc: {
      url: "https://bsc-dataseed1.binance.org:443",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 56,
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
};
```

### 4. 배포 실행

```bash
# .env 파일 생성 (개인 키 추가)
echo "PRIVATE_KEY=your_private_key_here" > .env
echo "BSCSCAN_API_KEY=your_bscscan_api_key" >> .env

# BSC 메인넷에 배포
npx hardhat run scripts/deploy.js --network bsc
```

### 5. 컨트랙트 검증 (선택사항)

```bash
npx hardhat verify --network bsc DEPLOYED_CONTRACT_ADDRESS \
  "0x55d398326f99059fF775485246999027B3197955" \
  "0x6468648d3949ae1f3d02888515f9b49b8ee1655f"
```

## 프론트엔드 통합

### 1. 환경 변수 설정

배포 후 `.env.local` 파일에 컨트랙트 주소 추가:

```env
VITE_EXCHANGE_CONTRACT_ADDRESS=0x[배포된_컨트랙트_주소]
VITE_YNV_CONTRACT_ADDRESS=0x6468648d3949ae1f3d02888515f9b49b8ee1655f
VITE_USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
VITE_BSC_RPC_URL=https://bsc-dataseed1.binance.org:443
VITE_BSC_CHAIN_ID=56
```

### 2. 컨트랙트 ABI 추가

`client/src/lib/contractABI.ts`:

```typescript
export const YIELD_NOVA_EXCHANGE_ABI = [
  "function depositUSDT(uint256 usdtAmount) external",
  "function requestWithdrawal(uint256 usdtAmount) external returns (bytes32)",
  "function getWithdrawalRequest(bytes32 withdrawalId) external view returns (tuple(address user, uint256 usdtAmount, uint256 fee, uint256 timestamp, bool completed, bool cancelled))",
  "function exchangeRate() external view returns (uint256)",
  "function withdrawalFeePercent() external view returns (uint256)",
  "event Deposit(address indexed user, uint256 usdtAmount, uint256 pointAmount)",
  "event WithdrawalRequested(address indexed user, uint256 usdtAmount, uint256 fee, bytes32 withdrawalId)",
];
```

### 3. 입금 처리 (USDT → Points)

```typescript
import { ethers } from "ethers";

async function depositUSDT(amount: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // USDT 컨트랙트 승인
  const usdtContract = new ethers.Contract(
    USDT_ADDRESS,
    ERC20_ABI,
    signer
  );
  
  const approveTx = await usdtContract.approve(
    EXCHANGE_CONTRACT_ADDRESS,
    ethers.parseUnits(amount, 18)
  );
  await approveTx.wait();
  
  // 입금 실행
  const exchangeContract = new ethers.Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    YIELD_NOVA_EXCHANGE_ABI,
    signer
  );
  
  const depositTx = await exchangeContract.depositUSDT(
    ethers.parseUnits(amount, 18)
  );
  
  const receipt = await depositTx.wait();
  return receipt.transactionHash;
}
```

### 4. 출금 요청 처리

```typescript
async function requestWithdrawal(amount: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const exchangeContract = new ethers.Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    YIELD_NOVA_EXCHANGE_ABI,
    signer
  );
  
  const tx = await exchangeContract.requestWithdrawal(
    ethers.parseUnits(amount, 18)
  );
  
  const receipt = await tx.wait();
  return receipt.transactionHash;
}
```

## 백엔드 통합

### 1. 컨트랙트 이벤트 리스닝

`server/web3-listener.ts`:

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.VITE_BSC_RPC_URL);
const exchangeContract = new ethers.Contract(
  process.env.VITE_EXCHANGE_CONTRACT_ADDRESS!,
  YIELD_NOVA_EXCHANGE_ABI,
  provider
);

// Deposit 이벤트 리스닝
exchangeContract.on("Deposit", async (user, usdtAmount, pointAmount, event) => {
  console.log(`Deposit: ${user} deposited ${usdtAmount} USDT`);
  
  // 데이터베이스에 포인트 추가
  const userRecord = await db.getUserByWalletAddress(user);
  if (userRecord) {
    const newBalance = parseFloat(userRecord.pointBalance.toString()) + parseFloat(pointAmount.toString());
    await db.updateUserPointBalance(userRecord.id, newBalance);
    
    // 보너스 분배
    await distributeDepositBonuses(userRecord.id, parseFloat(pointAmount.toString()));
  }
});

// WithdrawalRequested 이벤트 리스닝
exchangeContract.on("WithdrawalRequested", async (user, usdtAmount, fee, withdrawalId, event) => {
  console.log(`Withdrawal requested: ${user} requested ${usdtAmount} USDT`);
  
  // 데이터베이스에 출금 요청 기록
  const userRecord = await db.getUserByWalletAddress(user);
  if (userRecord) {
    // 포인트 차감 (출금 대기 상태)
    const pointAmount = usdtAmount / getCurrentPointPrice();
    const newBalance = parseFloat(userRecord.pointBalance.toString()) - pointAmount;
    await db.updateUserPointBalance(userRecord.id, newBalance);
  }
});
```

## 관리자 기능

### 1. 환율 설정

```typescript
async function setExchangeRate(newRate: number) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const exchangeContract = new ethers.Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    YIELD_NOVA_EXCHANGE_ABI,
    signer
  );
  
  const tx = await exchangeContract.setExchangeRate(newRate);
  await tx.wait();
}
```

### 2. 출금 수수료 설정

```typescript
async function setWithdrawalFee(feePercent: number) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const exchangeContract = new ethers.Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    YIELD_NOVA_EXCHANGE_ABI,
    signer
  );
  
  const tx = await exchangeContract.setWithdrawalFeePercent(feePercent);
  await tx.wait();
}
```

### 3. 출금 승인

```typescript
async function completeWithdrawal(withdrawalId: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const exchangeContract = new ethers.Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    YIELD_NOVA_EXCHANGE_ABI,
    signer
  );
  
  const tx = await exchangeContract.completeWithdrawal(withdrawalId);
  await tx.wait();
}
```

## 보안 고려사항

1. **개인 키 관리**: 절대 개인 키를 코드에 하드코딩하지 마세요. 환경 변수 사용
2. **컨트랙트 감사**: 배포 전에 보안 감사 수행 권장
3. **테스트넷 테스트**: BSC 테스트넷에서 먼저 테스트 후 메인넷 배포
4. **ReentrancyGuard**: 컨트랙트는 ReentrancyGuard를 사용하여 재진입 공격 방지

## 문제 해결

### 가스 부족 에러
- BNB 잔액 확인
- 가스 가격 조정

### 트랜잭션 실패
- 네트워크 연결 확인
- 컨트랙트 주소 정확성 확인
- USDT 승인 여부 확인

### 이벤트 리스닝 안 됨
- RPC URL 정확성 확인
- 컨트랙트 주소 정확성 확인
- 네트워크 연결 상태 확인

## 참고 자료

- [Hardhat 문서](https://hardhat.org/)
- [ethers.js 문서](https://docs.ethers.org/)
- [BSC 문서](https://docs.binance.org/)
- [OpenZeppelin 컨트랙트](https://docs.openzeppelin.com/contracts/)
