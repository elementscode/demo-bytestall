import { Request, Response, NotFoundError } from "@elements/app";
import { findProduct } from "#app/shared/services/catalog";
import { currentUserIsAdmin } from "#app/shared/services/admin";
import html from "./template";

export default function route(req: Request, res: Response) {
  let product = findProduct(String(req.params.slug));

  if (!product) {
    throw new NotFoundError("product not found");
  }

  return new html({
    product,
    isAdmin: currentUserIsAdmin(),
  });
}
