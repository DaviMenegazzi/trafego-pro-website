import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.168.0.0", 16], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10],
  ["ff00::", 8], ["::ffff:0:0", 96],
] as const) blocked.addSubnet(network, prefix, "ipv6");

export function allowedImageProxyUrl(raw: string, supabaseUrls: Array<string | undefined>): URL | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname || isIP(url.hostname)) return null;
  const host = url.hostname.toLowerCase();
  const providerHost = host === "graph.facebook.com" || host.endsWith(".fbcdn.net") ||
    host.endsWith(".facebook.com") || host.endsWith(".fbsbx.com");
  const supabaseHost = supabaseUrls.some((candidate) => {
    if (!candidate) return false;
    try { return new URL(candidate).hostname.toLowerCase() === host; } catch { return false; }
  });
  return providerHost || supabaseHost ? url : null;
}

export async function imageProxyHostResolvesPublicly(hostname: string): Promise<boolean> {
  const addresses = await lookup(hostname, { all: true });
  return addresses.length > 0 && addresses.every(({ address, family }) =>
    !blocked.check(address, family === 4 ? "ipv4" : "ipv6"));
}
