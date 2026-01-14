import "./config/loadEnv.js";
import { validateEnv } from "./config/validateEnv.js";

validateEnv();

import express from "express";
import { Mongo } from "./servers/Mongo.js";
import { RedisClient } from "./servers/RedisClient.js";
import { WebSocketServer } from "./realtime/WebSocketServer.js";
import { RealtimeBridge } from "./realtime/RealtimeBridge.js";
import { QueuePublisher } from "./servers/QueuePublisher.js";
import { MessageService } from "./services/MessageService.js";
import { MessageController } from "./controllers/MessageController.js";

export async function createApp() {
  const app = express();
  app.use(express.json());

  // CORS (unchanged)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // infra
  await Mongo.connect();
  const redis = await RedisClient.get();

  // realtime
  WebSocketServer.start();
  await RealtimeBridge.start();

  // queue
  const queue = new QueuePublisher();
  await queue.connect();

  // services
  const messageService = new MessageService(redis, queue);
  app.use(MessageController(messageService));

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = await createApp();
  app.listen(3001, () => console.log("API running on :3001"));
}
