CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`scholarship_id` text NOT NULL,
	`stage` text DEFAULT 'shortlisted' NOT NULL,
	`next_action` text DEFAULT 'Review eligibility' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_owner_scholarship_idx` ON `applications` (`owner_email`,`scholarship_id`);
