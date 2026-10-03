import { test, assert, equal, session, sql } from "@elements/app";
import { recordPayment } from "#app/shared/checkout";
import { DOWNLOAD_LIMIT, linkState } from "#app/shared/services/downloads";
import { findLink, libraryToken, linksForEmail, spendDownload } from "#app/shared/services/links";
import { loadDashboard, resendDownload } from "#app/shared/services/sales";
import { signin } from "#app/shared/services/auth";

function makeProduct(slug: string, priceCents: number): string {
  return sql<{ id: string }>(`
    insert into products (slug, title, description, priceCents, coverType, coverData, fileName, fileType, fileSize, fileData)
         values (${slug}, ${"Title " + slug}, 'about it', ${priceCents}, 'image/png', ${new Uint8Array([1, 2, 3])},
                 ${slug + ".pdf"}, 'application/pdf', 4, ${new TextEncoder().encode("%PDF")})
      returning id
  `).firstOrThrow().id;
}

function makeOrder(email: string, productId: string, amountCents: number): string {
  return sql<{ id: string }>(`
    insert into orders (email, productId, amountCents) values (${email}, ${productId}, ${amountCents}) returning id
  `).firstOrThrow().id;
}

function tokenOf(orderId: string): string {
  return sql<{ downloadToken: string }>(`select downloadToken from orders where id = ${orderId}`).firstOrThrow().downloadToken;
}

test("recording a payment", () => {
  let productId = makeProduct("guide", 1900);
  let orderId = makeOrder("buyer@example.com", productId, 1900);

  equal(recordPayment(orderId, "cs_test_1", 1900), true, "the first report marks the order paid");
  equal(recordPayment(orderId, "cs_test_1", 1900), false, "a repeat report changes nothing");

  let order = sql<{ status: string; days: number; stripeSessionId: string }>(`
    select status, round(extract(epoch from expiresAt - paidAt) / 86400)::int as days, stripeSessionId
      from orders where id = ${orderId}
  `).firstOrThrow();

  equal(order.status, "paid");
  equal(order.days, 30, "the link expires thirty days after payment");
  equal(order.stripeSessionId, "cs_test_1");
});

test("a download link works five times", () => {
  let productId = makeProduct("pack", 2400);
  let orderId = makeOrder("buyer@example.com", productId, 2400);
  recordPayment(orderId, "cs_test_2", 2400);

  let token = tokenOf(orderId);

  for (let i = 0; i < DOWNLOAD_LIMIT; i++) {
    let file = spendDownload(token);
    assert(file !== undefined, `download ${i + 1} is served`);
    equal(file?.fileName, "pack.pdf");
  }

  equal(spendDownload(token), undefined, "the sixth download is refused");
  equal(linkState(findLink(token)!), "used");

  let served = sql<{ n: number }>(`select count(*)::int as n from downloads where orderId = ${orderId}`).firstOrThrow();
  equal(served.n, DOWNLOAD_LIMIT, "every served download is counted for the product");
});

test("an expired link is refused", () => {
  let productId = makeProduct("old", 1200);
  let orderId = makeOrder("buyer@example.com", productId, 1200);
  recordPayment(orderId, "cs_test_3", 1200);
  sql(`update orders set expiresAt = now() - interval '1 minute' where id = ${orderId}`);

  equal(spendDownload(tokenOf(orderId)), undefined);
  equal(linkState(findLink(tokenOf(orderId))!), "expired");
});

test("an unpaid order has no download", () => {
  let productId = makeProduct("pending", 1200);
  let orderId = makeOrder("buyer@example.com", productId, 1200);

  equal(spendDownload(tokenOf(orderId)), undefined);
  equal(findLink(tokenOf(orderId)), undefined);
});

test("the library lists every purchase for one email", () => {
  let a = makeProduct("a", 1000);
  let b = makeProduct("b", 2000);
  recordPayment(makeOrder("ada@example.com", a, 1000), "cs_a", 1000);
  recordPayment(makeOrder("ada@example.com", b, 2000), "cs_b", 2000);
  recordPayment(makeOrder("grace@example.com", a, 1000), "cs_c", 1000);
  makeOrder("ada@example.com", b, 2000);

  equal(linksForEmail("ada@example.com").length, 2, "paid orders only, this email only");
  equal(libraryToken("ada@example.com"), libraryToken("ada@example.com"), "one library link per email");
});

test("the creator's dashboard and resend", () => {
  let creator = sql<{ id: string }>(`
    insert into users (email, name, passwordHash, role)
         values ('owner@example.com', 'Owner', crypt('secret-pass', genSalt('bf', 4)), 'admin')
      returning id
  `).firstOrThrow();

  let productId = makeProduct("deck", 2900);
  let orderId = makeOrder("buyer@example.com", productId, 2900);
  recordPayment(orderId, "cs_d", 2900);

  let token = tokenOf(orderId);
  spendDownload(token);

  test("totals count paid sales and downloads", () => {
    let dash = loadDashboard();
    equal(dash.revenueCents, 2900);
    equal(dash.salesCount, 1);
    equal(dash.downloads, 1);
    equal(dash.products.find((p) => p.id === productId)?.downloads, 1);
  });

  test("resend needs the creator", () => {
    let refused = false;

    try {
      resendDownload(orderId);
    } catch {
      refused = true;
    }

    assert(refused, "a visitor cannot resend");
  });

  test("resend mints a fresh link", () => {
    signin("owner@example.com", "secret-pass");
    equal(session.get("userId"), creator.id);

    resendDownload(orderId);

    let fresh = tokenOf(orderId);
    assert(fresh !== token, "the token changes");
    equal(findLink(fresh)!.downloadCount, 0, "the count starts over");
    equal(spendDownload(token), undefined, "the old link stops working");
  });
});
