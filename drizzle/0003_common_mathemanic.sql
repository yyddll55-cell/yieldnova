CREATE TABLE `p2pTransfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`amount` decimal(20,2) NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
	`transactionHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `p2pTransfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minLimit` decimal(20,2) NOT NULL DEFAULT '1000',
	`maxLimit` decimal(20,2) NOT NULL DEFAULT '100000',
	`isPaused` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawalSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `fromUserIdx` ON `p2pTransfers` (`fromUserId`);--> statement-breakpoint
CREATE INDEX `toUserIdx` ON `p2pTransfers` (`toUserId`);--> statement-breakpoint
CREATE INDEX `createdAtIdx` ON `p2pTransfers` (`createdAt`);