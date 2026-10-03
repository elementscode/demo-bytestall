export const DOWNLOAD_LIMIT = 5;
export const DOWNLOAD_DAYS = 30;

export type LinkState = "ready" | "used" | "expired";

export function linkState(link: { downloadCount: number; expiresAt: Date }): LinkState {
  if (link.expiresAt.getTime() <= Date.now()) {
    return "expired";
  }

  return link.downloadCount >= DOWNLOAD_LIMIT ? "used" : "ready";
}

export function downloadsLeft(link: { downloadCount: number }): number {
  return Math.max(0, DOWNLOAD_LIMIT - link.downloadCount);
}
