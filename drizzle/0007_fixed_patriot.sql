ALTER TABLE `users` ADD `isCreditAccount` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditOwed` decimal(20,2) DEFAULT '0' NOT NULL;