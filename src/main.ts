import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { Bson, MongoClient } from "mongo";
import { oakCors } from "cors";
import { addWebSocket as addWebSocketToEdit } from "./edit/mod.ts";
import { addWebSocket as addWebSocketToView } from "./view/mod.ts";

const app = new Application();
const router = new Router();

export const findDocument = async (documentId: string) => {
  const mongoClient = new MongoClient();
  await mongoClient.connect(Deno.env.get("MONGO_URI")!);
  try {
    const document = await mongoClient
      .database()
      .collection("documents")
      .findOne({ _id: new Bson.ObjectId(documentId) });
    return document;
  } catch (e) {
    console.error(e);
  } finally {
    mongoClient.close();
  }
};

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
