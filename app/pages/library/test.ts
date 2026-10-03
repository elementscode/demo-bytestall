import { test, assert } from "@elements/app";
import route from "./index";

test("an unknown library link is a 404", () => {
  let status = 0;

  try {
    route({ params: { token: "nope" } } as any, {} as any);
  } catch (err: any) {
    status = err.statusCode;
  }

  assert(status === 404, `expected 404, got ${status}`);
});
