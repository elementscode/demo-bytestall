import { sql, session, ForbiddenError } from "@elements/app";

export function isUserAdmin(userId: string): boolean {
  return !sql(`select 1 from users where id = ${userId} and role = 'admin'`).empty();
}

export function isUserAdminOrThrow() {
  session.isLoggedInOrThrow();

  if (!isUserAdmin(session.getOrThrow("userId"))) {
    throw new ForbiddenError("admin access required");
  }
}

/** For public pages that show the creator a way back to the dashboard. */
export function currentUserIsAdmin(): boolean {
  let userId = session.get("userId");

  return userId ? isUserAdmin(userId) : false;
}
