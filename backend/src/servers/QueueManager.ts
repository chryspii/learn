import amqp, { Channel, Connection, ConsumeMessage } from "amqplib";

export class QueueManager {
  private conn!: Connection;
  private channel!: Channel;

  async connect() {
    this.conn = await amqp.connect("amqp://localhost");
    this.channel = await this.conn.createChannel();
    return this.channel;
  }

  async setupQueues() {
    if (process.env.NODE_ENV !== "production") {
      await this.channel.deleteQueue("messages").catch(() => {});
      await this.channel.deleteQueue("messages.retry").catch(() => {});
      await this.channel.deleteQueue("messages.dlq").catch(() => {});
    }

    await this.channel.assertExchange("messages.dlx", "direct", { durable: true });

    await this.channel.assertQueue("messages", {
      durable: true,
      deadLetterExchange: "messages.dlx",
      deadLetterRoutingKey: "retry"
    });

    await this.channel.assertQueue("messages.retry", {
      durable: true,
      messageTtl: 5000,
      deadLetterExchange: "",
      deadLetterRoutingKey: "messages"
    });

    await this.channel.assertQueue("messages.dlq", { durable: true });

    await this.channel.bindQueue("messages.retry", "messages.dlx", "retry");
    await this.channel.bindQueue("messages.dlq", "messages.dlx", "dlq");

    this.channel.prefetch(1);
  }

  consume(
    queue: string,
    handler: (msg: ConsumeMessage, channel: Channel) => Promise<void>
  ) {
    this.channel.consume(queue, async msg => {
      if (!msg) return;
      await handler(msg, this.channel);
    });
  }
}
