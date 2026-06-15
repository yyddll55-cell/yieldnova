// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title YieldNovaExchange
 * @dev USDT ↔ YNV Point Exchange Contract for YieldNova DeFi System
 * This contract handles USDT deposits and withdrawals only.
 * Internal point management is handled by the backend database.
 */
contract YieldNovaExchange is Ownable, ReentrancyGuard {
    // Token addresses
    IERC20 public usdtToken;
    IERC20 public ynvToken;

    // Exchange rates and settings
    uint256 public exchangeRate; // Points per USDT (e.g., 100 = 1 USDT = 100 Points)
    uint256 public withdrawalFeePercent; // Percentage fee for withdrawals (e.g., 2 = 2%)
    uint256 public minWithdrawalAmount; // Minimum USDT withdrawal amount
    uint256 public maxWithdrawalAmount; // Maximum USDT withdrawal amount per transaction

    // Tracking
    uint256 public totalDeposited; // Total USDT deposited
    uint256 public totalWithdrawn; // Total USDT withdrawn
    mapping(address => uint256) public userDeposits; // Track user deposits
    mapping(address => uint256) public userWithdrawals; // Track user withdrawals

    // Events
    event Deposit(address indexed user, uint256 usdtAmount, uint256 pointAmount);
    event WithdrawalRequested(
        address indexed user,
        uint256 usdtAmount,
        uint256 fee,
        bytes32 withdrawalId
    );
    event WithdrawalCompleted(address indexed user, uint256 usdtAmount, bytes32 withdrawalId);
    event WithdrawalCancelled(address indexed user, bytes32 withdrawalId);
    event ExchangeRateUpdated(uint256 newRate);
    event WithdrawalFeeUpdated(uint256 newFeePercent);
    event MinWithdrawalUpdated(uint256 newMinAmount);
    event MaxWithdrawalUpdated(uint256 newMaxAmount);

    // Withdrawal tracking
    struct WithdrawalRequest {
        address user;
        uint256 usdtAmount;
        uint256 fee;
        uint256 timestamp;
        bool completed;
        bool cancelled;
    }

    mapping(bytes32 => WithdrawalRequest) public withdrawalRequests;
    bytes32[] public withdrawalIds;

    constructor(address _usdtToken, address _ynvToken) {
        require(_usdtToken != address(0), "Invalid USDT token address");
        require(_ynvToken != address(0), "Invalid YNV token address");

        usdtToken = IERC20(_usdtToken);
        ynvToken = IERC20(_ynvToken);

        // Default settings
        exchangeRate = 100; // 1 USDT = 100 Points
        withdrawalFeePercent = 2; // 2% fee
        minWithdrawalAmount = 10 * 10**18; // 10 USDT
        maxWithdrawalAmount = 100000 * 10**18; // 100,000 USDT
    }

    /**
     * @dev User deposits USDT and receives points
     * @param usdtAmount Amount of USDT to deposit
     */
    function depositUSDT(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Deposit amount must be greater than 0");

        // Transfer USDT from user to contract
        require(
            usdtToken.transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed"
        );

        // Calculate points
        uint256 pointAmount = (usdtAmount * exchangeRate) / 10**18;

        // Update tracking
        userDeposits[msg.sender] += usdtAmount;
        totalDeposited += usdtAmount;

        // Emit event (backend will listen and update user points)
        emit Deposit(msg.sender, usdtAmount, pointAmount);
    }

    /**
     * @dev Request USDT withdrawal (backend will verify points and approve)
     * @param usdtAmount Amount of USDT to withdraw
     */
    function requestWithdrawal(uint256 usdtAmount) external nonReentrant returns (bytes32) {
        require(usdtAmount >= minWithdrawalAmount, "Amount below minimum withdrawal");
        require(usdtAmount <= maxWithdrawalAmount, "Amount exceeds maximum withdrawal");

        // Calculate fee
        uint256 fee = (usdtAmount * withdrawalFeePercent) / 100;
        uint256 netAmount = usdtAmount - fee;

        require(netAmount > 0, "Net amount must be greater than 0");

        // Create withdrawal request
        bytes32 withdrawalId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, usdtAmount)
        );

        withdrawalRequests[withdrawalId] = WithdrawalRequest({
            user: msg.sender,
            usdtAmount: netAmount,
            fee: fee,
            timestamp: block.timestamp,
            completed: false,
            cancelled: false
        });

        withdrawalIds.push(withdrawalId);

        // Update tracking
        userWithdrawals[msg.sender] += usdtAmount;

        emit WithdrawalRequested(msg.sender, usdtAmount, fee, withdrawalId);

        return withdrawalId;
    }

    /**
     * @dev Admin completes withdrawal (after backend verification)
     * @param withdrawalId Withdrawal request ID
     */
    function completeWithdrawal(bytes32 withdrawalId) external onlyOwner nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[withdrawalId];

        require(request.user != address(0), "Withdrawal not found");
        require(!request.completed, "Withdrawal already completed");
        require(!request.cancelled, "Withdrawal cancelled");

        // Transfer USDT to user
        require(
            usdtToken.transfer(request.user, request.usdtAmount),
            "USDT transfer failed"
        );

        // Mark as completed
        request.completed = true;
        totalWithdrawn += request.usdtAmount;

        emit WithdrawalCompleted(request.user, request.usdtAmount, withdrawalId);
    }

    /**
     * @dev Admin cancels withdrawal request
     * @param withdrawalId Withdrawal request ID
     */
    function cancelWithdrawal(bytes32 withdrawalId) external onlyOwner {
        WithdrawalRequest storage request = withdrawalRequests[withdrawalId];

        require(request.user != address(0), "Withdrawal not found");
        require(!request.completed, "Withdrawal already completed");
        require(!request.cancelled, "Withdrawal already cancelled");

        request.cancelled = true;

        emit WithdrawalCancelled(request.user, withdrawalId);
    }

    /**
     * @dev Update exchange rate
     * @param newRate New exchange rate (points per USDT)
     */
    function setExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Exchange rate must be greater than 0");
        exchangeRate = newRate;
        emit ExchangeRateUpdated(newRate);
    }

    /**
     * @dev Update withdrawal fee percentage
     * @param newFeePercent New fee percentage
     */
    function setWithdrawalFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 100, "Fee cannot exceed 100%");
        withdrawalFeePercent = newFeePercent;
        emit WithdrawalFeeUpdated(newFeePercent);
    }

    /**
     * @dev Update minimum withdrawal amount
     * @param newMinAmount New minimum amount
     */
    function setMinWithdrawalAmount(uint256 newMinAmount) external onlyOwner {
        minWithdrawalAmount = newMinAmount;
        emit MinWithdrawalUpdated(newMinAmount);
    }

    /**
     * @dev Update maximum withdrawal amount
     * @param newMaxAmount New maximum amount
     */
    function setMaxWithdrawalAmount(uint256 newMaxAmount) external onlyOwner {
        maxWithdrawalAmount = newMaxAmount;
        emit MaxWithdrawalUpdated(newMaxAmount);
    }

    /**
     * @dev Get withdrawal request details
     * @param withdrawalId Withdrawal request ID
     */
    function getWithdrawalRequest(bytes32 withdrawalId)
        external
        view
        returns (WithdrawalRequest memory)
    {
        return withdrawalRequests[withdrawalId];
    }

    /**
     * @dev Get all withdrawal IDs
     */
    function getAllWithdrawalIds() external view returns (bytes32[] memory) {
        return withdrawalIds;
    }

    /**
     * @dev Get pending withdrawal IDs
     */
    function getPendingWithdrawals() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < withdrawalIds.length; i++) {
            WithdrawalRequest storage request = withdrawalRequests[withdrawalIds[i]];
            if (!request.completed && !request.cancelled) {
                count++;
            }
        }

        bytes32[] memory pending = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < withdrawalIds.length; i++) {
            WithdrawalRequest storage request = withdrawalRequests[withdrawalIds[i]];
            if (!request.completed && !request.cancelled) {
                pending[index] = withdrawalIds[i];
                index++;
            }
        }

        return pending;
    }

    /**
     * @dev Emergency withdraw USDT (for contract owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "No USDT to withdraw");
        require(usdtToken.transfer(msg.sender, balance), "Transfer failed");
    }

    /**
     * @dev Get contract USDT balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
}
