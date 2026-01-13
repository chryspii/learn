import express from "express";
import mongoose from "mongoose";
import amqp from "amqplib";
import { createClient } from "redis";
import { startWebSocketServer, broadcast } from "./ws.js";
import { createRedisPubSub } from "./redisPubSub.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

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

// WebSocket
startWebSocketServer();

// Redis pub/sub
const { sub } = await createRedisPubSub();
sub.subscribe("message-status", msg => {
  broadcast(JSON.parse(msg));
});

// POST message
app.post("/messages", async (req, res) => {
  const doc = await Message.create({
    ...req.body,
    status: "queued",
    retries: 0
  });

  await redis.set(`message:${doc._id}`, "queued");

  channel.sendToQueue(
    "messages",
    Buffer.from(JSON.stringify({ id: doc._id, retries: 0 })),
    { persistent: true }
  );

  res.json(doc);
});

// GET messages
app.get("/messages", async (_, res) => {
  const messages = await Message.find().sort({ _id: -1 });

  const enriched = await Promise.all(
    messages.map(async m => ({
      ...m.toObject(),
      status: (await redis.get(`message:${m._id}`)) ?? m.status
    }))
  );

  res.json(enriched);
});

// DELETE message
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;

  const deleted = await Message.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: "Not found" });

  await redis.del(`message:${id}`);
  await redis.publish(
    "message-status",
    JSON.stringify({ type: "MESSAGE_DELETED", id })
  );

  res.json({ success: true });
});

app.get("/dlq", async (_req, res) => {
  const failed = await Message.find({ status: "failed" }).sort({ updatedAt: -1 });
  res.json(failed);
});

app.post("/dlq/:id/reprocess", async (req, res) => {
  const { id } = req.params;

  const msg = await Message.findById(id);
  if (!msg) {
    return res.status(404).json({ error: "Message not found" });
  }

  // Reset DB state
  msg.status = "queued";
  msg.retries = 0;
  await msg.save();

  // Remove idempotency lock
  await redis.del(`processed:${id}`);

  // Publish back to main queue
  channel.sendToQueue(
    "messages",
    Buffer.from(JSON.stringify({ id, retries: 0 })),
    { persistent: true }
  );

  // Notify UI
  await redis.publish(
    "message-status",
    JSON.stringify({
      type: "MESSAGE_REQUEUED",
      id
    })
  );

  res.json({ success: true });
});

app.listen(3001, () => console.log("API running on :3001"));
