import { Message } from "../models/MessageModel.js";
import { RedisClient } from "../servers/RedisClient.js";
import { QueuePublisher } from "../servers/QueuePublisher.js";

export class MessageService {
  constructor(
    private redis: Awaited<ReturnType<typeof RedisClient.get>>,
    private queue: QueuePublisher
  ) {}

  async create(data: any) {
    const doc = await Message.create({
      ...data,
      status: "queued",
      retries: 0
    });

    await this.redis.set(`message:${doc._id}`, "queued");
    this.queue.publishMessage(doc._id.toString(), 0);

    return doc;
  }

  async list() {
    const messages = await Message.find().sort({ _id: -1 });

    return Promise.all(
      messages.map(async m => ({
        ...m.toObject(),
        status: (await this.redis.get(`message:${m._id}`)) ?? m.status
      }))
    );
  }

  async delete(id: string) {
    const deleted = await Message.findByIdAndDelete(id);
    if (!deleted) return false;

    await this.redis.del(`message:${id}`);
    await this.redis.publish(
      "message-status",
      JSON.stringify({ type: "MESSAGE_DELETED", id })
    );

    return true;
  }

  async getFailed() {
    return Message.find({ status: "failed" }).sort({ updatedAt: -1 });
  }

  async reprocess(id: string) {
    const msg = await Message.findById(id);
    if (!msg) return false;

    msg.status = "queued";
    msg.retries = 0;
    await msg.save();

    await this.redis.del(`completed:${id}`);

    this.queue.publishMessage(id, 0);

    await this.redis.publish(
      "message-status",
      JSON.stringify({ type: "MESSAGE_REQUEUED", id })
    );

    return true;
  }
}
