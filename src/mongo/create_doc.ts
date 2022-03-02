import { createDocSlug } from "../doc_slug.ts";
import { Bson, Collection } from "mongo";
import { Result } from "../types.ts";

export const factoryCreateDoc: (
  docColl: Collection<Bson.Document>,
) => (payload: { context: string; term: string }) => Promise<Result<{ slug: string }, {}>> = (docColl) =>
  async ({ context, term }) => {
    try {
      const newDocSlug = createDocSlug();

      await docColl.insertOne(
        {
          slug: newDocSlug,
          redirects: [{ context: context, term: term }],
          createdAt: new Date(),
        },
      );
      return { status: "ok", slug: newDocSlug };
    } catch (e) {
      return { status: "bad" };
    }
  };
