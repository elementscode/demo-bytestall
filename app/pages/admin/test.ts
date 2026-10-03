import { test, assert, equal } from "@elements/app";
import route from "./index";
import { maxDownloads, money } from "./template";

test("the dashboard is creator only", () => {
  let refused = false;

  try {
    route({ params: {} } as any, {} as any);
  } catch {
    refused = true;
  }

  assert(refused, "a visitor is turned away");
});

test("dashboard formatting", () => {
  equal(money(24400), "$244.00");
  equal(maxDownloads([]), 1, "an empty store still draws bars");
});
