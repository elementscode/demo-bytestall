import { test, assert } from "@elements/app";
import route from "./index";

test("admin-products is creator only", () => {
  let refused = false;

  try {
    route({ params: {} } as any, {} as any);
  } catch {
    refused = true;
  }

  assert(refused, "a visitor is turned away");
});
