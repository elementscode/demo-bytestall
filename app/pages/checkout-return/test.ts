import { test, equal, sql } from "@elements/app";
import { findOrderLink } from "#app/shared/services/links";

// The return page asks Stripe about the session, so the page itself is run by
// hand with a sandbox card. This checks what it renders once the order is paid.
test("the return page finds the paid order's link", () => {
  let product = sql<{ id: string }>(`
    insert into products (slug, title, description, priceCents, coverType, coverData, fileName, fileType, fileSize, fileData)
         values ('p', 'P', 'd', 900, 'image/png', ${new Uint8Array([1])}, 'p.zip', 'application/zip', 1, ${new Uint8Array([1])})
      returning id
  `).firstOrThrow();

  let order = sql<{ id: string }>(`
    insert into orders (email, productId, amountCents, status, paidAt, expiresAt)
         values ('b@example.com', ${product.id}, 900, 'paid', now(), now() + interval '30 days')
      returning id
  `).firstOrThrow();

  equal(findOrderLink(order.id)?.email, "b@example.com");
});
