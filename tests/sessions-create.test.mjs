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

test("create() serializes country", async () => {
  const body = await createBody({
    os: "android",
    country: "GB",
  });
  assert.deepEqual(body, {
    os: "android",
    persistent: false,
    country: "GB",
  });
});
