import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  email: text("email").primaryKey(),
  fullName: text("full_name"),
  profileJson: text("profile_json").notNull().default("{}"),
  completeness: integer("completeness").notNull().default(0),
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
