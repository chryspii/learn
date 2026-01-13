import mongoose from "mongoose";
import amqp from "amqplib";
import { createClient } from "redis";

const MAX_RETRIES = 3;

// MongoDB
await mongoose.connect("mongodb://localhost:27017/messages");

const Message = mongoose.model("Message", {
  name: String,
  subject: String,
  message: String,
  status: String,
  retries: Number
});

// Redis
const redis = createClient();
await redis.connect();

// RabbitMQ
const conn = await amqp.connect("amqp://localhost");
const channel = await conn.createChannel();

if (process.env.NODE_ENV !== "production") {
  await channel.deleteQueue("messages").catch(() => {});
  await channel.deleteQueue("messages.retry").catch(() => {});
  await channel.deleteQueue("messages.dlq").catch(() => {});
}

await channel.assertExchange("messages.dlx", "direct", { durable: true });

await channel.assertQueue("messages", {
  durable: true,
  deadLetterExchange: "messages.dlx",
  deadLetterRoutingKey: "retry"
});

await channel.assertQueue("messages.retry", {
  durable: true,
  messageTtl: 5000,
  deadLetterExchange: "",
  deadLetterRoutingKey: "messages"
});

await channel.assertQueue("messages.dlq", { durable: true });

await channel.bindQueue("messages.retry", "messages.dlx", "retry");
await channel.bindQueue("messages.dlq", "messages.dlx", "dlq");

channel.prefetch(1);

console.log("Worker running with retry + DLQ");

channel.consume("messages", async msg => {
  if (!msg) {
    console.warn("Consumer cancelled");
    return;
  }

  let payload;

  try {
    payload = JSON.parse(msg.content.toString());
  } catch (e) {
    console.error("Invalid JSON");
    channel.nack(msg, false, false);

    return;
  }

  const { id, retries = 0 } = payload;

  try {
    const firstTime = await redis.set(`processed:${id}`, "1", "NX", "EX", 3600);

    if (!firstTime) {
      console.log(`Message ${id} already processed, skipping`);
      channel.ack(msg);
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      const random = Math.random()
      console.log(random)
      if (random < 0.3) {
        throw new Error("Random failure");
      }
    }

    await Message.findByIdAndUpdate(
      id,
      {
        status: "stored",
        retries
      },
      { upsert: true }
    );

    await redis.set(`message:${id}`, "stored");
    await redis.publish(
      "message-status",
      JSON.stringify({ type: "MESSAGE_STORED", id })
    );

    channel.ack(msg);
  } catch (err) {
    console.error("Worker error:", err);
  
    if (retries >= MAX_RETRIES) {
      await Message.findByIdAndUpdate(id, {
        status: "failed",
        retries
      });

      await redis.set(`message:${id}`, "failed");
      await redis.publish(
        "message-status",
        JSON.stringify({ type: "MESSAGE_FAILED", id })
      );

      channel.publish(
        "messages.dlx",
        "dlq",
        Buffer.from(JSON.stringify({ id, retries }))
      );

      channel.ack(msg);
      return;
    }

    channel.publish(
      "messages.dlx",
      "retry",
      Buffer.from(JSON.stringify({ id, retries: retries + 1 })),
      { persistent: true }
    );

    const nextRetries = retries + 1
    await Message.findByIdAndUpdate(
      id,
      {
        status: "retrying",
        retries: nextRetries
      },
      { upsert: true }
    );

    await redis.set(`message:${id}`, "retrying");
    await redis.publish(
      "message-status",
      JSON.stringify({
        type: "MESSAGE_RETRY",
        id,
      })
    );

    channel.publish(
      "messages.dlx",
      "retry",
      Buffer.from(JSON.stringify({ id, retries: nextRetries })),
      { persistent: true }
    );

    channel.ack(msg);
  }
});
