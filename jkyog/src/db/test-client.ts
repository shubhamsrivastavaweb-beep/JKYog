import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "TEST_DATABASE_URL is missing. Integration tests cannot run.",
  );
}

const testClient = postgres(connectionString, {
  prepare: false,
  max: 5,
  connect_timeout: 10,
  idle_timeout: 20,
});

export const testDb = drizzle(testClient, { schema });

export async function closeTestDb() {
  await testClient.end();
}