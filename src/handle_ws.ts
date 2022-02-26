import { deleteTicket, findDoc, findTicket, updateDocValue } from "./mongo.ts";

const valMap = new Map<string, unknown[]>();

const editWSMap = new Map<string, Set<WebSocket>>();
const viewWSMap = new Map<string, Set<WebSocket>>();

const broadcastView = (documentId: string) => {
  const value = valMap.get(documentId);
  const sockets = viewWSMap.get(documentId);
  if (!value || !sockets) return;

  const sendData = JSON.stringify({ type: "PULL_VAL", value });
  sockets.forEach((to) => {
    if (to.readyState !== WebSocket.OPEN) return;
    to.send(sendData);
  });
};

export const handleEditWS = (ws: WebSocket, { documentId }: { documentId: string }) => {
  if (!editWSMap.has(documentId)) editWSMap.set(documentId, new Set());

  let userId: string | null = null;

  ws.addEventListener("open", () => {
    editWSMap.get(documentId)!.add(ws);
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
          const sendData = JSON.stringify({ type: "PULL_VAL", value });
          editWSMap.get(documentId)!.forEach((to) => {
            if (ws === to || to.readyState !== WebSocket.OPEN) return;
            to.send(sendData);
          });
          valMap.set(documentId, value);
          broadcastView(documentId);
        }
        break;
    }
  });

  ws.addEventListener("close", async () => {
    editWSMap.get(documentId)!.delete(ws);

    const value = valMap.get(documentId);
    if (userId && value) {
      await updateDocValue(documentId, { value, userId });
    }
  });
};

export const handleViewWS = (ws: WebSocket, { documentId }: { documentId: string }) => {
  if (!viewWSMap.has(documentId)) viewWSMap.set(documentId, new Set());

  ws.addEventListener("open", () => {
    viewWSMap.get(documentId)!.add(ws);
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "ENTER":
        {
          broadcastView(documentId);
        }
        break;
    }
  });

  ws.addEventListener("close", () => {
    viewWSMap.get(documentId)!.delete(ws);
  });
};
