CREATE TABLE `student_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`address` text NOT NULL,
	`mobile` text NOT NULL,
	`date_of_birth` text,
	`nationality` text DEFAULT 'Bangladesh' NOT NULL,
	`current_institution` text,
	`photo_storage_key` text,
	`photo_mime_type` text,
	`photo_version` integer DEFAULT 0 NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
