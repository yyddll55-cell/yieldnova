import { Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";

/**
 * 매일 자정(KST 00:00 = UTC 15:00) YNV 가격 자동 상승 핸들러
 * 자동 상승 활성화 시: 현재 가격 × 1.015 (1.5% 복리 상승)
 * 자동 상승 비활성화 시: 스킵
 */
export async function priceAutoIncreaseHandler(req: Request, res: Response) {
  try {
    // Cron 인증 확인
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    // 자동 상승 활성화 여부 확인
    const autoSetting = await db.getSystemSetting("price_auto_increase_enabled");
    const isEnabled = autoSetting?.value === "true";

    if (!isEnabled) {
      console.log("[PriceAutoIncrease] Auto increase is disabled. Skipping.");
      return res.json({ ok: true, skipped: "auto-increase-disabled" });
    }

    // 현재 가격 조회
    const today = new Date().toISOString().split("T")[0];
    let currentPrice = await db.getPointPriceForDate(today);
    if (!currentPrice) {
      currentPrice = await db.getLatestPointPrice();
    }

    const currentPriceVal = parseFloat(currentPrice?.priceUSD?.toString() || "0.0006666667");

    // DB에서 자동 상승률 조회 (price_auto_increase_percent)
    const percentSetting = await db.getSystemSetting("price_auto_increase_percent");
    const increasePercent = parseFloat(percentSetting?.value || "1.5");

    // 동적 복리 상승 공식: newPrice = currentPrice * (1 + percent/100)
    const newPrice = currentPriceVal * (1 + increasePercent / 100);

    // 소수점 9자리까지 저장
    const newPriceStr = newPrice.toFixed(9);

    // DB에 오늘 날짜로 새 가격 저장
    await db.setPointPrice(today, newPriceStr);

    console.log(`[PriceAutoIncrease] ${today}: $${currentPriceVal} → $${newPriceStr} (+${increasePercent}%)`);

    return res.json({
      ok: true,
      date: today,
      previousPrice: currentPriceVal,
      newPrice: parseFloat(newPriceStr),
      increasePercent: 1.5,
    });
  } catch (error: any) {
    console.error("[PriceAutoIncrease] Error:", error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
