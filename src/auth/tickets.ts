import { MongoClient } from "mongo";

const mongo = new MongoClient();
await mongo.connect(Deno.env.get("MONGO_URI")!);

export const publishTicket = async (
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

export const validateTicket = async (ticket: string): Promise<
  | { status: "bad" }
  | { status: "ok"; payload: { userId: string } }
> => {
  const ticketDoc = await mongo.database().collection("tickets").findOne({ ticket: ticket });

  if (!ticketDoc) return { status: "bad" };
  else {
    const { userId } = ticketDoc;
    return { status: "ok", payload: { userId } };
  }
};
