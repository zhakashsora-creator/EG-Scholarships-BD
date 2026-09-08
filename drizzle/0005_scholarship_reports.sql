CREATE TABLE `scholarship_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`recipient_email` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`snapshot_json` text NOT NULL,
	`provider_id` text,
	`error_message` text,
	`follow_up_consent` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sent_at` text
);
