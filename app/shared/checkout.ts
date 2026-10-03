import { getAppUrl, sql } from "@elements/app";
import { stripe, testCheckout } from "#app/shared/stripe";
import { ensureWebhook } from "#app/shared/stripe-webhook";
import { DOWNLOAD_DAYS } from "#app/shared/services/downloads";
import { salesChannel, sendDownloadEmail } from "#app/shared/services/sales";

export interface CheckoutItem {
  orderId: string;
  email: string;
  title: string;
  slug: string;
  amountCents: number;
}

/** Returns the url to send the buyer to: Stripe, or the test checkout. */
export async function startCheckout(item: CheckoutItem): Promise<string> {
  if (testCheckout()) {
    return `/checkout/test/${item.orderId}`;
  }

  await ensureWebhook();

  let checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: item.email,
    client_reference_id: item.orderId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: item.amountCents,
        product_data: { name: item.title },
      },
    }],
    success_url: `${getAppUrl()}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/products/${item.slug}`,
  });

  sql(`update orders set stripeSessionId = ${checkout.id} where id = ${item.orderId}`);

  return checkout.url!;
}

export interface Fulfillment {
  paid: boolean;
  orderId: string;
}

/**
 * Records a paid session and sends the download email. Idempotent: the return
 * page and the webhook both call it, in either order, any number of times, and
 * only the call that flips the order from pending sends anything.
 */
export async function fulfillCheckout(sessionId: string): Promise<Fulfillment> {
  let checkout = await stripe().checkout.sessions.retrieve(sessionId);
  let orderId = checkout.client_reference_id ?? "";

  if (checkout.payment_status !== "paid" || !orderId) {
    return { paid: false, orderId };
  }

  recordPayment(orderId, checkout.id, checkout.amount_total ?? 0);

  return { paid: true, orderId };
}

/**
 * The one place a payment is recorded, real or test. Marks a pending order paid and sends the download email. Returns false, and
 * does nothing, when the order was already paid: Stripe and the return page
 * can both report the same payment.
 */
export function recordPayment(orderId: string, sessionId: string, amountCents: number): boolean {
  let flipped = sql(`
    update orders
       set status = 'paid',
           paidAt = now(),
           expiresAt = now() + make_interval(days => ${DOWNLOAD_DAYS}),
           stripeSessionId = ${sessionId},
           amountCents = ${amountCents}
     where id = ${orderId} and status = 'pending'
    returning id
  `).first();

  if (!flipped) {
    return false;
  }

  sendDownloadEmail(orderId, false);
  salesChannel.notify({ event: "refresh" });

  return true;
}
