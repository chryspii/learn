import { createClient, RedisClientType } from "redis";

export class RedisClient {
  private static client: RedisClientType;

  static async get(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient();
      await this.client.connect();
      console.log("Redis connected");
    }
    return this.client;
  }
}
