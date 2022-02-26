import { Bson, MongoClient } from "mongo";

const mongoClient = new MongoClient();
await mongoClient.connect(Deno.env.get("MONGO_URI")!);

const docsCollection = mongoClient.database().collection("docs");

export const publishTicket = async (docId: string, userId: string) => {
  const ticket = crypto.randomUUID();

  await mongoClient.database().collection("tickets").insertOne({
    ticket: ticket,
    documentId: docId,
    userId: userId,
    publishedAt: new Date(),
  });

  return { ticket };
};
export const findTicket = (ticket: string) => {
  return mongoClient
    .database()
    .collection("tickets")
    .findOne({ ticket }, { projection: { "userId": true } });
};
export const deleteTicket = (ticket: string) => {
  return mongoClient
    .database()
    .collection("tickets")
    .deleteOne({ ticket });
};

export const findDoc = (docId: string) => {
  return mongoClient
    .database()
    .collection("docs")
    .findOne(
      { _id: new Bson.ObjectId(docId) },
      { projection: { "value": true } },
    );
};

export const updateDocValue = (docId: string, { value, userId }: { value: unknown[]; userId: string }) => {
  return mongoClient
    .database()
    .collection("docs")
    .updateOne(
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
