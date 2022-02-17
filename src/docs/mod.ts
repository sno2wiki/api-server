import { Bson, MongoClient } from "mongo";

export const getDocument = async (client: MongoClient, documentId: string): Promise<
  | null
  | { isPrivate: boolean }
> => {
  const stored = await client
    .database()
    .collection("documents")
    .findOne({ _id: new Bson.ObjectId(documentId) });

  if (!stored) return null;

  const { isPrivate } = stored;

  return { isPrivate };
};
