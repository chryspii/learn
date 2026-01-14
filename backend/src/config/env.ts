import process from "node:process";

const isLocal =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test";

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  MONGO_URL: isLocal
    ? "mongodb://localhost:27017/messages"
    : `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@mongo:27017/messages?authSource=admin`,

  REDIS_URL: isLocal
    ? "redis://localhost:6379"
    : `redis://:${process.env.REDIS_PASS}@redis:6379`,

  RABBIT_URL: isLocal
    ? "amqp://localhost"
    : `amqp://${process.env.RABBIT_USER}:${process.env.RABBIT_PASS}@rabbitmq:5672`
}
