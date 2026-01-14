import process from "node:process";

const isLocal =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  MONGO_URL: isLocal
    ? "mongodb://localhost:27017/messages"
    : required("MONGO_URL"),

  REDIS_URL: isLocal
    ? "redis://localhost:6379"
    : required("REDIS_URL"),

  RABBIT_URL: isLocal
    ? "amqp://localhost"
    : required("RABBIT_URL")
};
