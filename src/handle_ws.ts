import { deleteTicket, findTicket, getDoc, updateDocValue } from "./mongo/mod.ts";

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

export const handleEditWS = (ws: WebSocket, { docSlug }: { docSlug: string }) => {
  if (!editWSMap.has(docSlug)) editWSMap.set(docSlug, new Set());

  let userId: string | null = null;

  ws.addEventListener("open", () => {
    editWSMap.get(docSlug)!.add(ws);
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
          if (valMap.has(docSlug)) {
            ws.send(JSON.stringify({ type: "PULL_VAL", value: (valMap.get(docSlug)!), userId }));
            return;
          }

          try {
            const stored = await getDoc(docSlug);
            if (stored && stored.value) {
              const value = stored.value;
              valMap.set(docSlug, value);
              ws.send(JSON.stringify({ type: "PULL_VAL", value: value, userId }));
            } else {
              const value = [{ "type": "paragraph", children: [{ text: "" }] }];
              valMap.set(docSlug, value);
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
          editWSMap.get(docSlug)!.forEach((to) => {
            if (ws === to || to.readyState !== WebSocket.OPEN) return;
            to.send(sendData);
          });
          valMap.set(docSlug, value);
          broadcastView(docSlug);
        }
        break;
    }
  });

  ws.addEventListener("close", async () => {
    editWSMap.get(docSlug)!.delete(ws);

    const value = valMap.get(docSlug);
    if (userId && value) {
      await updateDocValue(docSlug, { value, userId });
    }
  });
};

export const handleViewWS = (ws: WebSocket, { docSlug }: { docSlug: string }) => {
  if (!viewWSMap.has(docSlug)) viewWSMap.set(docSlug, new Set());

  ws.addEventListener("open", () => {
    viewWSMap.get(docSlug)!.add(ws);
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "ENTER":
        {
          broadcastView(docSlug);
        }
        break;
    }
  });

  ws.addEventListener("close", () => {
    viewWSMap.get(docSlug)!.delete(ws);
  });
};
