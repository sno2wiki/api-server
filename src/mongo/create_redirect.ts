import { createDocSlug } from "../doc_slug.ts";
import { Bson, Collection } from "mongo";
import { Result } from "../types.ts";

export const factoryCreateRedirect = (
  docColl: Collection<Bson.Document>,
  redColl: Collection<Bson.Document>,
) =>
  async (
    { slug, context, term }: { slug: string; context: string; term: string },
  ): Promise<Result<{}, {}>> => {
    try {
      const doc = await docColl.findOne({ slug: slug });
      if (!doc) return { status: "bad" };

      await redColl.updateOne(
        { doc: doc["_id"], context: context, term: term },
        { $set: { updatedAt: new Date() } },
        { upsert: true },
      );
      return { status: "ok" };
    } catch (e) {
      return { status: "bad" };
    }
  };
