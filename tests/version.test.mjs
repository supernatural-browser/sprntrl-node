import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("User-Agent reports the package.json version", async () => {
  const { USER_AGENT } = await import("../dist/core/request.js");
  assert.equal(USER_AGENT, `sprntrl-node/${pkg.version}`);
});
