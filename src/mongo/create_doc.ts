import { createDocSlug } from "../doc_slug.ts";
import { Bson, Collection } from "mongo";
import { Result } from "../types.ts";

export const factoryCreateDoc: (
  docColl: Collection<Bson.Document>,
  redColl: Collection<Bson.Document>,
) => (payload: { context: string; term: string }) => Promise<Result<{ slug: string }, {}>> = (docColl, redColl) =>
  async ({ context, term }) => {
    try {
      const slug = createDocSlug();

      const docId = await docColl.insertOne({ slug: slug, createdAt: new Date() });
      await redColl.insertOne({ doc: docId, context: context, term: term });

      return { status: "ok", slug: slug };
    } catch (e) {
      return { status: "bad" };
    }
  };
