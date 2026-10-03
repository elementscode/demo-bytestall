import { Request, Response, NotFoundError, sql } from "@elements/app";
import { linksForEmail } from "#app/shared/services/links";
import html from "./template";

export default function route(req: Request, res: Response) {
  let library = sql<{ email: string }>(`select email from libraries where token = ${String(req.params.token)}`).first();

  if (!library) {
    throw new NotFoundError("library not found");
  }

  return new html({ email: library.email, links: linksForEmail(library.email) });
}
