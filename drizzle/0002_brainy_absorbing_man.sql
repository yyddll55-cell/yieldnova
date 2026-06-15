ALTER TABLE `bonusRecords` MODIFY COLUMN `bonusType` enum('direct_referral','upline_matching') NOT NULL;--> statement-breakpoint
ALTER TABLE `bonusRecords` MODIFY COLUMN `bonusPercent` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `pointTransactions` MODIFY COLUMN `type` enum('deposit','withdrawal','transfer','bonus_direct_referral','bonus_upline_matching','fee') NOT NULL;--> statement-breakpoint
ALTER TABLE `bonusRecords` ADD `sourceAmount` decimal(20,2) NOT NULL;