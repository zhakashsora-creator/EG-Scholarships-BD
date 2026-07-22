CREATE TABLE `document_upload_parts` (
	`upload_id` text NOT NULL,
	`part_index` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`upload_id`, `part_index`)
);
--> statement-breakpoint
CREATE TABLE `document_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`total_chunks` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
