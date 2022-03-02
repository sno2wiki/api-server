import { createDocSlug } from "./doc_slug.ts";
import { Bson, MongoClient } from "mongo";

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

export const findDoc = (slug: string) => {
  return docsCollection.findOne(
    { slug: slug },
    { projection: { "value": true } },
  );
};

export const findDocRedirects = async (slug: string): Promise<{ context: string; term: string }[]> => {
  const result = await docsCollection.aggregate<{ context: string; term: string }>([
    { "$match": { "slug": slug } },
    { "$lookup": { "from": "redirects", "localField": "_id", "foreignField": "doc", "as": "redirects" } },
    { "$unwind": { "path": "$redirects" } },
    { "$replaceRoot": { "newRoot": "$redirects" } },
    { "$project": { "context": true, "term": true } },
  ]).toArray();

  return result;
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

export const createNewDocFromRedirect = async (context: string, term: string) => {
  const newDocSlug = createDocSlug();

  await docsCollection.insertOne(
    {
      slug: newDocSlug,
      redirects: [{ context: context, term: term }],
      createdAt: new Date(),
    },
  );

  return {
    slug: newDocSlug,
  };
};

export const findRedirects = async (context: string | null, term: string): Promise<
  { slug: string }[]
> => {
  const aggregated = await redirectsCollection.aggregate<{ slug: string }>(
    [
      { "$match": { ...(context && { "context": context }), "term": term } },
      { "$lookup": { "from": "docs", "localField": "doc", "foreignField": "_id", "as": "docs" } },
      { "$unwind": { "path": "$docs" } },
      { "$replaceRoot": { "newRoot": "$docs" } },
      { "$project": { "_id": false, "slug": true } },
      // { "$lookup": { "from": "redirects", "localField": "_id", "foreignField": "doc", "as": "redirects" } },
    ],
  ).toArray();
  return aggregated;
};

export type Result<TBad = {}, TOk = {}> = ({ status: "ok" } & TOk) | ({ status: "bad" } & TBad);
export const createNewRedirect = async (slug: string, context: string, term: string): Promise<Result> => {
  try {
    const doc = await docsCollection.findOne({ slug: slug });
    if (!doc) return { status: "bad" };

    await redirectsCollection.updateOne(
      { doc: doc["_id"], context: context, term: term },
      { $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    return { status: "ok" };
  } catch (e) {
    return { status: "bad" };
  }
};
