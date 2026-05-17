# Sprntrl Node SDK

Official Node.js / TypeScript client for the [Sprntrl](https://supernatural.sh) stealth browser-as-a-service API.

## Installation

```bash
npm install sprntrl
# Optional — pick whichever browser automation library you use:
npm install playwright
npm install puppeteer
```

## Quick start

```ts
import { Sprntrl } from "sprntrl";
import type { Browser } from "playwright";

const client = new Sprntrl(); // reads SPRNTRL_API_KEY from env

const session = await client.sessions.create({ os: "macos", location: "us-east" });

// browserSession waits for the session, connects Playwright, and hands you
// a disposable handle. autoWhitelist registers your IP (CDP is IP-gated).
const handle = await client.sessions.browserSession(session.id, { autoWhitelist: true });
try {
  const browser = handle.browser as Browser;
  const page = await browser.contexts()[0].newPage();
  await page.goto("https://bot.sannysoft.com");
  await page.screenshot({ path: "out.png" });
} finally {
  await handle.close();
  await client.sessions.stop(session.id);
}
```

### With `await using` (Node 24+ / TS 5.2+)

```ts
{
  await using handle = await client.sessions.browserSession(session.id, { autoWhitelist: true });
  const page = await handle.browser.contexts()[0].newPage();
  await page.goto("https://example.com");
} // browser auto-closes here
```

### Puppeteer

```ts
const handle = await client.sessions.browserSession(session.id, {
  framework: "puppeteer",
  autoWhitelist: true,
});
```

### Lower-level `connect()` and `cdpUrl()`

If you want to manage the browser lifecycle yourself:

```ts
const browser = await client.sessions.connect(session.id, { autoWhitelist: true });
// ...
await browser.close();
```

Or get the raw CDP WebSocket URL for any CDP client (chrome-remote-interface, raw ws, etc.):

```ts
const url = client.sessions.cdpUrl(session.id);
// wss://api.supernatural.sh/api/v1/sessions/<id>/cdp
```

## Configuration

| Env var             | Default                    |
|---------------------|----------------------------|
| `SPRNTRL_API_KEY`   | —                          |
| `SPRNTRL_BASE_URL`  | `https://api.supernatural.sh`   |

Or per client:

```ts
const client = new Sprntrl({
  apiKey: "sk_...",
  baseURL: "https://api.supernatural.sh",
  timeout: 30_000,
  maxRetries: 2,
});
```

## Resources

- `client.sessions` — `create`, `list`, `listActive`, `listHistory`, `listResumable`, `listLocations`, `get`, `stop`, `resume`, `deletePersistent`, `waitUntilReady`, `connect`, `browserSession`, `cdpUrl`
- `client.sessions.files` — `list`, `download`, `upload`
- `client.profiles` — `create`, `list`, `get`, `update`, `duplicate`, `delete`
- `client.templates.list()`
- `client.ipWhitelist` — `list`, `add`, `remove`
- `client.usage` — `current`, `history`
- `client.user` — `me`, `update`, `updateSettings`, `changePassword`
- `client.apiKeys` — `list`, `create` (full key returned ONCE), `revoke`

## Error handling

```ts
import { Sprntrl, APIError, RateLimitError, AuthenticationError } from "sprntrl";

try {
  await client.sessions.create({ os: "macos", location: "us-east" });
} catch (err) {
  if (err instanceof RateLimitError) console.log("rate limited", err.status);
  else if (err instanceof AuthenticationError) console.log("bad API key");
  else if (err instanceof APIError) console.log("api error", err.status, err.body);
  else throw err;
}
```

Transient errors (5xx, 429, 408, connection errors) are retried automatically up to `maxRetries` with exponential backoff.

## Gotchas

- **CDP access is IP-whitelist gated.** The WebSocket at `/api/v1/sessions/:id/cdp` does not accept bearer auth — instead your public IP (as Cloudflare sees it) must be in your account's whitelist. Use `client.ipWhitelist.add("current")` or pass `{ autoWhitelist: true }` to `sessions.connect`.
- **Sessions start async.** `sessions.create` returns immediately with `status: "creating"`. Call `sessions.waitUntilReady(id)` before connecting, or just use `sessions.connect()` which waits for you.
- **API key is shown only once.** `apiKeys.create()` returns the full `key` field exactly once — store it immediately.

## License

MIT
