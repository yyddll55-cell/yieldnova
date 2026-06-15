CREATE TABLE `admin_secrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminWalletAddress` varchar(42) NOT NULL,
	`otpSecret` varchar(32) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`backupCodes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_secrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_secrets_adminWalletAddress_unique` UNIQUE(`adminWalletAddress`)
);
