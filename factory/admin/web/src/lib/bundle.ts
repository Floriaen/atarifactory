import type { GameBundle } from './types';

/**
 * Flatten a multi-file GameBundle into ONE self-contained HTML string for an
 * `<iframe srcdoc sandbox="allow-scripts">`. A srcdoc iframe has no base URL, so the bundle's
 * relative `<script src>` / `<link href>` references can't resolve — we splice each referenced
 * file's contents inline. Mirrors `make play`, but with everything in a single document.
 */
export function inlineBundle(bundle: GameBundle): string {
  const byPath = new Map(bundle.files.map((f) => [f.path, f.contents]));
  const entry = byPath.get(bundle.entry) ?? '';

  return entry
    .replace(/<link[^>]*href="([^"]+)"[^>]*>/g, (whole, href: string) => {
      const css = byPath.get(href);
      return css != null ? `<style>\n${css}\n</style>` : whole;
    })
    .replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (whole, src: string) => {
      const js = byPath.get(src);
      return js != null ? `<script>\n${js}\n</script>` : whole;
    });
}
