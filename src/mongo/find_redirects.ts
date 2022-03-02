import { Bson, Collection } from "mongo";
import { Result } from "../types.ts";

export const factoryFindRedirects = (
  redColl: Collection<Bson.Document>,
) =>
  async (
    { context, term }: { context: string | null; term: string },
  ): Promise<Result<{ documents: { slug: string }[] }>> => {
    try {
      const documents = await redColl.aggregate<{ slug: string }>(
        [
          { "$match": { ...(context && { "context": context }), "term": term } },
          { "$lookup": { "from": "docs", "localField": "doc", "foreignField": "_id", "as": "docs" } },
          { "$unwind": { "path": "$docs" } },
          { "$replaceRoot": { "newRoot": "$docs" } },
          { "$project": { "_id": false, "slug": true } },
          // { "$lookup": { "from": "redirects", "localField": "_id", "foreignField": "doc", "as": "redirects" } },
        ],
      ).toArray();
      return { status: "ok", documents: documents };
    } catch (e) {
      return { status: "bad" };
    }
  };
