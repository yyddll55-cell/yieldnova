CREATE TABLE `binaryTree` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentId` int,
	`leftChildId` int,
	`rightChildId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `binaryTree_id` PRIMARY KEY(`id`),
	CONSTRAINT `binaryTree_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `bonusRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceUserId` int NOT NULL,
	`bonusType` enum('upline','downline') NOT NULL,
	`level` int NOT NULL,
	`bonusPercent` decimal(5,2) NOT NULL DEFAULT '9',
	`bonusAmount` decimal(20,2) NOT NULL,
	`transactionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bonusRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `levelRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`requiredPoints` decimal(20,2) NOT NULL,
	`uplineBonusPercent` decimal(5,2) NOT NULL DEFAULT '9',
	`downlineBonusPercent` decimal(5,2) NOT NULL DEFAULT '9',
	`maxUplineCount` int NOT NULL DEFAULT 5,
	`maxDownlineCount` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `levelRequirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `levelRequirements_level_unique` UNIQUE(`level`)
);
--> statement-breakpoint
CREATE TABLE `pointPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`priceUSD` decimal(18,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pointPrices_id` PRIMARY KEY(`id`),
	CONSTRAINT `pointPrices_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `pointTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdrawal','transfer','bonus_upline','bonus_downline','fee') NOT NULL,
	`amount` decimal(20,2) NOT NULL,
	`relatedUserId` int,
	`transactionHash` varchar(255),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pointTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pointAmount` decimal(20,2) NOT NULL,
	`usdtAmount` decimal(20,2) NOT NULL,
	`fee` decimal(20,2) NOT NULL DEFAULT '0',
	`walletAddress` varchar(42) NOT NULL,
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`rejectionReason` text,
	`transactionHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `walletAddress` varchar(42);--> statement-breakpoint
ALTER TABLE `users` ADD `level` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pointBalance` decimal(20,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referrerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `binaryPosition` enum('left','right') DEFAULT 'left';--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_walletAddress_unique` UNIQUE(`walletAddress`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `binaryTree` (`userId`);--> statement-breakpoint
CREATE INDEX `parentIdx` ON `binaryTree` (`parentId`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `bonusRecords` (`userId`);--> statement-breakpoint
CREATE INDEX `sourceIdx` ON `bonusRecords` (`sourceUserId`);--> statement-breakpoint
CREATE INDEX `dateIdx` ON `pointPrices` (`date`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `pointTransactions` (`userId`);--> statement-breakpoint
CREATE INDEX `typeIdx` ON `pointTransactions` (`type`);--> statement-breakpoint
CREATE INDEX `statusIdx` ON `pointTransactions` (`status`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `withdrawalRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `statusIdx` ON `withdrawalRequests` (`status`);--> statement-breakpoint
CREATE INDEX `walletIdx` ON `users` (`walletAddress`);--> statement-breakpoint
CREATE INDEX `referrerIdx` ON `users` (`referrerId`);