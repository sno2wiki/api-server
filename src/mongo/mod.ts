import { MongoClient } from "mongo";
import { factoryCreateDoc } from "./create_doc.ts";
import { factoryCreateRedirect } from "./create_redirect.ts";
import { factoryFindRedirects } from "./find_redirects.ts";
import { factoryGetDocRedirects } from "./get_doc_redirects.ts";
import { Result } from "../types.ts";
import { isValidDocSlug } from "../doc_slug.ts";

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

export const search = async (
  { query }: { query: string },
): Promise<
  Result<
    {
      slug: null | { slug: string };
      // context: null | { context: string; termCandidates: string[] }[];
      term: null | { context: string; term: string; conflicted: boolean }[];
    }
  >
> => {
  try {
    /*
    const findBySlug = isValidDocSlug(query)
      ? await (async () => {
        const res = await docsCollection.findOne({ slug: query });
        return res;
      })()
      : null;
    */
    const findByTerm = await redirectsCollection
      .aggregate<{ context: string; term: string; conflicted: boolean }>(
        [
          {
            "$match": {
              "term": { "$regex": query, "$options": "i" },
            },
          },
          {
            "$group": {
              "_id": { "context": "$context", "term": "$term" },
              "docsCount": { "$count": {} },
            },
          },
          { "$sort": { "_id.term": -1 } },
          { "$limit": 5 },
          {
            "$project": {
              "_id": 0,
              "context": "$_id.context",
              "term": "$_id.term",
              "conflicted": { "$cond": [{ "$lte": ["$docsCount", 1] }, false, true] },
            },
          },
        ],
      ).toArray();

    return {
      status: "ok",
      slug: null,
      // context: null,
      term: findByTerm,
    };
  } catch (e) {
    return { status: "bad" };
  }
};
