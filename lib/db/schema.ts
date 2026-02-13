import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ─── better-auth tables ─────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── App tables ─────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // FK to better-auth user id
  handle: text("handle").unique(),
  credits: integer("credits").notNull().default(20),
  tracksUploaded: integer("tracks_uploaded").notNull().default(0),
  tracksRated: integer("tracks_rated").notNull().default(0),
  ratingProgress: integer("rating_progress").notNull().default(0), // 0-4, resets at 5
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  title: text("title").notNull(),
  audioFilename: text("audio_filename").notNull(),
  duration: real("duration"),
  genreTags: text("genre_tags").array().default([]),
  contextId: text("context_id"),
  status: text("status").notNull().default("draft"), // draft | collecting | complete
  snippetStart: real("snippet_start"),
  snippetEnd: real("snippet_end"),
  votesRequested: integer("votes_requested").notNull().default(0),
  votesReceived: integer("votes_received").notNull().default(0),
  overallScore: real("overall_score"),
  percentile: real("percentile"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  shareToken: text("share_token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id),
    raterId: text("rater_id")
      .notNull()
      .references(() => profiles.id),
    dimension1: integer("dimension_1").notNull(), // 0-3 (No, Kinda, Yes, Very)
    dimension2: integer("dimension_2").notNull(),
    dimension3: integer("dimension_3").notNull(),
    dimension4: integer("dimension_4").notNull(),
    feedback: text("feedback"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("ratings_track_rater_unique").on(t.trackId, t.raterId)]
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  filename: text("filename").notNull().unique(),
  originalName: text("original_name"),
  size: integer("size"),
  consumed: boolean("consumed").notNull().default(false), // true once linked to a track
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  amount: integer("amount").notNull(), // positive = earned, negative = spent
  type: text("type").notNull(), // 'rating_bonus' | 'track_submit' | 'signup_bonus'
  referenceId: text("reference_id"), // track or rating id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
