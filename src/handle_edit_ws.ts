import { deleteTicket, findDoc, findTicket, updateDocValue } from "./mongo.ts";

const socketsMap = new Map<string, Set<WebSocket>>();
const valMap = new Map<string, unknown[]>();

export const handleEditWS = (ws: WebSocket, { documentId }: { documentId: string }) => {
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
