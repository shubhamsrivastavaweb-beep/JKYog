import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

dotenv.config({ path: ".env.local" });


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const client = postgres(connectionString, {
  // Required for compatibility with Supabase transaction pooling.
  prepare: false,

  // Keep the pool small for a serverless application.
  max: 1,
});
export { client };
export const db = drizzle(client);
