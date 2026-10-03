import { test, equal, sql } from "@elements/app";
import { openOrder } from "#app/pages/product/template";
import { recordPayment, startCheckout } from "#app/shared/checkout";
import { testCheckout } from "#app/shared/stripe";
import { findLink, linksForEmail, spendDownload } from "#app/shared/services/links";
import { loadDashboard } from "#app/shared/services/sales";
import { findTestOrder, payTestOrder } from "./services";

function makeProduct(): string {
  return sql<{ id: string }>(`
    insert into products (slug, title, description, priceCents, coverType, coverData, fileName, fileType, fileSize, fileData)
         values ('field-notes', 'Field Notes', 'about it', 1900, 'image/png', ${new Uint8Array([1, 2, 3])},
                 'field-notes.pdf', 'application/pdf', 4, ${new TextEncoder().encode("%PDF")})
      returning id
  `).firstOrThrow().id;
}

test("buying through the test checkout", async () => {
  let productId = makeProduct();

  let item = openOrder({ productId, email: " Buyer@Example.com " });
  let orderId = item.orderId;
  let order = findTestOrder(orderId);
  equal(order?.email, "buyer@example.com");
  equal(order?.amountCents, 1900, "the price comes from the product row");
  equal(order?.productTitle, "Field Notes");

  // Tests run against the environment's own config. Once a Stripe key is in
  // development.env (or production.env, where tests run before a deploy) the
  // test checkout is off and a checkout would reach Stripe, so the payment is
  // recorded directly, through the same recordPayment the test checkout uses.
  if (testCheckout()) {
    equal(await startCheckout(item), `/checkout/test/${orderId}`, "without a key the buy button goes to the test checkout");
    equal(payTestOrder(orderId), `/checkout/return?session_id=test_${orderId}`);
  } else {
    recordPayment(orderId, `test_${orderId}`, item.amountCents);
  }

  let paid = sql<{ status: string; stripeSessionId: string; amountCents: number; days: number }>(`
    select status, stripeSessionId, amountCents, round(extract(epoch from expiresAt - paidAt) / 86400)::int as days
      from orders where id = ${orderId}
  `).firstOrThrow();

  equal(paid.status, "paid");
  equal(paid.stripeSessionId, `test_${orderId}`);
  equal(paid.amountCents, 1900);
  equal(paid.days, 30, "the download link runs thirty days");

  equal(findTestOrder(orderId), undefined, "a paid order leaves the test checkout");

  equal(recordPayment(orderId, `test_${orderId}`, 1900), false, "an order is paid once");

  let links = linksForEmail("buyer@example.com");
  equal(links.length, 1, "the purchase is in the buyer's library");

  let library = sql<{ n: number }>(`select count(*)::int as n from libraries where email = 'buyer@example.com'`).firstOrThrow();
  equal(library.n, 1, "the download email minted the library link");

  let file = spendDownload(links[0].downloadToken);
  equal(file?.fileName, "field-notes.pdf", "the download link serves the file");
  equal(findLink(links[0].downloadToken)?.downloadCount, 1);

  let dash = loadDashboard();
  equal(dash.salesCount, 1, "the sale counts on the creator's dashboard");
  equal(dash.revenueCents, 1900);
});
