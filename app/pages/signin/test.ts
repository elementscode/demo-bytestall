import { test, assert, sql } from "@elements/app";
import { signin } from "#app/shared/services/auth";

test("sign in checks the password", () => {
  // The email is unique and other test files insert owners too, so it gets a suffix.
  let email = `owner.${crypto.randomUUID().slice(0, 8)}@example.com`;
  sql(`
    insert into users (email, name, passwordHash, role)
         values (${email}, 'Owner', crypt('right-pass', genSalt('bf', 4)), 'admin')
  `);

  let refused = false;

  try {
    signin(email, "wrong-pass");
  } catch {
    refused = true;
  }

  assert(refused, "a wrong password is refused");
  signin(`${email.toUpperCase()} `, "right-pass");
});
