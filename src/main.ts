import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { oakCors } from "cors";
import { validate } from "./auth.ts";
import { createNewDocFromRedirect, findDocRedirects, findRedirects, publishTicket } from "./mongo.ts";
import { handleEditWS, handleViewWS } from "./handle_ws.ts";
import { isValidDocSlug } from "./doc_slug.ts";

const app = new Application();
const router = new Router();

router.get("/docs/:slug/view", async (context) => {
  const docSlug = context.params["slug"];
  if (!isValidDocSlug(docSlug)) {
    context.response.status = 400;
    return;
  }

  try {
    const ws = await context.upgrade();
    handleViewWS(ws, { docSlug: docSlug });
  } catch (error) {
    console.error(error);
    context.response.status = 500;
  }
});

router.get("/docs/:slug/edit", async (context) => {
  const docSlug = context.params["slug"];
  if (!isValidDocSlug(docSlug)) {
    context.response.status = 400;
    return;
  }

  try {
    const ws = await context.upgrade();
    handleEditWS(ws, { docSlug: docSlug });
  } catch (error) {
    console.error(error);
    context.response.status = 500;
  }
});

router.get("/docs/:slug/enter", async (context) => {
  const docSlug = context.params["slug"];
  if (!isValidDocSlug(docSlug)) {
    context.response.status = 400;
    return;
  }

  const authorization = context.request.headers.get("Authorization");
  if (!authorization) {
    context.response.status = 200;
    context.response.body = { ticket: null };
    return;
  } else {
    const authResult = validate(authorization);
    if (authResult.status === "bad") {
      context.response.status = 403;
      return;
    }

    const { ticket } = await publishTicket(docSlug, authResult.payload.userId);

    context.response.status = 200;
    context.response.body = { ticket };
    return;
  }
});

router.get("/docs/:slug/redirects", async (context) => {
  const docSlug = context.params["slug"];

  if (!isValidDocSlug(docSlug)) {
    context.throw(400);
    return;
  }

  const result = await findDocRedirects(docSlug);
  if (!result) {
    context.response.status = 200;
    context.response.body = [];
    return;
  }
  context.response.status = 200;
  context.response.body = result;
  return;
});

router.get("/redirects/_/:term", async (context) => {
  const termParam = context.params["term"];

  const documents = await findRedirects(null, termParam);
  context.response.body = { documents };
  return;
});

router.get("/redirects/:context/:term", async (context) => {
  const contextParam = context.params["context"];
  const termParam = context.params["term"];

  const documents = await findRedirects(contextParam, termParam);
  context.response.body = { documents };
  return;
});

router.get("/new/doc", async (context) => {
  const paramContext = context.request.url.searchParams.get("context");
  const paramTerm = context.request.url.searchParams.get("term");

  if (
    !paramTerm ||
    !paramContext ||
    paramContext === "_"
  ) {
    context.throw(400);
    return;
  }

  const { slug } = await createNewDocFromRedirect(paramContext, paramTerm);
  context.response.body = { slug };
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
