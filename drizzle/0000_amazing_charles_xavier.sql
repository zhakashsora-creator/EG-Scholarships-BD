CREATE TABLE `consultant_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`scholarship_id` text NOT NULL,
	`rank` integer NOT NULL,
	`score` integer NOT NULL,
	`rationale` text NOT NULL,
	`gaps_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`stage` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`email` text PRIMARY KEY NOT NULL,
	`full_name` text,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`completeness` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
