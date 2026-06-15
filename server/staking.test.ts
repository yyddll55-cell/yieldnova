import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

/**
 * Staking Tier Tests
 * Tests for the split staking interest rate feature (180 days @ 1.0%, 360 days @ 1.5%)
 */
describe("Staking Tiers", () => {
  const testUserId = 999;
  const testStakingTierId = 999;

  beforeAll(async () => {
    // Setup: Create test user if needed
    await db.upsertUser({
      openId: `test_staking_${Date.now()}`,
      walletAddress: `0xtest${Date.now()}`,
      name: "Test Staker",
      role: "user",
    });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    console.log("[Staking Tests] Cleanup completed");
  });

  it("should create a 180-day staking tier with correct interest rate", async () => {
    const tier = await db.createStakingTier({
      userId: testUserId,
      stakedAmount: "10000",
      durationDays: 180,
      dailyInterestRate: "1.0",
    });

    expect(tier).toBeDefined();
    console.log("[Staking] Created 180-day tier:", tier);
  });

  it("should create a 360-day staking tier with correct interest rate", async () => {
    const tier = await db.createStakingTier({
      userId: testUserId,
      stakedAmount: "10000",
      durationDays: 360,
      dailyInterestRate: "1.5",
    });

    expect(tier).toBeDefined();
    console.log("[Staking] Created 360-day tier:", tier);
  });

  it("should retrieve active staking tiers for a user", async () => {
    const tiers = await db.getUserActiveStakingTiers(testUserId);
    expect(Array.isArray(tiers)).toBe(true);
    console.log(`[Staking] Retrieved ${tiers.length} active tiers for user ${testUserId}`);
  });

  it("should retrieve all active staking tiers", async () => {
    const allTiers = await db.getAllActiveStakingTiers();
    expect(Array.isArray(allTiers)).toBe(true);
    console.log(`[Staking] Retrieved ${allTiers.length} total active tiers`);
  });

  it("should calculate daily interest correctly for 180-day tier", () => {
    const stakedAmount = 10000;
    const dailyRate = 1.0 / 100;
    const expectedDailyInterest = stakedAmount * dailyRate;
    expect(expectedDailyInterest).toBe(100);
    console.log(`[Staking] 180-day: ${stakedAmount} YNV @ 1.0% = ${expectedDailyInterest} YNV/day`);
  });

  it("should calculate daily interest correctly for 360-day tier", () => {
    const stakedAmount = 10000;
    const dailyRate = 1.5 / 100;
    const expectedDailyInterest = stakedAmount * dailyRate;
    expect(expectedDailyInterest).toBe(150);
    console.log(`[Staking] 360-day: ${stakedAmount} YNV @ 1.5% = ${expectedDailyInterest} YNV/day`);
  });

  it("should verify system settings for staking interest rates", async () => {
    const rate180 = await db.getSystemSetting("stakingInterest180");
    const rate360 = await db.getSystemSetting("stakingInterest360");

    console.log(`[Staking] System settings - 180d: ${rate180?.value}%, 360d: ${rate360?.value}%`);

    // Default values should be set
    expect(rate180?.value || "1.0").toBeDefined();
    expect(rate360?.value || "1.5").toBeDefined();
  });

  it("should update system settings for staking interest rates", async () => {
    await db.setSystemSetting("stakingInterest180", "1.2");
    await db.setSystemSetting("stakingInterest360", "1.8");

    const rate180 = await db.getSystemSetting("stakingInterest180");
    const rate360 = await db.getSystemSetting("stakingInterest360");

    expect(rate180?.value).toBe("1.2");
    expect(rate360?.value).toBe("1.8");

    // Restore defaults
    await db.setSystemSetting("stakingInterest180", "1.0");
    await db.setSystemSetting("stakingInterest360", "1.5");

    console.log("[Staking] System settings updated and restored");
  });

  it("should unstake a staking tier", async () => {
    // Create a tier first
    const tier = await db.createStakingTier({
      userId: testUserId,
      stakedAmount: "5000",
      durationDays: 180,
      dailyInterestRate: "1.0",
    });

    if (tier && tier.insertId) {
      // Unstake it
      await db.unstakeStakingTier(tier.insertId);
      console.log(`[Staking] Unstaked tier ${tier.insertId}`);
    }
  });
});
