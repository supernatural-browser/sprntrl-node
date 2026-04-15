import { SprntrlError } from "../core/error.js";
import type { Sprntrl } from "../client.js";
import type { Session } from "../types.js";

export interface ConnectArgs {
  framework?: "playwright" | "puppeteer";
  autoWhitelist?: boolean;
}

function cdpUrlFor(client: Sprntrl, session: Session): string {
  // Build the URL from the client's base URL. The API proxies the WebSocket
  // through /api/v1/sessions/:id/cdp with an IP-whitelist check — this is what
  // external callers must hit. The server also returns session.cdp_url but
  // that's an internal host:port that isn't reachable from outside the API host.
  const base = new URL(client.baseURL);
  const scheme = base.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${base.host}/api/v1/sessions/${session.id}/cdp`;
}

export async function connect(
  client: Sprntrl,
  session: Session,
  opts: ConnectArgs = {},
): Promise<unknown> {
  const framework = opts.framework ?? "playwright";
  if (opts.autoWhitelist) {
    try {
      await client.request({
        method: "POST",
        path: "/api/v1/settings/ip-whitelist",
        body: { ip: "current" },
      });
    } catch {
      // Already-whitelisted or race; the connect attempt will surface real errors.
    }
  }
  const cdpUrl = cdpUrlFor(client, session);

  // Use a variable-indirected import so TypeScript does not resolve the
  // optional peer dependency's types at compile time.
  const dynImport: (name: string) => Promise<unknown> = (name) => import(name);

  if (framework === "playwright") {
    let mod: { chromium: { connectOverCDP: (url: string) => Promise<unknown> } };
    try {
      mod = (await dynImport("playwright")) as typeof mod;
    } catch {
      throw new SprntrlError(
        "playwright is not installed. Run `npm install playwright`.",
      );
    }
    return mod.chromium.connectOverCDP(cdpUrl);
  }

  if (framework === "puppeteer") {
    let mod: { connect: (args: { browserWSEndpoint: string }) => Promise<unknown> };
    try {
      mod = (await dynImport("puppeteer-core")) as typeof mod;
    } catch {
      try {
        mod = (await dynImport("puppeteer")) as typeof mod;
      } catch {
        throw new SprntrlError(
          "puppeteer is not installed. Run `npm install puppeteer` (or puppeteer-core).",
        );
      }
    }
    return mod.connect({ browserWSEndpoint: cdpUrl });
  }

  throw new SprntrlError(`Unsupported framework '${framework}'`);
}
