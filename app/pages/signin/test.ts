import { test, assert, sql } from "@elements/app";
import { signin } from "#app/shared/services/auth";

test("sign in checks the password", () => {
  sql(`
    insert into users (email, name, passwordHash, role)
         values ('owner@example.com', 'Owner', crypt('right-pass', genSalt('bf', 4)), 'admin')
  `);

  let refused = false;

  try {
    signin("owner@example.com", "wrong-pass");
  } catch {
    refused = true;
  }

  assert(refused, "a wrong password is refused");
  signin("OWNER@example.com ", "right-pass");
});
