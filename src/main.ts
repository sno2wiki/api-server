import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { Bson } from "mongo";
import { oakCors } from "cors";
import { publishTicket } from "./mongo/mod.ts";
import { handleWS } from "./handle_ws.ts";
import { isValidDocumentId } from "./validators.ts";

const app = new Application();
const router = new Router();
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

router.get("/docs/:id/edit", async (context) => {
  const documentId = context.params["id"];
  if (!isValidDocumentId(documentId)) {
    context.response.status = 400;
    return;
  }

  const ws = await context.upgrade();
  handleWS(ws, { documentId });
});

router.get("/docs/:id/enter", async (context) => {
  const documentId = context.params["id"];
  if (!isValidDocumentId(documentId)) {
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
