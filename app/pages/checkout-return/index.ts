import { Request, Response, sql } from "@elements/app";
import { fulfillCheckout } from "#app/shared/checkout";
import { testCheckout } from "#app/shared/stripe";
import { findOrderLink, libraryToken } from "#app/shared/services/links";
import html from "./template";

/** The paid order behind a session id: asked of Stripe, or read back for a test checkout. */
async function paidOrderId(sessionId: string): Promise<string> {
  if (testCheckout()) {
    return sql<{ id: string }>(`
      select id
      from orders
      where
        stripeSessionId = ${sessionId}
        and status = 'paid'
    `).first()?.id ?? "";
  }

  let result = await fulfillCheckout(sessionId);

  return result.paid ? result.orderId : "";
}

export default async function route(req: Request, res: Response) {
  let orderId = await paidOrderId(String(req.query.session_id));
  let link = orderId ? findOrderLink(orderId) : undefined;

  return new html({
    link: link ?? null,
    libraryUrl: link ? `/library/${libraryToken(link.email)}` : "",
  });
}
