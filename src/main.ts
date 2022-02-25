import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { oakCors } from "cors";
import { validate } from "./auth.ts";
import { publishTicket } from "./mongo.ts";
import { handleWS } from "./handle_ws.ts";
import { isValidDocumentId } from "./validators.ts";

const app = new Application();
const router = new Router();

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
    const authResult = validate(authorization);
    if (authResult.status === "bad") {
      context.response.status = 403;
      return;
    }

    const { ticket } = await publishTicket(documentId, authResult.payload.userId);

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
