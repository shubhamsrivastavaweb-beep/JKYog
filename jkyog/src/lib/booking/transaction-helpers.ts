import { createHash, randomUUID } from "node:crypto";
import type { CreateBookingInput } from "./request-schema";

export function createRequestHash(input: CreateBookingInput): string {
  const { idempotencyKey, ...request } = input;

  return createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
}

export function createBookingNumber(): string {
  return `SHU-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
}