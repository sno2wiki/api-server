import { MongoClient } from "mongo";
import { factoryCreateDoc } from "./create_doc.ts";
import { factoryCreateRedirect } from "./create_redirect.ts";
import { factoryFindRedirects } from "./find_redirects.ts";
import { factoryGetDocRedirects } from "./get_doc_redirects.ts";
import { Result } from "../types.ts";

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

const ticketsCollection = mongoClient.database().collection("tickets");
const docsCollection = mongoClient.database().collection("docs");
const redirectsCollection = mongoClient.database().collection("redirects");

export const publishTicket = async (docSlug: string, userId: string) => {
  const ticket = crypto.randomUUID();

  await ticketsCollection.insertOne({
    ticket: ticket,
    docSlug: docSlug,
    userId: userId,
    publishedAt: new Date(),
  });

  return { ticket };
};
export const findTicket = (ticket: string) => {
  return ticketsCollection.findOne(
    { ticket },
    { projection: { "userId": true } },
  );
};
export const deleteTicket = (ticket: string) => {
  return ticketsCollection.deleteOne(
    { ticket },
  );
};

export const getDoc = (slug: string) => {
  return docsCollection.findOne(
    { slug: slug },
    { projection: { "value": true } },
  );
};

export const updateDocValue = (slug: string, { value, userId }: { value: unknown[]; userId: string }) => {
  return docsCollection.updateOne(
    { slug },
    {
      $set: {
        value: (value),
        updatedAt: new Date(),
      },
      $addToSet: { editors: userId },
    },
    { upsert: true },
  );
};

export const getDocRedirects = factoryGetDocRedirects(docsCollection);
export const findRedirects = factoryFindRedirects(redirectsCollection);
export const createDoc = factoryCreateDoc(docsCollection, redirectsCollection);
export const createRedirect = factoryCreateRedirect(docsCollection, redirectsCollection);
