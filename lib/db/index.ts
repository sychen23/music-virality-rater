import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

// In dev, point the serverless driver at the Neon Local proxy (docker compose)
if (process.env.NODE_ENV !== "production") {
  neonConfig.fetchEndpoint = `http://localhost:${process.env.NEON_LOCAL_PORT ?? "5434"}/sql`;
}

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
