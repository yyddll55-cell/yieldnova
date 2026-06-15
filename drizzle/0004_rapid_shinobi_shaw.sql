CREATE TABLE `stakingTiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stakedAmount` decimal(20,2) NOT NULL,
	`durationDays` int NOT NULL,
	`dailyInterestRate` decimal(10,4) NOT NULL,
	`stakedAt` timestamp NOT NULL DEFAULT (now()),
	`unstakedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stakingTiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `virtualNodeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`interval` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `virtualNodeSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `virtualNodeSettings_level_unique` UNIQUE(`level`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `currentCycleLevel` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referralBonusBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `donationBonusBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isGhost` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stakedBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `rewardBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `p2pReceivedBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stakedAt` timestamp;--> statement-breakpoint
CREATE INDEX `userIdx` ON `stakingTiers` (`userId`);--> statement-breakpoint
CREATE INDEX `durationIdx` ON `stakingTiers` (`durationDays`);