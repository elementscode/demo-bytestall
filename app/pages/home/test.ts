import { test, equal } from "@elements/app";
import { formatPrice, productKind } from "#app/shared/services/catalog";

test("shop cards", () => {
  equal(formatPrice(2400), "$24");
  equal(formatPrice(2450), "$24.50");
  equal(productKind("application/pdf"), "Ebook");
  equal(productKind("application/zip"), "Template pack");
});
