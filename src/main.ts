import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { Bson, MongoClient } from "mongo";
import { oakCors } from "cors";
import { publishTicket, validateAuth } from "./auth/mod.ts";
import { getDocument } from "./docs/mod.ts";
import { addWebSocket as addWebSocketToEdit } from "./edit/mod.ts";
import { addWebSocket as addWebSocketToView } from "./view/mod.ts";

const app = new Application();
const router = new Router();

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

router.get("/docs/:id/view", async (context) => {
  const documentId = context.params["id"];
  if (!Bson.ObjectId.isValid(documentId)) {
    context.response.status = 400;
    return;
  }

  const ws = await context.upgrade();
  await addWebSocketToView(ws, { documentId });
});

router.get("/docs/:id/edit", async (context) => {
  const documentId = context.params["id"];
  if (!Bson.ObjectId.isValid(documentId)) {
    context.response.status = 400;
    return;
  }

  const ws = await context.upgrade();
  await addWebSocketToView(ws, { documentId });
  await addWebSocketToEdit(ws, { documentId });
});

router.get("/docs/:id/check", async (context) => {
  const documentId = context.params["id"];
  if (!documentId || !Bson.ObjectId.isValid(documentId)) {
    context.response.status = 400;
    return;
  }

  const authorization = context.request.headers.get("Authorization");
  const document = await getDocument(mongoClient, documentId);

  if (!authorization) {
    if (!document) {
      context.response.status = 404;
      return;
    }
    if (document.isPrivate) {
      context.response.status = 403;
      return;
    }
    context.response.status = 200;
    context.response.body = { documentId, ticket: null };
    return;
  }

  try {
    const authResult = await validateAuth(
      mongoClient,
      authorization,
    );
    if (authResult.status === "bad") {
      context.response.status = 403;
      return;
    }

    const ticketResult = await publishTicket(
      { documentId: documentId, userId: authResult.credentials.userId },
    );
    if (ticketResult.status === "bad") {
      context.response.status = 500;
      return;
    }

    context.response.body = { documentId, ticket: ticketResult.ticket };
    return;
  } catch (e) {
    context.response.status = 500;
    return;
  }
});

router.get("/redirects/_/:term", async (context) => {
  const term = context.params["term"];

  const documents = await mongoClient.database().collection("documents").aggregate(
    [
      { "$match": { "redirects.term": term } },
      { "$project": { "_id": 0, "id": "$_id", "lines": true } },
    ],
  ).toArray();
  context.response.body = { documents };
  return;
});

router.get("/redirects/:context/:term", async (context) => {
  const ctx = context.params["context"];
  const term = context.params["term"];

  const documents = await mongoClient.database().collection("documents").aggregate(
    [
      { "$match": { "redirects.context": ctx, "redirects.term": term } },
      { "$project": { "_id": false, "id": "$_id", "lines": true } },
    ],
  ).toArray();
  context.response.body = { documents };
  return;
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
