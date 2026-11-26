CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`kind` text NOT NULL,
	`units` text NOT NULL,
	`date` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`external_id` text,
	`reversal_of` text,
	`original_kind` text,
	`percent` text,
	`base_units` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_external` ON `entries` (`profile_id`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entry_reversal` ON `entries` (`reversal_of`);--> statement-breakpoint
CREATE TABLE `guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "atomic_revision_guard" CHECK("guards"."ok" = 1)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`viewer_email` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`label` text NOT NULL,
	`asset` text NOT NULL,
	`network` text NOT NULL,
	`balance` text DEFAULT '0' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`price_usd` text,
	`price_date` text,
	`last_date` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_identity` ON `wallets` (`profile_id`,`label`,`asset`,`network`);