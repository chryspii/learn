import { Channel, ConsumeMessage } from "amqplib";
import { Message } from "../models/MessageModel.js";
import { RedisClient } from "../servers/RedisClient.js";

const MAX_RETRIES = 3;

export class MessageProcessor {
  private redis;

  constructor(redis: Awaited<ReturnType<typeof RedisClient.get>>) {
    this.redis = redis;
  }

  async handle(msg: ConsumeMessage, channel: Channel) {
    let payload;

    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error("Invalid JSON");
      channel.nack(msg, false, false);
      return;
    }

    const { id, retries = 0 } = payload;

    try {
      const completed = await this.redis.get(`completed:${id}`);
      if (completed) {
        console.log(`Message ${id} already completed, skipping`);
        channel.ack(msg);
        return;
      }

      // dev-only random failure
      if (process.env.NODE_ENV !== "production") {
        const randomNumber = Math.random();
        console.log(randomNumber);
        if (randomNumber < 0.4) {
          throw new Error("Random failure");
        }
      }

      // success path
      await Message.findByIdAndUpdate(
        id,
        { status: "stored", retries },
        { upsert: true }
      );

      await this.redis.set(`completed:${id}`, "1", {
        EX: 24 * 60 * 60
      });

      await this.redis.set(`message:${id}`, "stored");
      await this.redis.publish(
        "message-status",
        JSON.stringify({ type: "MESSAGE_STORED", id })
      );

      channel.ack(msg);
    } catch (err) {
      console.error("Worker error:", err);

      // DLQ path
      if (retries >= MAX_RETRIES) {
        await Message.findByIdAndUpdate(id, {
          status: "failed",
          retries
        });

        await this.redis.set(`message:${id}`, "failed");
        await this.redis.publish(
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

      // retry path
      const nextRetries = retries + 1;

      await Message.findByIdAndUpdate(
        id,
        { status: "retrying", retries: nextRetries },
        { upsert: true }
      );

      await this.redis.set(`message:${id}`, "retrying");
      await this.redis.publish(
        "message-status",
        JSON.stringify({ type: "MESSAGE_RETRY", id })
      );

      channel.publish(
        "messages.dlx",
        "retry",
        Buffer.from(JSON.stringify({ id, retries: nextRetries })),
        { persistent: true }
      );

      channel.ack(msg);
    }
  }
}
