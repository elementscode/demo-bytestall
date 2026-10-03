import { ForbiddenError, sql } from "@elements/app";
import { recordPayment } from "#app/shared/checkout";
import { testCheckout } from "#app/shared/stripe";

export interface TestOrder {
  id: string;
  email: string;
  amountCents: number;
  productId: string;
  productSlug: string;
  productTitle: string;
  coverHash: string;
  fileType: string;
  fileName: string;
}

/** A pending order on the test checkout, or undefined once paid or unknown. */
export function findTestOrder(orderId: string): TestOrder | undefined {
  return sql<TestOrder>(`
    select
      o.id,
      o.email,
      o.amountCents,
      p.id as productId,
      p.slug as productSlug,
      p.title as productTitle,
      p.coverHash,
      p.fileType,
      p.fileName
    from orders o
    join products p on p.id = o.productId
    where
      o.id = ${orderId}
      and o.status = 'pending'
  `).first();
}

/**
 * Pays a pending order on the in-app test checkout, through the same
 * recordPayment a Stripe payment uses. Refused once a Stripe key is set.
 * Returns the url of the return page.
 * @rpc
 */
export function payTestOrder(orderId: string): string {
  if (!testCheckout()) {
    throw new ForbiddenError("The test checkout is off.");
  }

  let order = sql<{ amountCents: number }>(`
    select amountCents
    from orders
    where
      id = ${orderId}
      and status = 'pending'
  `).firstOrThrow("order not found");

  let sessionId = `test_${orderId}`;
  recordPayment(orderId, sessionId, order.amountCents);

  return `/checkout/return?session_id=${sessionId}`;
}
