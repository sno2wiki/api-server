export type Result<TOk = {}, TBad = {}> = ({ status: "ok" } & TOk) | ({ status: "bad" } & TBad);
