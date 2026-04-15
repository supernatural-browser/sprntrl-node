import { Sprntrl } from "sprntrl";
import type { Browser } from "playwright";

async function main() {
  const client = new Sprntrl();

  const session = await client.sessions.create({ os: "macos", location: "us-east" });
  try {
    const browser = (await client.sessions.connect(session.id, {
      autoWhitelist: true,
    })) as Browser;

    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto("https://bot.sannysoft.com", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: "sannysoft.png", fullPage: true });
    console.log(`saved sannysoft.png (session ${session.id})`);

    await browser.close();
  } finally {
    await client.sessions.stop(session.id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
