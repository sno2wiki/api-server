import { connect } from "amqp";

import { expireTicket, validateTicket } from "../auth/mod.ts";

const socketsMap = new Map<string, Set<WebSocket>>();

const conn = await connect(Deno.env.get("RABBITMQ_URI")!);
const channel = await conn.openChannel();

await channel.declareExchange({ exchange: "save", type: "topic", durable: true });
await channel.declareQueue({ queue: "save", durable: true });
await channel.bindQueue({ exchange: "save", queue: "save", routingKey: "save.*" });

await channel.declareExchange({ exchange: "join", type: "topic", durable: true });
await channel.declareQueue({ queue: "join.*", durable: true });
await channel.bindQueue({ exchange: "join", queue: "join", routingKey: "join.*" });

await channel.declareExchange({ exchange: "edit", type: "topic", durable: true });
await channel.declareQueue({ queue: "edit", durable: true });
await channel.bindQueue({ exchange: "edit", queue: "edit", routingKey: "edit.*" });

export const addWebSocket = (ws: WebSocket, { documentId }: { documentId: string }) => {
  if (!socketsMap.has(documentId)) socketsMap.set(documentId, new Set());

  let storedTicket: null | string = null;

  ws.addEventListener("open", () => {
    socketsMap.get(documentId)!.add(ws);
  });

  ws.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "JOIN": {
        const { ticket: sendTicket } = data;
        storedTicket = sendTicket;
        break;
      }
      case "PUSH_COMMITS": {
        if (!storedTicket) break;

        const { commits, lines } = data;
        const ticketResult = await validateTicket(storedTicket);

        if (ticketResult.status === "bad") {
          ws.send(JSON.stringify({ type: "ERROR", message: "Invalid ticket" }));
        } else {
          const { userId } = ticketResult.payload;
          await channel.publish(
            { exchange: "edit", routingKey: "edit." + documentId },
            { contentType: "application/json" },
            new TextEncoder().encode(JSON.stringify({ documentId, userId, lines, commits })),
          );
        }
        break;
      }
    }
  });

  ws.addEventListener("close", async () => {
    if (storedTicket) await expireTicket(storedTicket);

    socketsMap.get(documentId)?.delete(ws);
    if (socketsMap.get(documentId)?.size === 0) {
      await channel.publish(
        { exchange: "save", routingKey: "save." + documentId },
        { contentType: "application/json" },
        new TextEncoder().encode(JSON.stringify({ documentId })),
      );
    }
  });
};
