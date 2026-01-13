import { Mongo } from "./servers/Mongo.js";
import { RedisClient } from "./servers/RedisClient.js";
import { QueueManager } from "./servers/QueueManager.js";
import { MessageProcessor } from "./services/MessageProcessor.js";

await Mongo.connect();

const redis = await RedisClient.get();

const queue = new QueueManager();
const channel = await queue.connect();

await queue.setupQueues();

const processor = new MessageProcessor(redis);

console.log("Worker running");

queue.consume("messages", async (msg, ch) => {
  await processor.handle(msg, ch);
});
