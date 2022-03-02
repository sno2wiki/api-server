import { createDocSlug } from "../doc_slug.ts";
import { Bson, Collection } from "mongo";
import { Result } from "../types.ts";

export const factoryGetDocRedirects: (
  docColl: Collection<Bson.Document>,
) => (payload: { slug: string }) => Promise<Result<{ redirects: { context: string; term: string }[] }, {}>> = (
  docColl,
) =>
  async ({ slug }) => {
    try {
      const redirects = await docColl.aggregate<{ context: string; term: string }>([
        { "$match": { "slug": slug } },
        { "$lookup": { "from": "redirects", "localField": "_id", "foreignField": "doc", "as": "redirects" } },
        { "$unwind": { "path": "$redirects" } },
        { "$replaceRoot": { "newRoot": "$redirects" } },
        { "$project": { "context": true, "term": true } },
      ]).toArray();
      return { status: "ok", redirects: redirects };
    } catch (e) {
      return { status: "bad" };
    }
  };
