import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  real,
  boolean,
  integer,
  date,
  numeric
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

// User activity sessions table - tracks time spent in app
export const userSessions = pgTable(
  "user_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"), // null while session is active
    durationSeconds: integer("duration_seconds"), // computed when session ends
    activityDate: date("activity_date").notNull().default(sql`CURRENT_DATE`), // for daily grouping
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_user_sessions_user_activity").on(table.userId, table.activityDate),
    index("IDX_user_sessions_started_at").on(table.startedAt),
  ],
);

// Lots table for grouping scanned boards into batches
export const lots = pgTable(
  "lots",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull().unique(), // lot code/name - unique
    status: varchar("status").notNull().default("open"), // "open" or "closed"
    description: text("description"),
    createdBy: varchar("created_by").notNull().references(() => users.id),
    totalWeight: real("total_weight").default(0), // sum of all boards weight
    totalValue: numeric("total_value", { precision: 12, scale: 2 }).default("0"), // sum of all boards value
    itemCount: integer("item_count").default(0), // number of boards in lot
    createdAt: timestamp("created_at").defaultNow(),
    closedAt: timestamp("closed_at"), // when lot was closed
  },
  (table) => [
    index("IDX_lots_status").on(table.status),
    index("IDX_lots_created_at").on(table.createdAt),
    index("IDX_lots_created_by").on(table.createdBy),
  ],
);

// Scanned boards table - enhanced with weight/price fields
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
  // New weight and pricing fields
  weightKg: real("weight_kg"), // weight in kilograms
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }), // price per kilogram
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }), // computed: weightKg * pricePerKg
  lotId: varchar("lot_id").references(() => lots.id, { onDelete: "set null" }), // optional lot assignment
  createdAt: timestamp("created_at").defaultNow(),
},
(table) => [
  index("IDX_scanned_boards_user_id").on(table.userId),
  index("IDX_scanned_boards_lot_id").on(table.lotId),
  index("IDX_scanned_boards_created_at").on(table.createdAt),
],
);

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

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  durationSeconds: true, // computed field
});

export const insertLotSchema = createInsertSchema(lots).omit({
  id: true,
  createdAt: true,
  totalWeight: true, // computed field
  totalValue: true, // computed field
  itemCount: true, // computed field
});

export const insertScannedBoardSchema = createInsertSchema(scannedBoards).omit({
  id: true,
  createdAt: true,
  totalPrice: true, // computed field
});

export const insertBoardNameSchema = createInsertSchema(boardNames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial();
export const updateUserSessionSchema = insertUserSessionSchema.partial();
export const updateLotSchema = insertLotSchema.partial();
export const updateBoardNameSchema = insertBoardNameSchema.partial();
export const updateScannedBoardSchema = insertScannedBoardSchema.partial();

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UpdateUserSession = z.infer<typeof updateUserSessionSchema>;

export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type UpdateLot = z.infer<typeof updateLotSchema>;

export type ScannedBoard = typeof scannedBoards.$inferSelect;
export type InsertScannedBoard = z.infer<typeof insertScannedBoardSchema>;
export type UpdateScannedBoard = z.infer<typeof updateScannedBoardSchema>;

export type BoardName = typeof boardNames.$inferSelect;
export type InsertBoardName = z.infer<typeof insertBoardNameSchema>;
export type UpdateBoardName = z.infer<typeof updateBoardNameSchema>;
