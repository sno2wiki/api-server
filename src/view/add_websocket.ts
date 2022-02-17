import { connect } from "amqp";

const socketsMap = new Map<string, Set<WebSocket>>();

const conn = await connect(Deno.env.get("RABBITMQ_URI")!);
const channel = await conn.openChannel();

await channel.declareExchange({ exchange: "view", type: "topic", durable: true });
await channel.declareQueue({ queue: "view", durable: true });
await channel.bindQueue({ exchange: "view", queue: "view", routingKey: "view.*" });

await channel.consume(
  { queue: "view" },
  async (args, props, data) => {
    const { documentId, lines, head } = JSON.parse(new TextDecoder().decode(data));
    socketsMap.get(documentId)?.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PULL_DOCUMENT", lines, head }));
      }
    });
    await channel.ack({ deliveryTag: args.deliveryTag });
  },
);

export const addWebSocket = (
  ws: WebSocket,
  { documentId }: { documentId: string },
) => {
  if (!socketsMap.has(documentId)) socketsMap.set(documentId, new Set());
  ws.addEventListener("open", () => {
    socketsMap.get(documentId)!.add(ws);
  });

  ws.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "JOIN": {
        await channel.publish(
          { exchange: "join", routingKey: "join." + documentId },
          { contentType: "application/json" },
          new TextEncoder().encode(JSON.stringify({ documentId })),
        );
        break;
      }
    }
  });

  ws.addEventListener("close", () => {
    socketsMap.get(documentId)?.delete(ws);
  });
};
