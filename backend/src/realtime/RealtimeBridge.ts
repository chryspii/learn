import { RedisPubSub } from "../servers/RedisPubSub.js";
import { WebSocketServer } from "./WebSocketServer.js";

export class RealtimeBridge {
  static async start() {
    const { sub } = await RedisPubSub.create();

    sub.subscribe("message-status", msg => {
      WebSocketServer.broadcast(JSON.parse(msg));
    });
  }
}
