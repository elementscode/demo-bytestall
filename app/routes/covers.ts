import { Request, Response, sql } from "@elements/app";

// Covers the browser may render on this origin. An svg cover is sent with a
// CSP that forbids script, so an uploaded svg cannot run code here.
const INLINE = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

const YEAR = 31536000;

export default function serveCover(req: Request, res: Response) {
  let cover = sql<{ coverType: string; coverHash: string; coverData: Buffer }>(`
    select coverType, coverHash, coverData from products where id = ${req.params.id}
  `).firstOrThrow("cover not found");

  if (req.params.hash !== cover.coverHash) {
    res.status(404);
    return res.end();
  }

  if (!INLINE.has(cover.coverType)) {
    res.status(404);
    return res.end();
  }

  res.setHeader("Content-Type", cover.coverType);
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);

  return cover.coverData;
}
