import { Sprntrl } from "sprntrl";

async function main() {
  const client = new Sprntrl();

  const session = await client.sessions.create({ os: "macos", location: "America/New_York" });
  console.log(`created ${session.id} (status=${session.status})`);

  const ready = await client.sessions.waitUntilReady(session.id);
  console.log(`ready: cdp_url=${ready.cdp_url}`);

  await client.sessions.stop(session.id);
  console.log("stopped");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
