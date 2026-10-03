import { test, assert, equal } from "@elements/app";
import { isEmail } from "./template";

test("buy form accepts only an email address", () => {
  assert(isEmail("ada@example.com"));
  equal(isEmail("ada"), false);
  equal(isEmail("ada@example"), false);
  equal(isEmail("a da@example.com"), false);
});
