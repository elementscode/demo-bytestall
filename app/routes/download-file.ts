import { Request, Response } from "@elements/app";
import { spendDownload } from "#app/shared/services/links";
import { salesChannel } from "#app/shared/services/sales";

export default function downloadFile(req: Request, res: Response) {
  let file = spendDownload(String(req.params.token));

  if (!file) {
    // Used up, expired or unknown: the download page says which.
    res.redirect(`/download/${req.params.token}`, 303);
    return;
  }

  salesChannel.notify({ event: "refresh" });

  // Always an attachment: the browser saves the file rather than rendering a
  // PDF or anything else on this origin.
  res.setHeader("Content-Type", file.fileType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/"/g, "")}"`);
  res.setHeader("Cache-Control", "private, no-store");

  return file.fileData;
}
