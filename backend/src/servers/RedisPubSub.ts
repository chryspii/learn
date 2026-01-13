import { createClient } from "redis";

export class RedisPubSub {
  static async create() {
    const pub = createClient();
    const sub = createClient();

    await pub.connect();
    await sub.connect();

    return { pub, sub };
  }
}
