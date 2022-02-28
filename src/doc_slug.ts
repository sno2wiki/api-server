import { customAlphabet } from "nanoid";

const generator = customAlphabet(
  "23456789abcdefghjklmnpqrstuvwxyz", // without 0,1,i,o
  16,
);
export const createDocSlug = () => generator();

export const isValidDocSlug = (id: string) => /^[23456789abcdefghjklmnpqrstuvwxyz]{16}$/.test(id);
