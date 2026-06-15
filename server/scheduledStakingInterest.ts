import { Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";

/**
 * 매일 자정 스테이킹 이자 자동 계산 핸들러
 * 활성 스테이킹 티어별로 각 사용자의 durationDays에 따른 이자율로 계산
 * 이자는 rewardBalance에 적립
 */
export async function stakingInterestHandler(req: Request, res: Response) {
  try {
    // Cron 인증 확인
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    // 모든 활성 스테이킹 티어 조회
    const stakingTiers = await db.getAllActiveStakingTiers();

    if (stakingTiers.length === 0) {
      console.log("[StakingInterest] No active staking tiers. Skipping.");
      return res.json({ ok: true, skipped: "no-active-tiers" });
    }

    let processedCount = 0;
    let totalInterestPaid = 0;
    const tierStats: Record<number, { count: number; interest: number }> = {};

    for (const tier of stakingTiers) {
      const stakedAmount = parseFloat(String(tier.stakedAmount || "0"));
      const dailyRate = parseFloat(String(tier.dailyInterestRate || "0")) / 100;

      if (stakedAmount <= 0 || dailyRate <= 0) continue;

      const interest = stakedAmount * dailyRate;
      const user = await db.getUserById(tier.userId);
      if (!user) continue;

      const currentReward = parseFloat(String(user.rewardBalance || "0"));
      await db.updateUserRewardBalance(tier.userId, currentReward + interest);

      processedCount++;
      totalInterestPaid += interest;

      // 기간별 통계
      if (!tierStats[tier.durationDays]) {
        tierStats[tier.durationDays] = { count: 0, interest: 0 };
      }
      tierStats[tier.durationDays].count++;
      tierStats[tier.durationDays].interest += interest;
    }

    const statsSummary = Object.entries(tierStats)
      .map(([days, stats]) => `${days}d: ${stats.count} tiers, ${stats.interest.toFixed(2)} YNV`)
      .join(" | ");

    console.log(
      `[StakingInterest] Processed ${processedCount} staking tiers | Total paid: ${totalInterestPaid.toLocaleString()} YNV | ${statsSummary}`
    );

    return res.json({
      ok: true,
      processedCount,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      tierStats,
    });
  } catch (error: any) {
    console.error("[StakingInterest] Error:", error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
