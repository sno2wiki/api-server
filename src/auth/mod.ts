import { MongoClient } from "mongo";

export { publishTicket } from "./tickets.ts";
export const extractBearerToken = (authorization: string): string | null => {
  if (
    authorization.startsWith("Bearer ") ||
    authorization.startsWith("bearer ")
  ) {
    return authorization.slice(7);
  } else {
    return null;
  }
};

export const validateAuth = async (
  mongoClient: MongoClient,
  authorization: string,
): Promise<
  | { status: "bad" }
  | { status: "ok"; credentials: { userId: string } }
> => {
  const token = extractBearerToken(authorization);
  if (!token) {
    return { status: "bad" };
  }

  return { status: "ok", credentials: { userId: "sno2wman" } };
};
