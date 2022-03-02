import { bold, yellow } from "std/fmt/colors";
import { Application, Router } from "oak";
import { oakCors } from "cors";
import { validate } from "./auth.ts";
import { createDoc, createRedirect, findRedirects, getDocRedirects, publishTicket } from "./mongo/mod.ts";
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

  const result = await getDocRedirects({ slug: docSlug });
  if (result.status === "bad") {
    context.throw(500);
    return;
  }

  const { redirects } = result;
  context.response.status = 200;
  context.response.body = { redirects: redirects };
  return;
});

router.get("/redirects/find", async (context) => {
  const paramContext = context.request.url.searchParams.get("context");
  const paramTerm = context.request.url.searchParams.get("term");

  if (!paramTerm) {
    context.throw(400);
    return;
  }

  const result = await findRedirects({ context: paramContext, term: paramTerm });
  if (result.status === "bad") {
    context.throw(500);
    return;
  }

  const { redirects } = result;
  context.response.body = { documents: redirects };
  return;
});

router.put("/redirects/add", async (context) => {
  const paramContext = context.request.url.searchParams.get("context");
  const paramTerm = context.request.url.searchParams.get("term");
  const paramSlug = context.request.url.searchParams.get("slug");

  if (!paramSlug || !paramContext || !paramTerm) {
    context.throw(400);
    return;
  }

  const result = await createRedirect({ slug: paramSlug, context: paramContext, term: paramTerm });
  if (result.status === "bad") {
    context.throw(500);
    return;
  }

  context.response.body = { success: true };
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

  const result = await createDoc({ context: paramContext, term: paramTerm });
  if (result.status === "bad") {
    context.throw(500);
    return;
  }

  const { slug } = result;
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
