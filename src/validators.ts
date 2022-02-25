import { Bson } from "mongo";
export const isValidDocumentId = Bson.ObjectId.isValid;
