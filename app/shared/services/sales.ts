import { Channel, email, sql } from "@elements/app";
import { isUserAdminOrThrow } from "#app/shared/services/admin";
import { DOWNLOAD_DAYS, DOWNLOAD_LIMIT } from "#app/shared/services/downloads";
import { libraryToken } from "#app/shared/services/links";
import DownloadEmail from "#app/emails/download";

export interface Sale {
  id: string;
  email: string;
  productTitle: string;
  amountCents: number;
  paidAt: Date;
  downloadCount: number;
  expiresAt: Date;
}

export interface ProductStat {
  id: string;
  title: string;
  sales: number;
  revenueCents: number;
  downloads: number;
}

export interface Dashboard {
  revenueCents: number;
  salesCount: number;
  revenueWeekCents: number;
  salesWeek: number;
  downloads: number;
  buyers: number;
  products: ProductStat[];
  sales: Sale[];
}

/**
 * Carries only "something changed". Each admin page re-reads the numbers
 * through fetchDashboard, which checks the caller is the creator.
 */
export const salesChannel = new Channel<{ event: "refresh" }>("sales");

export function loadDashboard(): Dashboard {
  let totals = sql<Omit<Dashboard, "products" | "sales">>(`
    select coalesce(sum(amountCents), 0)::int as revenueCents,
           count(*)::int as salesCount,
           coalesce(sum(amountCents) filter (where paidAt > now() - interval '7 days'), 0)::int as revenueWeekCents,
           (count(*) filter (where paidAt > now() - interval '7 days'))::int as salesWeek,
           (select count(*)::int from downloads) as downloads,
           count(distinct email)::int as buyers
      from orders
     where status = 'paid'
  `).firstOrThrow();

  let products = sql<ProductStat>(`
    select p.id,
           p.title,
           (select count(*)::int from orders o where o.productId = p.id and o.status = 'paid') as sales,
           (select coalesce(sum(o.amountCents), 0)::int from orders o where o.productId = p.id and o.status = 'paid') as revenueCents,
           (select count(*)::int from downloads d join orders o on o.id = d.orderId where o.productId = p.id) as downloads
      from products p
     order by revenueCents desc, p.title
  `).all();

  let sales = sql<Sale>(`
    select o.id, o.email, p.title as productTitle, o.amountCents, o.paidAt, o.downloadCount, o.expiresAt
      from orders o
      join products p on p.id = o.productId
     where o.status = 'paid'
     order by o.paidAt desc
     limit 100
  `).all();

  return { ...totals, products, sales };
}

/** @rpc */
export function fetchDashboard(): Dashboard {
  isUserAdminOrThrow();

  return loadDashboard();
}

/**
 * Emails a paid order's download link, and the buyer's library link with it.
 * A reissue mints a fresh token with a full count and a new expiry, so a
 * buyer who ran out of downloads or waited too long gets a link that works.
 */
export function sendDownloadEmail(orderId: string, reissue: boolean) {
  if (reissue) {
    sql(`
      update orders
         set downloadToken = encode(gen_random_bytes(24), 'hex'),
             downloadCount = 0,
             expiresAt = now() + make_interval(days => ${DOWNLOAD_DAYS})
       where id = ${orderId} and status = 'paid'
    `);
  }

  let order = sql<{ email: string; productTitle: string; downloadToken: string; expiresAt: Date }>(`
    select o.email, p.title as productTitle, o.downloadToken, o.expiresAt
      from orders o
      join products p on p.id = o.productId
     where o.id = ${orderId} and o.status = 'paid'
  `).firstOrThrow("order not found");


  email({
    to: order.email,
    subject: `Your download: ${order.productTitle}`,
    body: new DownloadEmail({
      productTitle: order.productTitle,
      downloadUrl: `/download/${order.downloadToken}`,
      libraryUrl: `/library/${libraryToken(order.email)}`,
      expiresAt: order.expiresAt,
      limit: DOWNLOAD_LIMIT,
    }),
  });
}

/** @rpc */
export function resendDownload(orderId: string): Dashboard {
  isUserAdminOrThrow();

  sendDownloadEmail(orderId, true);
  salesChannel.notify({ event: "refresh" });

  return loadDashboard();
}
