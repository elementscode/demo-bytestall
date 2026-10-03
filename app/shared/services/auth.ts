import { sql, session, AuthError } from "@elements/app";

interface User {
  id: string;
  name: string;
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("enter your email and password");
  }

  let user = sql<User>(`
    select id, name from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("invalid email or password");
  }

  session.login({ userId: user.id, userName: user.name });
}

/** @rpc */
export function signout() {
  session.logout();
}
