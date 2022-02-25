import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { Bson } from "mongo";
import { oakCors } from "cors";
import { deleteTicket, findDoc, findTicket, publishTicket, updateDocValue } from "./mongo/mod.ts";

const app = new Application();
const router = new Router();

const socketsMap = new Map<string, Set<WebSocket>>();
const valMap = new Map<string, unknown[]>();

export const extractBearerToken = (authorization: string): string | null => {
  if (
    authorization.startsWith("Bearer ") ||
    authorization.startsWith("bearer ")
  ) {
    return authorization.slice(7);
  } else {
    return null;
  }
};
export const handleWS = (ws: WebSocket, { documentId }: { documentId: string }) => {
  if (!socketsMap.has(documentId)) socketsMap.set(documentId, new Set());

  let userId: string | null = null;

  ws.addEventListener("open", () => {
    socketsMap.get(documentId)!.add(ws);
  });

  ws.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "ENTER":
        {
          /* authen */
          try {
            const { ticket } = data;
            const result = await findTicket(ticket);
            if (!result) {
              ws.send(JSON.stringify({ type: "FORCE_EXIT" }));
              return;
            }
            userId = result.userId;
            await deleteTicket(ticket);
          } catch (err) {
            ws.send(JSON.stringify({ type: "FORCE_EXIT" }));
            return;
          }

          /* stored  */
          if (valMap.has(documentId)) {
            ws.send(JSON.stringify({ type: "PULL_VAL", value: (valMap.get(documentId)!), userId }));
            return;
          }

          try {
            const stored = await findDoc(documentId);
            if (stored && stored.value) {
              const value = stored.value;
              valMap.set(documentId, value);
              ws.send(JSON.stringify({ type: "PULL_VAL", value: value, userId }));
            } else {
              const value = [{ "type": "paragraph", children: [{ text: "" }] }];
              valMap.set(documentId, value);
              ws.send(JSON.stringify({ type: "PULL_VAL", value: value, userId }));
            }
          } catch (err) {
            ws.send(JSON.stringify({ type: "FORCE_EXIT" }));
            return;
          }
        }
        break;
      case "PUSH_VAL":
        {
          if (!userId) {
            ws.send(JSON.stringify({ type: "FORCE_EXIT" }));
            return;
          }

          const { value } = data;
          const sendData = JSON.stringify({ type: "PULL_VAL", value, userId });
          socketsMap.get(documentId)!.forEach((to) => {
            if (ws === to || to.readyState !== WebSocket.OPEN) return;
            to.send(sendData);
          });
          valMap.set(documentId, value);
        }
        break;
    }
  });

  ws.addEventListener("close", async () => {
    socketsMap.get(documentId)!.delete(ws);

    const value = valMap.get(documentId);
    if (userId && value) {
      await updateDocValue(documentId, { value, userId });
    }
  });
};

router.get("/docs/:id/edit", async (context) => {
  const documentId = context.params["id"];
  if (!Bson.ObjectId.isValid(documentId)) {
    context.response.status = 400;
    return;
  }

  const ws = await context.upgrade();
  handleWS(ws, { documentId });
});

router.get("/docs/:id/enter", async (context) => {
  const documentId = context.params["id"];
  if (!Bson.ObjectId.isValid(documentId)) {
    context.response.status = 400;
    return;
  }

  const authorization = context.request.headers.get("Authorization");
  if (!authorization) {
    context.response.status = 200;
    context.response.body = {};
    return;
  } else {
    const bearerToken = extractBearerToken(authorization);

    const { ticket } = await publishTicket(documentId, "sno2wman");

    context.response.status = 200;
    context.response.body = { ticket };
    return;
  }
});

app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener("listen", ({ hostname, port, serverType }) => {
  console.log(bold(`Start listening on: ${yellow(`${hostname}:${port}`)}`));
  console.log(bold(`using HTTP server: ${yellow(serverType)}`));
});

await app.listen({
  port: parseInt(Deno.env.get("PORT") || "8000", 10),
});
console.log(bold("Finished."));
