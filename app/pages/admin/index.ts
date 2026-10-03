import { Request, Response } from "@elements/app";
import { isUserAdminOrThrow } from "#app/shared/services/admin";
import { loadDashboard, salesChannel } from "#app/shared/services/sales";
import html from "./template";

export default function route(req: Request, res: Response) {
  isUserAdminOrThrow();

  return new html({
    initial: loadDashboard(),
    listener: salesChannel.listen(),
  });
}
