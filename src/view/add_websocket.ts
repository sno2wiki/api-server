export const addWebSocket = async (
  ws: WebSocket,
  { documentId }: { documentId: string },
) => {
  ws.addEventListener("open", () => {
    console.log("?");
  });
  ws.addEventListener("message", async (event) => {
    console.dir(JSON.parse(event.data));
  });
};
