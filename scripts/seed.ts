import { db } from "@/lib/db";
import { user, profiles, tracks, uploads } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const AUDIO_FILES = [
  "uploads/1770875652581-e4n7zu.m4a",
  "uploads/1770774519436-orx0x4.m4a",
  "uploads/1770774611603-oyj1bf.m4a",
  "uploads/1770774619057-hzicat.m4a",
  "uploads/1770774713966-xwppkq.m4a",
  "uploads/1770775410599-9aagdb.m4a",
  "uploads/1770775498769-qjkycz.m4a",
];

const USERS = [
  { id: "seed-user-1", name: "Alex Rivera", email: "alex@seed.local" },
  { id: "seed-user-2", name: "Jordan Lee", email: "jordan@seed.local" },
  { id: "seed-user-3", name: "Sam Taylor", email: "sam@seed.local" },
];

const TRACKS = [
  { title: "Neon Nights",      contextId: "tiktok",  userId: "seed-user-1" },
  { title: "Velvet Echo",      contextId: "spotify",  userId: "seed-user-1" },
  { title: "Concrete Jungle",  contextId: "radio",    userId: "seed-user-2" },
  { title: "Solar Flare",      contextId: "sync",     userId: "seed-user-2" },
  { title: "Drift Away",       contextId: "tiktok",   userId: "seed-user-3" },
  { title: "Midnight Oil",     contextId: "spotify",  userId: "seed-user-3" },
  { title: "Crystal Clear",    contextId: "radio",    userId: "seed-user-1" },
];

function randomShareToken() {
  return Math.random().toString(36).substring(2, 10);
}

async function seed() {
  console.log("Seeding database...");

  // Insert users (better-auth format)
  for (const u of USERS) {
    await db
      .insert(user)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: false,
      })
      .onConflictDoNothing();
  }
  console.log(`  Inserted ${USERS.length} users`);

  // Insert matching profiles
  for (const u of USERS) {
    await db
      .insert(profiles)
      .values({
        id: u.id,
        handle: u.name.toLowerCase().replace(/\s+/g, ""),
        credits: 20,
      })
      .onConflictDoNothing();
  }
  console.log(`  Inserted ${USERS.length} profiles`);

  // Insert tracks + uploads
  for (let i = 0; i < TRACKS.length; i++) {
    const t = TRACKS[i];
    const audioFile = AUDIO_FILES[i];
    const shareToken = randomShareToken();

    const [inserted] = await db
      .insert(tracks)
      .values({
        userId: t.userId,
        title: t.title,
        audioFilename: audioFile,
        contextId: t.contextId,
        status: "collecting",
        snippetStart: 5,
        snippetEnd: 25,
        votesRequested: 20,
        votesReceived: 0,
        shareToken,
      })
      .returning({ id: tracks.id });

    // Matching upload entry (consumed)
    await db.insert(uploads).values({
      userId: t.userId,
      filename: audioFile,
      originalName: `${t.title.toLowerCase().replace(/\s+/g, "-")}.m4a`,
      size: 500000,
      consumed: true,
    });

    console.log(`  Track "${t.title}" (${t.contextId}) -> ${inserted.id}`);
  }

  console.log("Done! Seeded 3 users + 7 tracks.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
