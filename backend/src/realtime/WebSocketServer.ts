import { WebSocketServer as WSS } from "ws";

export class WebSocketServer {
  private static instance: WSS;

  static start(port = 8080) {
    if (this.instance) return;

    this.instance = new WSS({ port });
    console.log(`WebSocket running on :${port}`);

    this.instance.on("connection", () => {
      console.log("WS client connected");
    });
  }

  static broadcast(data: unknown) {
    if (!this.instance) return;

    const msg = JSON.stringify(data);
    this.instance.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  }
}
