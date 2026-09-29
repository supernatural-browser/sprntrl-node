import { test } from "node:test";
import assert from "node:assert/strict";
import { Sessions } from "../dist/resources/sessions.js";

async function createBody(params) {
  const calls = [];
  const client = { request: async (opts) => (calls.push(opts), {}) };
  await new Sessions(client).create(params);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].path, "/api/v1/sessions");
  return calls[0].body;
}

test("create() omits the new fields when unset", async () => {
  const body = await createBody({ os: "macos", location: "America/New_York" });
  assert.deepEqual(body, { os: "macos", location: "America/New_York", persistent: false });
});

test("create() serializes country, disable_geolocation, proxy_relay, fingerprint_overrides", async () => {
  const overrides = { userAgent: "x", screen: { width: 412 } };
  const body = await createBody({
    os: "android",
    country: "GB",
    disable_geolocation: true,
    proxy_relay: true,
    fingerprint_overrides: overrides,
  });
  assert.deepEqual(body, {
    os: "android",
    persistent: false,
    country: "GB",
    disable_geolocation: true,
    proxy_relay: true,
    fingerprint_overrides: overrides,
  });
});

test("create() sends proxy_relay: false explicitly", async () => {
  const body = await createBody({ os: "windows", location: "Europe/London", proxy_relay: false });
  assert.equal(body.proxy_relay, false);
});
