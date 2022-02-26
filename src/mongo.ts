import { Bson, MongoClient } from "mongo";

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

const ticketsCollection = mongoClient.database().collection("tickets");
const docsCollection = mongoClient.database().collection("docs");

export const publishTicket = async (docId: string, userId: string) => {
  const ticket = crypto.randomUUID();

  await ticketsCollection.insertOne({
    ticket: ticket,
    documentId: docId,
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

export const findDoc = (docId: string) => {
  return docsCollection.findOne(
    { _id: new Bson.ObjectId(docId) },
    { projection: { "value": true } },
  );
};

export const updateDocValue = (docId: string, { value, userId }: { value: unknown[]; userId: string }) => {
  return docsCollection.updateOne(
    { _id: new Bson.ObjectId(docId) },
    {
      $set: { value: (value) },
      $addToSet: { editors: userId },
    },
    { upsert: true },
  );
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
