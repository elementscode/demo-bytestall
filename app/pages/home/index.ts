import { Request, Response } from "@elements/app";
import { listProducts } from "#app/shared/services/catalog";
import { currentUserIsAdmin } from "#app/shared/services/admin";
import html from "./template";

export default function route(req: Request, res: Response) {
  return new html({
    products: listProducts(),
    isAdmin: currentUserIsAdmin(),
  });
}
