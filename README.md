# Supernatural Node SDK

Official Node.js / TypeScript client for the [Supernatural](https://supernatural.sh) stealth browser-as-a-service API.

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

const session = await client.sessions.create({ os: "macos", location: "America/New_York" });

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

### With `await using` (Node 20.11+ / TS 5.2+)

```ts
{
  await using handle = await client.sessions.browserSession(session.id, { autoWhitelist: true });
  const page = await (handle.browser as Browser).contexts()[0].newPage();
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

The SDK connects Puppeteer with `defaultViewport: null`, so pages keep the
persona's real window size. If you call `puppeteer.connect()` yourself, pass
`defaultViewport: null` too.

### Viewport: don't override it

Each session's window size comes from its persona. Overriding the viewport makes
`innerWidth` disagree with `document.documentElement.clientWidth` and
`matchMedia`, which sites can detect.

- Playwright: use `browser.contexts()[0]`. If you need a fresh context, use
  `browser.newContext({ viewport: null })`. A plain `newContext()` applies a
  1280×720 viewport.
- Avoid `page.setViewport()` (Puppeteer), `page.setViewportSize()` (Playwright)
  and `newContext({ viewport: {...} })`. They are all detectable on our browser.

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

## Session options

`sessions.create` takes the full option set:

```ts
const session = await client.sessions.create({
  os: "macos",                  // "macos" | "windows"
  location: "America/New_York", // IANA timezone (see Locations below)
  label: "Kentucky, US",        // pin the pool match to a specific labeled slice (ignored for BYO proxies)
  persistent: true,             // keep the profile for later resume (default false)
  session_name: "my-profile",   // name for the persistent profile
  captcha_solver: true,         // auto-solves hCaptcha, Turnstile, reCAPTCHA and more (charged per solve)
  isolated_world: true,         // default true — keep on for stealth; set false only to access
                                // page-defined JS globals (main-world execution is detectable)
  headless: false,              // deprecated and ignored — headless is disabled platform-wide
                                // (headless Chrome is trivially detectable); sessions always run headed
  block_images: true,           // default false; cuts bandwidth and speeds up loads
  proxy: "http://user:pass@host:8080", // string URL or { protocol, host, port, username, password };
                                       // HTTP / HTTPS / SOCKS5
});
```

### Locations

```ts
const { options, accepts_iana } = await client.sessions.listLocations();
// options: [{ location: "America/New_York", label: "Kentucky, US" }, ...]
```

Pool-proxy sessions must pick a `location` (and optionally `label`) from `options`. `accepts_iana: true` means BYO-proxy sessions may instead pass any IANA timezone as `location`.

## Persistent sessions (profiles)

```ts
const session = await client.sessions.create({
  os: "macos",
  location: "America/New_York",
  persistent: true,
  session_name: "my-profile",
});
// ... automate ...
await client.sessions.stop(session.id); // profile is kept

// Later — resume, optionally overriding any create-time option:
const resumed = await client.sessions.resume(session.id, { block_images: true });

// Done with the profile entirely:
await client.sessions.deletePersistent(session.id);
```

Every `resume` option is an override; omitted fields keep their stored values. Changing `os` or `location` rebuilds the profile's pinned fingerprint (an intentional one-time identity drift); changing `location` on a pool session also re-assigns the pool proxy for the new region. Supplying `proxy` switches a pool session to BYO — switching BYO back to pool is not supported (delete and recreate instead).

## Files

```ts
const files = await client.sessions.files.list(session.id);
const data = await client.sessions.files.download(session.id, "report.csv");
await client.sessions.files.upload(session.id, "input.json", JSON.stringify(payload));
```

Uploads are capped at 100 MiB per request.

## Extensions

Ephemeral sessions load extensions inline at create — each entry uses exactly one of `webstoreUrl`, `crxUrl`, or `uploadB64`:

```ts
await client.sessions.create({
  os: "macos",
  location: "America/New_York",
  extensions: [{ webstoreUrl: "https://chromewebstore.google.com/detail/..." }],
});
```

Persistent profiles manage extensions through the dedicated resource instead:

```ts
// add() takes exactly one of `upload`, `webstoreUrl`, or `crxUrl`:
const ext = await client.sessions.extensions.add(session.id, { crxUrl: "https://example.com/my.crx" });
await client.sessions.extensions.list(session.id);
await client.sessions.extensions.setEnabled(session.id, ext.id, false);
await client.sessions.extensions.remove(session.id, ext.id);
```

Manifest V3 only (Chromium 148 dropped MV2). Max 16 extensions per profile. Uploads via `extensions.add` are capped at 50 MiB; inline `uploadB64` at create is bound by the 8 MiB request-body limit on `POST /api/v1/sessions`, so use the persistent sub-resource for anything larger. Changes take effect at the next session start — stop and resume to apply.

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

- `client.sessions` — `create`, `list`, `listActive`, `listHistory`, `listResumable`, `listPersistent`, `listLocations`, `get`, `stop`, `resume`, `deletePersistent`, `waitUntilReady`, `connect`, `browserSession`, `cdpUrl`
- `client.sessions.files` — `list`, `download`, `upload`
- `client.sessions.extensions` — `add`, `list`, `setEnabled`, `remove`
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
  await client.sessions.create({ os: "macos", location: "America/New_York" });
} catch (err) {
  if (err instanceof RateLimitError) console.log("rate limited", err.status);
  else if (err instanceof AuthenticationError) console.log("bad API key");
  else if (err instanceof APIError) console.log("api error", err.status, err.body);
  else throw err;
}
```

5xx, 408 and connection errors are retried automatically up to `maxRetries`. A 429 is retried only when it's a real throttle — quota 429s (`concurrent_session_limit`, `usage_limit_exceeded`, `persistent_profile_limit`, `bandwidth_limit_reached`, `byo_not_supported`) throw immediately, since waiting can't clear them. A server `Retry-After` is honoured when present (capped at 30s), otherwise backoff is exponential. 409 is never retried.

## Gotchas

- **CDP access is IP-whitelist gated.** The WebSocket at `/api/v1/sessions/:id/cdp` does not accept bearer auth — instead your public IP (as Cloudflare sees it) must be in your account's whitelist. Use `client.ipWhitelist.add("current")` or pass `{ autoWhitelist: true }` to `sessions.connect`.
- **Sessions start async.** `sessions.create` returns immediately with `status: "creating"`. Call `sessions.waitUntilReady(id)` before connecting, or just use `sessions.connect()` which waits for you.
- **API key is shown only once.** `apiKeys.create()` returns the full `key` field exactly once — store it immediately.
- **Dropping to raw HTTP? The scheme is `ApiKey`, not `Bearer`.** Send `Authorization: ApiKey sk_...`. `Bearer sk_...` is routed to the JWT branch and 401s. There is no `X-API-Key` header.
- **A lapsed account returns 402, not 401.** Session routes sit behind the billing gate, so a valid key on a non-active account gets `402 Payment Required`.

## License

MIT
