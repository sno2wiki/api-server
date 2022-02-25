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

export const validate = (authorization: string):
  | { status: "bad" }
  | { status: "ok"; payload: { userId: string } } => {
  const bearerToken = extractBearerToken(authorization);

  return { status: "ok", payload: { userId: "sno2wman" } };
};
