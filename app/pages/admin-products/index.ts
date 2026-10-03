import { Request, Response } from "@elements/app";
import { isUserAdminOrThrow } from "#app/shared/services/admin";
import { listProductRows } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  isUserAdminOrThrow();

  return new html({ initial: listProductRows() });
}
