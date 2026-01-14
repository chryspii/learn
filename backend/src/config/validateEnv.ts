import { env } from "./env.js";

export function validateEnv(): void {
  if (env.NODE_ENV === "production") {
    if (!env.MONGO_URL) throw new Error("MONGO_URL missing");
    if (!env.REDIS_URL) throw new Error("REDIS_URL missing");
    if (!env.RABBIT_URL) throw new Error("RABBIT_URL missing");
  }
}
