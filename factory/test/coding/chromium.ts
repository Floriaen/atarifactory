import { chromium } from 'playwright';

/**
 * Whether a Chromium that Playwright can launch is present. The browser-using tiers gate
 * themselves on this so a bare CI (no `playwright install`) still runs everything else; the
 * live e2e always needs it. Cached so the probe launch happens at most once per file.
 */
let cached: boolean | undefined;
export async function chromiumAvailable(): Promise<boolean> {
  if (cached !== undefined) return cached;
  try {
    const browser = await chromium.launch();
    await browser.close();
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}
