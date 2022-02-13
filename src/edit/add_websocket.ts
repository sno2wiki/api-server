export const addWebSocket = async (
  ws: WebSocket,
  { documentId }: { documentId: string },
) => {
  ws.addEventListener("open", async () => {
  });
  ws.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "JOIN": {
        const { userId } = data;
        console.dir(userId);
        break;
      }
      case "PUSH_COMMITS": {
        const { commits } = data;
        console.dir(commits);
        break;
      }
    }
  });

  ws.addEventListener("close", async () => {
  });
};
