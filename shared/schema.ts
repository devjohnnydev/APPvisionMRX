import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  real,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - supports both Replit Auth and email/password auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // For email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // "user" or "admin"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scanned boards table
export const scannedBoards = pgTable("scanned_boards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  boardType: varchar("board_type").notNull(),
  category: varchar("category").notNull().default("Unknown"), // TV, notebook, radio, etc.
  deviceType: varchar("device_type").notNull().default("Unknown"), // main board, power board, etc.
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  confidence: real("confidence").notNull(), // AI confidence score 0-1
  imageUrl: text("image_url"), // Base64 or file path
  location: varchar("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Board names table for admin management
export const boardNames = pgTable("board_names", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boardType: varchar("board_type").notNull().unique(),
  category: varchar("category").notNull(),
  deviceType: varchar("device_type").notNull(),
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScannedBoardSchema = createInsertSchema(scannedBoards).omit({
  id: true,
  createdAt: true,
});

export const insertBoardNameSchema = createInsertSchema(boardNames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial();
export const updateBoardNameSchema = insertBoardNameSchema.partial();

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ScannedBoard = typeof scannedBoards.$inferSelect;
export type InsertScannedBoard = z.infer<typeof insertScannedBoardSchema>;
export type BoardName = typeof boardNames.$inferSelect;
export type InsertBoardName = z.infer<typeof insertBoardNameSchema>;
export type UpdateBoardName = z.infer<typeof updateBoardNameSchema>;
