import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

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
    dimension1: integer("dimension_1").notNull(), // 1-10
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
