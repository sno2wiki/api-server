import { connect } from "amqp";

import { expireTicket, validateTicket } from "../auth/mod.ts";
const conn = await connect(Deno.env.get("RABBITMQ_URI")!);
const channel = await conn.openChannel();

await channel.declareExchange({ exchange: "join", type: "topic", durable: true });
await channel.declareQueue({ queue: "join.*", durable: true });
await channel.bindQueue({ exchange: "join", queue: "join", routingKey: "join.*" });

await channel.declareExchange({ exchange: "edit", type: "topic", durable: true });
await channel.declareQueue({ queue: "edit", durable: true });
await channel.bindQueue({ exchange: "edit", queue: "edit", routingKey: "edit.*" });
export const addWebSocket = (ws: WebSocket, { documentId }: { documentId: string }) => {
  let ticket: null | string = null;

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
        case "JOIN": {
          const { ticket: sendTicket } = data;
          ticket = sendTicket;
          break;
        }
        case "PUSH_COMMITS": {
          if (!ticket) break;

          const { commits, lines } = data;
          const ticketResult = await validateTicket(ticket);

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
    },
  );

  ws.addEventListener("close", async () => {
    if (ticket) await expireTicket(ticket);
  });
};
