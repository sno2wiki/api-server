import { connect } from "amqp";

const conn = await connect(Deno.env.get("RABBITMQ_URI")!);
const channel = await conn.openChannel();

await channel.declareExchange({ exchange: "join", type: "topic", durable: true });
await channel.declareQueue({ queue: "join.*", durable: true });
await channel.bindQueue({ exchange: "join", queue: "join", routingKey: "join.*" });

await channel.declareExchange({ exchange: "edit", type: "topic", durable: true });
await channel.declareQueue({ queue: "edit", durable: true });
await channel.bindQueue({ exchange: "edit", queue: "edit", routingKey: "edit.*" });
export const addWebSocket = (ws: WebSocket, { documentId }: { documentId: string }) => {
  ws.addEventListener(
    "open",
    async () => {
    },
  );

  ws.addEventListener(
    "message",
    async (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "PUSH_COMMITS": {
          const { commits, lines } = data;
          await channel.publish(
            { exchange: "edit", routingKey: "edit." + documentId },
            { contentType: "application/json" },
            new TextEncoder().encode(JSON.stringify({ documentId, lines, commits })),
          );
          break;
        }
      }
    },
  );

  ws.addEventListener("close", async () => {
  });
};
