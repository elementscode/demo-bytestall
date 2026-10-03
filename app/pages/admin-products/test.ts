import { test, equal } from "@elements/app";
import { parsePrice, slugify, sniffFileType } from "./services";

test("prices parse from dollars to cents", () => {
  equal(parsePrice("24"), 2400);
  equal(parsePrice("$24.50"), 2450);
  equal(parsePrice(" 9.9 "), 990);
  equal(Number.isNaN(parsePrice("twelve")), true);
  equal(Number.isNaN(parsePrice("1.999")), true);
});

test("titles become url slugs", () => {
  equal(slugify("Folio: Portfolio Site Template"), "folio-portfolio-site-template");
  equal(slugify("  ***  "), "product");
});

test("product files are recognized by their bytes", () => {
  equal(sniffFileType(new TextEncoder().encode("%PDF-1.4")), "application/pdf");
  equal(sniffFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])), "application/zip");
  equal(sniffFileType(new TextEncoder().encode("<html>")), "");
});
