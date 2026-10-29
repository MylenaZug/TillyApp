CREATE TABLE IF NOT EXISTS `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`note` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `photos_created_at_idx` ON `photos` (`created_at`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `daily_patience` ADD `server_seq` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `start_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `end_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `server_seq` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `entries_start_at_idx` ON `entries` (`start_at`);--> statement-breakpoint
CREATE INDEX `entries_end_at_idx` ON `entries` (`end_at`);--> statement-breakpoint
CREATE INDEX `entries_server_seq_idx` ON `entries` (`server_seq`);--> statement-breakpoint
ALTER TABLE `kv_store` ADD `server_seq` integer DEFAULT 0 NOT NULL;