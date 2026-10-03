import { sql } from "@elements/app";
import { DOWNLOAD_LIMIT } from "#app/shared/services/downloads";

export interface DownloadLink {
  orderId: string;
  email: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  coverHash: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  amountCents: number;
  paidAt: Date;
  downloadToken: string;
  downloadCount: number;
  expiresAt: Date;
}

export function findLink(token: string): DownloadLink | undefined {
  return sql<DownloadLink>(`
    select o.id as orderId, o.email, p.id as productId, p.title as productTitle, p.slug as productSlug,
           p.coverHash, p.fileName, p.fileType, p.fileSize,
           o.amountCents, o.paidAt, o.downloadToken, o.downloadCount, o.expiresAt
      from orders o
      join products p on p.id = o.productId
     where o.downloadToken = ${token} and o.status = 'paid'
  `).first();
}

export function linksForEmail(email: string): DownloadLink[] {
  return sql<DownloadLink>(`
    select o.id as orderId, o.email, p.id as productId, p.title as productTitle, p.slug as productSlug,
           p.coverHash, p.fileName, p.fileType, p.fileSize,
           o.amountCents, o.paidAt, o.downloadToken, o.downloadCount, o.expiresAt
      from orders o
      join products p on p.id = o.productId
     where o.email = ${email} and o.status = 'paid'
     order by o.paidAt desc
  `).all();
}

export function libraryToken(email: string): string {
  return sql<{ token: string }>(`
    insert into libraries (email) values (${email})
    on conflict (email) do update set email = excluded.email
    returning token
  `).firstOrThrow().token;
}

export function findOrderLink(orderId: string): DownloadLink | undefined {
  let row = sql<{ downloadToken: string }>(`select downloadToken from orders where id = ${orderId}`).first();

  return row ? findLink(row.downloadToken) : undefined;
}

export interface SpentDownload {
  fileName: string;
  fileType: string;
  fileData: Buffer;
}

/**
 * Spends one download and returns the file, or undefined when the link is
 * used up, expired or unknown. The count and the expiry are checked in the
 * same update that spends it, so two clicks at once cannot both take the last
 * download.
 */
export function spendDownload(token: string): SpentDownload | undefined {
  let order = sql<{ id: string; productId: string }>(`
    update orders
       set downloadCount = downloadCount + 1
     where downloadToken = ${token}
       and status = 'paid'
       and downloadCount < ${DOWNLOAD_LIMIT}
       and expiresAt > now()
    returning id, productId
  `).first();

  if (!order) {
    return undefined;
  }

  sql(`insert into downloads (orderId) values (${order.id})`);

  return sql<SpentDownload>(`
    select fileName, fileType, fileData from products where id = ${order.productId}
  `).firstOrThrow();
}
