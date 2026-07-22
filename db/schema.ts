import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  email: text("email").primaryKey(),
  fullName: text("full_name"),
  profileJson: text("profile_json").notNull().default("{}"),
  completeness: integer("completeness").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const studentAccounts = sqliteTable("student_accounts", {
  email: text("email").primaryKey(),
  fullName: text("full_name").notNull(),
  address: text("address").notNull(),
  mobile: text("mobile").notNull(),
  dateOfBirth: text("date_of_birth"),
  nationality: text("nationality").notNull().default("Bangladesh"),
  currentInstitution: text("current_institution"),
  photoStorageKey: text("photo_storage_key"),
  photoMimeType: text("photo_mime_type"),
  photoVersion: integer("photo_version").notNull().default(0),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  status: text("status").notNull().default("uploaded"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documentUploads = sqliteTable("document_uploads", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  totalChunks: integer("total_chunks").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documentUploadParts = sqliteTable("document_upload_parts", {
  uploadId: text("upload_id").notNull(),
  partIndex: integer("part_index").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.uploadId, table.partIndex] })]);

export const matches = sqliteTable("matches", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  scholarshipId: text("scholarship_id").notNull(),
  rank: integer("rank").notNull(),
  score: integer("score").notNull(),
  rationale: text("rationale").notNull(),
  gapsJson: text("gaps_json").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const progressEvents = sqliteTable("progress_events", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  stage: text("stage").notNull(),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const consultantRequests = sqliteTable("consultant_requests", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("requested"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  scholarshipId: text("scholarship_id").notNull(),
  stage: text("stage").notNull().default("shortlisted"),
  nextAction: text("next_action").notNull().default("Review eligibility"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
