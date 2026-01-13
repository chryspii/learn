import amqp, { Channel } from "amqplib";

export class QueuePublisher {
  private channel!: Channel;

  async connect() {
    const conn = await amqp.connect("amqp://localhost");
    this.channel = await conn.createChannel();
  }

  publishMessage(id: string, retries = 0) {
    this.channel.sendToQueue(
      "messages",
      Buffer.from(JSON.stringify({ id, retries })),
      { persistent: true }
    );
  }
}
