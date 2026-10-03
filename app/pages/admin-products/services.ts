import { File, sql, ValidationError } from "@elements/app";
import { isUserAdminOrThrow } from "#app/shared/services/admin";

export interface ProductRow {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  coverHash: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sales: number;
}

export interface NewProduct {
  title: string;
  description: string;
  price: string;
  cover?: File;
  file?: File;
}

const COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_COVER = 5 * 1024 * 1024;
const MAX_FILE = 25 * 1024 * 1024;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

/** Dollars as typed ("24", "$24.50") to cents, or NaN. */
export function parsePrice(price: string): number {
  let clean = price.trim().replace(/^\$/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
    return NaN;
  }

  return Math.round(parseFloat(clean) * 100);
}

/**
 * The product file's type, read from its first bytes. The browser's content
 * type is whatever the uploader's OS guessed, and a zip in particular arrives
 * under several names.
 */
export function sniffFileType(data: Uint8Array): "application/pdf" | "application/zip" | "" {
  if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
    return "application/pdf";
  }

  if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    return "application/zip";
  }

  return "";
}

export function listProductRows(): ProductRow[] {
  return sql<ProductRow>(`
    select p.id, p.slug, p.title, p.priceCents, p.coverHash, p.fileName, p.fileType, p.fileSize,
           (select count(*)::int from orders o where o.productId = p.id and o.status = 'paid') as sales
      from products p
     order by p.createdAt desc
  `).all();
}

/** @rpc */
export function createProduct(form: NewProduct): ProductRow[] {
  isUserAdminOrThrow();

  let errors: { [K in keyof NewProduct]?: string[] } = {};
  let title = form.title.trim();
  let description = form.description.trim();
  let priceCents = parsePrice(form.price);
  let fileType = form.file ? sniffFileType(form.file.data) : "";

  if (!title) {
    errors.title = ["Give the product a title."];
  }

  if (!description) {
    errors.description = ["Describe what the buyer gets."];
  }

  if (Number.isNaN(priceCents) || priceCents < 50) {
    errors.price = ["Enter a price of at least $0.50, like 24 or 24.50."];
  }

  if (!form.cover) {
    errors.cover = ["Choose a cover image."];
  } else if (!COVER_TYPES.has(form.cover.contentType)) {
    errors.cover = ["The cover must be a PNG, JPEG, WebP or SVG image."];
  } else if (form.cover.size > MAX_COVER) {
    errors.cover = ["The cover must be under 5 MB."];
  }

  if (!form.file) {
    errors.file = ["Choose the PDF or ZIP the buyer downloads."];
  } else if (!fileType) {
    errors.file = ["The file must be a PDF or a ZIP."];
  } else if (form.file.size > MAX_FILE) {
    errors.file = ["The file must be under 25 MB."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let base = slugify(title);
  let taken = sql<{ slug: string }>(`select slug from products where slug = ${base} or slug like ${base + "-%"}`).all();
  let slug = base;

  for (let n = 2; taken.some((t) => t.slug === slug); n++) {
    slug = `${base}-${n}`;
  }

  sql(`
    insert into products (slug, title, description, priceCents, coverType, coverData, fileName, fileType, fileSize, fileData)
         values (${slug}, ${title}, ${description}, ${priceCents}, ${form.cover!.contentType}, ${form.cover!.data},
                 ${form.file!.name}, ${fileType}, ${form.file!.size}, ${form.file!.data})
  `);

  return listProductRows();
}
