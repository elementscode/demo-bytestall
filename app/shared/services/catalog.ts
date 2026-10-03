import { sql } from "@elements/app";

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  coverHash: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}

/** The hash in the path is what makes the cover safe to cache forever. */
export function coverUrl(p: { id: string; coverHash: string }): string {
  return `/covers/${p.id}/${p.coverHash}`;
}

export function formatPrice(cents: number): string {
  let dollars = cents / 100;

  return cents % 100 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function productKind(fileType: string): string {
  return fileType === "application/pdf" ? "Ebook" : "Template pack";
}

export function fileLabel(fileType: string): string {
  return fileType === "application/pdf" ? "PDF" : "ZIP";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function listProducts(): Product[] {
  return sql<Product>(`
    select id, slug, title, description, priceCents, coverHash, fileName, fileType, fileSize, createdAt
      from products
     order by createdAt desc
  `).all();
}

export function findProduct(slug: string): Product | undefined {
  return sql<Product>(`
    select id, slug, title, description, priceCents, coverHash, fileName, fileType, fileSize, createdAt
      from products
     where slug = ${slug}
  `).first();
}
