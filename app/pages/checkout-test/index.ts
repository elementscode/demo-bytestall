import { NotFoundError, Request, Response } from "@elements/app";
import { testCheckout } from "#app/shared/stripe";
import { findTestOrder } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!testCheckout()) {
    throw new NotFoundError();
  }

  let order = findTestOrder(String(req.params.orderId));

  if (!order) {
    throw new NotFoundError("order not found");
  }

  return new html({ order });
}
