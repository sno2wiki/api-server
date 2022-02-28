import { createDocSlug } from "./doc_slug.ts";
import { Bson, MongoClient } from "mongo";

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

const ticketsCollection = mongoClient.database().collection("tickets");
const docsCollection = mongoClient.database().collection("docs");

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

export const findRedirects = (context: string | null, term: string) => {
  return docsCollection.aggregate(
    [
      {
        "$match": {
          "redirects.term": term,
          ...(context && { "redirects.context": context }),
        },
      },
      {
        "$project": { "_id": 0, "id": "$_id" },
      },
    ],
  ).toArray();
};
