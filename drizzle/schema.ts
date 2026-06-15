import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow and Web3 wallet connection.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    walletAddress: varchar("walletAddress", { length: 42 }).unique(), // Ethereum address
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    level: int("level").default(0).notNull(), // 0-4: 0=none, 1-4=level
    currentCycleLevel: int("currentCycleLevel").default(0).notNull(), // 현재 사이클에서 마지막 구매 레벨 (0=미구매, 1-4, 4완료 후 0으로 리셋)
    pointBalance: decimal("pointBalance", { precision: 20, scale: 2 }).default("0").notNull(),
    referralBonusBalance: decimal("referralBonusBalance", { precision: 20, scale: 2 }).default("0").notNull(), // 직추천 보너스 누적 (10%)
    donationBonusBalance: decimal("donationBonusBalance", { precision: 20, scale: 2 }).default("0").notNull(), // 10대 기부 보너스 누적 (8%)
    referrerId: int("referrerId"), // Referrer user ID for binary tree
    binaryPosition: mysqlEnum("binaryPosition", ["left", "right"]).default("left"), // Position in binary tree
    isGhost: boolean("isGhost").default(false).notNull(), // 유령 코드 여부 - true이면 Leg View 및 조직 카운트에서 제외
    stakedBalance: decimal("stakedBalance", { precision: 20, scale: 2 }).default("0").notNull(), // 스테이킹된 YNV 잔액
    rewardBalance: decimal("rewardBalance", { precision: 20, scale: 2 }).default("0").notNull(), // 이자 보상 지갑 (Reward Interest Wallet)
    p2pReceivedBalance: decimal("p2pReceivedBalance", { precision: 20, scale: 2 }).default("0").notNull(), // P2P 수신 YNV (재전송/스테이킹 차단)
    stakedAt: timestamp("stakedAt"), // 스테이킹 시작 시각
    levelUpdatedAt: timestamp("levelUpdatedAt"), // 레벨 진입(큐 등록) 시각 - 원라인 큐 순서 기준
    isCreditAccount: boolean("isCreditAccount").default(false).notNull(), // 외상 계정 여부
    creditOwed: decimal("creditOwed", { precision: 20, scale: 2 }).default("0").notNull(), // 외상 대여금 잔액
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: index("walletIdx").on(table.walletAddress),
    referrerIdx: index("referrerIdx").on(table.referrerId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Binary tree organization structure
 */
export const binaryTree = mysqlTable(
  "binaryTree",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    parentId: int("parentId"), // Parent user ID
    leftChildId: int("leftChildId"), // Left child user ID
    rightChildId: int("rightChildId"), // Right child user ID
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("userIdx").on(table.userId),
    parentIdx: index("parentIdx").on(table.parentId),
  })
);

export type BinaryTree = typeof binaryTree.$inferSelect;
export type InsertBinaryTree = typeof binaryTree.$inferInsert;

/**
 * Point transaction history (deposits, withdrawals, transfers, bonuses)
 */
export const pointTransactions = mysqlTable(
  "pointTransactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: mysqlEnum("type", [
      "deposit", // USDT → Points
      "withdrawal", // Points → USDT
      "transfer", // P2P transfer
      "bonus_direct_referral", // Direct referral 10% bonus
      "bonus_upline_matching", // Upline matching 8% bonus (1-10 levels)
      "fee", // Withdrawal fee
      "admin_deposit", // 어드민 수동 지급
    ]).notNull(),
    amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
    relatedUserId: int("relatedUserId"), // For transfers and bonuses
    transactionHash: varchar("transactionHash", { length: 255 }), // For blockchain transactions
    status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("userIdx").on(table.userId),
    typeIdx: index("typeIdx").on(table.type),
    statusIdx: index("statusIdx").on(table.status),
  })
);

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;

/**
 * Daily point price (set by admin)
 */
export const pointPrices = mysqlTable(
  "pointPrices",
  {
    id: int("id").autoincrement().primaryKey(),
    date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD format
    priceUSD: decimal("priceUSD", { precision: 18, scale: 8 }).notNull(), // Price in USD
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    dateIdx: index("dateIdx").on(table.date),
  })
);

export type PointPrice = typeof pointPrices.$inferSelect;
export type InsertPointPrice = typeof pointPrices.$inferInsert;

/**
 * Withdrawal requests (pending admin approval)
 */
export const withdrawalRequests = mysqlTable(
  "withdrawalRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    pointAmount: decimal("pointAmount", { precision: 20, scale: 2 }).notNull(),
    usdtAmount: decimal("usdtAmount", { precision: 20, scale: 2 }).notNull(),
    fee: decimal("fee", { precision: 20, scale: 2 }).default("0").notNull(),
    walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
    approvedBy: int("approvedBy"), // Admin user ID
    rejectionReason: text("rejectionReason"),
    transactionHash: varchar("transactionHash", { length: 255 }), // Blockchain tx hash
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("userIdx").on(table.userId),
    statusIdx: index("statusIdx").on(table.status),
  })
);

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

/**
 * System settings (managed by admin)
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // e.g., "withdrawal_fee_percent", "min_withdrawal"
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * Bonus distribution records (for tracking upline/downline bonuses)
 */
export const bonusRecords = mysqlTable(
  "bonusRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(), // Recipient of bonus
    sourceUserId: int("sourceUserId").notNull(), // User who triggered the bonus (new member)
    bonusType: mysqlEnum("bonusType", ["direct_referral", "upline_matching"]).notNull(),
    level: int("level").notNull(), // Level in the tree (1 for direct, 1-10 for matching)
    bonusPercent: decimal("bonusPercent", { precision: 5, scale: 2 }).notNull(), // 10% for direct, 8% for matching
    bonusAmount: decimal("bonusAmount", { precision: 20, scale: 2 }).notNull(),
    sourceAmount: decimal("sourceAmount", { precision: 20, scale: 2 }).notNull(), // Amount that triggered the bonus
    transactionId: int("transactionId"), // Related point transaction
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("userIdx").on(table.userId),
    sourceIdx: index("sourceIdx").on(table.sourceUserId),
  })
);

export type BonusRecord = typeof bonusRecords.$inferSelect;
export type InsertBonusRecord = typeof bonusRecords.$inferInsert;

/**
 * Level requirements (configuration)
 */
export const levelRequirements = mysqlTable("levelRequirements", {
  id: int("id").autoincrement().primaryKey(),
  level: int("level").notNull().unique(), // 1-4
  requiredPoints: decimal("requiredPoints", { precision: 20, scale: 2 }).notNull(),
  uplineBonusPercent: decimal("uplineBonusPercent", { precision: 5, scale: 2 }).default("9").notNull(),
  downlineBonusPercent: decimal("downlineBonusPercent", { precision: 5, scale: 2 }).default("9").notNull(),
  maxUplineCount: int("maxUplineCount").default(5).notNull(),
  maxDownlineCount: int("maxDownlineCount").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelRequirement = typeof levelRequirements.$inferSelect;
export type InsertLevelRequirement = typeof levelRequirements.$inferInsert;


/**
 * Withdrawal settings for admin control
 */
export const withdrawalSettings = mysqlTable("withdrawalSettings", {
  id: int("id").autoincrement().primaryKey(),
  minLimit: decimal("minLimit", { precision: 20, scale: 2 }).default("1000").notNull(),
  maxLimit: decimal("maxLimit", { precision: 20, scale: 2 }).default("100000").notNull(),
  isPaused: boolean("isPaused").default(false).notNull(),
  updatedBy: int("updatedBy"), // Admin user ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WithdrawalSetting = typeof withdrawalSettings.$inferSelect;
export type InsertWithdrawalSetting = typeof withdrawalSettings.$inferInsert;

/**
 * P2P token transfers between users
 */
export const p2pTransfers = mysqlTable(
  "p2pTransfers",
  {
    id: int("id").autoincrement().primaryKey(),
    fromUserId: int("fromUserId").notNull(),
    toUserId: int("toUserId").notNull(),
    amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pending", "completed", "failed"]).default("completed").notNull(),
    transactionHash: varchar("transactionHash", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    fromUserIdx: index("fromUserIdx").on(table.fromUserId),
    toUserIdx: index("toUserIdx").on(table.toUserId),
    createdAtIdx: index("createdAtIdx").on(table.createdAt),
  })
);

export type P2PTransfer = typeof p2pTransfers.$inferSelect;
export type InsertP2PTransfer = typeof p2pTransfers.$inferInsert;

/**
 * Virtual node interval settings per level
 * Controls how many real users are placed before a virtual (admin) node is inserted
 */
export const virtualNodeSettings = mysqlTable("virtualNodeSettings", {
  id: int("id").autoincrement().primaryKey(),
  level: int("level").notNull().unique(), // 1-4
  interval: int("interval").notNull().default(10), // Insert virtual node every N real users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VirtualNodeSetting = typeof virtualNodeSettings.$inferSelect;
export type InsertVirtualNodeSetting = typeof virtualNodeSettings.$inferInsert;

/**
 * Staking duration tiers with separate interest rates
 */
export const stakingTiers = mysqlTable("stakingTiers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stakedAmount: decimal("stakedAmount", { precision: 20, scale: 2 }).notNull(),
  durationDays: int("durationDays").notNull(), // 180 or 360
  dailyInterestRate: decimal("dailyInterestRate", { precision: 10, scale: 4 }).notNull(), // Snapshot of rate at staking time
  stakedAt: timestamp("stakedAt").defaultNow().notNull(),
  unstakedAt: timestamp("unstakedAt"), // NULL if still staking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("userIdx").on(table.userId),
  durationIdx: index("durationIdx").on(table.durationDays),
}));

export type StakingTier = typeof stakingTiers.$inferSelect;
export type InsertStakingTier = typeof stakingTiers.$inferInsert;

/**
 * Admin 2FA OTP Secret Storage
 * Stores the base32 OTP secret for Google Authenticator
 * CRITICAL: Do NOT drop or modify this table during migrations
 */
export const adminSecrets = mysqlTable("admin_secrets", {
  id: int("id").autoincrement().primaryKey(),
  adminWalletAddress: varchar("adminWalletAddress", { length: 42 }).notNull().unique(), // Master admin wallet
  otpSecret: varchar("otpSecret", { length: 32 }).notNull(), // Base32 encoded secret
  isEnabled: boolean("isEnabled").default(true).notNull(), // 2FA enabled flag
  backupCodes: text("backupCodes"), // JSON array of backup codes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminSecret = typeof adminSecrets.$inferSelect;
export type InsertAdminSecret = typeof adminSecrets.$inferInsert;
