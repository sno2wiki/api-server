import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { connect as redisConnect, parseURL } from "redis";
import { MongoClient } from "mongo";

const app = new Application();
const router = new Router();

const lackEnvs = ["REDIS_URI", "MONGO_URI"].filter((key) => !Deno.env.get(key));
if (0 < lackEnvs.length) {
  throw new Error(`Necessary environment variables (${lackEnvs.join(", ")}) was not passed.`);
}

const redisClient = await redisConnect(parseURL(Deno.env.get("REDIS_URI")!));

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

router.get("/docs/:id", async (context) => {
  const documentId = context.params["id"];
  const document = await null;

  if (!document) {
    context.response.status = 404;
    return;
  }
  context.response.body = document;
});

// app.use(oakCors());
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
