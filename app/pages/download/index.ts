import { Request, Response, NotFoundError } from "@elements/app";
import { findLink, libraryToken } from "#app/shared/services/links";
import html from "./template";

export default function route(req: Request, res: Response) {
  let link = findLink(String(req.params.token));

  if (!link) {
    throw new NotFoundError("download link not found");
  }

  return new html({ link, libraryUrl: `/library/${libraryToken(link.email)}` });
}
