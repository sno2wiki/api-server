import { MongoClient } from "mongo";

export const publishTicket = async (
  mongo: MongoClient,
  payload: { documentId: string; userId: string },
): Promise<
  | { status: "bad" }
  | { status: "ok"; ticket: string }
> => {
  try {
    const ticket = crypto.randomUUID();
    await mongo.database().collection("tickets").insertOne({
      ticket: ticket,
      documentId: payload.documentId,
      userId: payload.userId,
      publishedAt: new Date(),
      expired: false,
    });
    return { status: "ok", ticket: ticket };
  } catch (err) {
    console.error(err);
    return { status: "bad" };
  }
};
