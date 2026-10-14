export declare function canonicalRedirect(
  req: { method?: string; url?: string; headers: { host?: string } },
  publicUrl?: string,
): string | null;
