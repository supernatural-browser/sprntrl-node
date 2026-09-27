// Run: npm test (Node >= 22.15 for module.registerHooks).
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Stand-in for the optional puppeteer-core peer dependency: records connect() args.
const stub = "export async function connect(args) { globalThis.__connectCalls.push(args); return 'browser'; }";
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === "puppeteer-core"
      ? { url: `data:text/javascript,${encodeURIComponent(stub)}`, shortCircuit: true }
      : next(specifier, context),
});

test("puppeteer connect() passes defaultViewport: null", async () => {
  globalThis.__connectCalls = [];
  const { connect } = await import("../dist/lib/browser.js");
  const client = { baseURL: "https://api.example.test" };
  const out = await connect(client, { id: "s1" }, { framework: "puppeteer" });

  assert.equal(out, "browser");
  assert.deepEqual(globalThis.__connectCalls, [
    {
      browserWSEndpoint: "wss://api.example.test/api/v1/sessions/s1/cdp",
      defaultViewport: null,
    },
  ]);
});
