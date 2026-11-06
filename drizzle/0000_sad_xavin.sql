CREATE TABLE `daily_patience` (
	`user_email` text NOT NULL,
	`date` text NOT NULL,
	`geduld` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_email`, `date`)
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kv_store` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
