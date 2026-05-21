import { UAParser } from "ua-parser-js";

export function parseUA(ua: string) {
  const parser = new UAParser(ua);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (device.type === "mobile") deviceType = "mobile";
  else if (device.type === "tablet") deviceType = "tablet";

  return {
    deviceType,
    browser: browser.name ?? "Unknown",
    os: os.name ?? "Unknown",
  };
}

export function anonymizeIp(ip: string): string {
  if (!ip) return "";
  // IPv4: keep first 3 octets
  const v4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (v4) return `${v4[1]}.0`;
  // IPv6: keep first 4 groups
  if (ip.includes(":")) {
    const parts = ip.split(":").slice(0, 4);
    return parts.join(":") + "::0";
  }
  return ip;
}

export function getCountry(req: Request): string | null {
  const cf = (req as Request & { headers: Headers }).headers.get("cf-ipcountry");
  return cf && cf !== "XX" ? cf : null;
}
