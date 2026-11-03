import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

if (!process.env.TEST_DIRECT_URL) {
  throw new Error("TEST_DIRECT_URL is missing from .env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.TEST_DIRECT_URL,
  },
  strict: true,
  verbose: true,
});