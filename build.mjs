/**
 * Copy the site into `public/`, which is the directory Cloudflare serves.
 *
 * This exists because the two copies drifted, silently, for weeks. The repo
 * root holds the source, `wrangler.json` points `assets.directory` at
 * `./public`, and nothing connected the two but somebody remembering to copy
 * the files by hand. They stopped matching: `public/app.js` was several
 * versions behind, so work that was committed and reviewed was never live.
 *
 * A build step is the fix. The root is the only place anyone edits, `public/`
 * is output, and output is never edited.
 *
 * `public/` stays committed on purpose. Workers Builds deploys whatever is in
 * the repository unless the dashboard sets a build command, so gitignoring
 * the output would deploy an empty site. Once the dashboard has
 * `npm run build` as the build command, `public/` can be gitignored.
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * The legal pages ship with the waitlist, because they have to exist before the
 * product does. Google's YouTube API audit and its OAuth verification both
 * require a **publicly reachable** privacy policy, and ours was a 404: it lived
 * in the Website/ directory, which is not what zoxia.site serves.
 *
 * They are built on , the one design system every page links, so
 * there is no longer a second design on the pages a cautious customer and a
 * Google auditor both read closely.
 *
 * `pricing.html` is deliberately not here. The plans page is built and not
 * launched, and the nav link to it has been removed from these pages rather than
 * left pointing at a 404 on the one page an auditor reads.
 */
const FILES = [
  'index.html',
  'app.js',
  // The one design system, linked by every page.
  'site.css',
  'favicon.png',
  'support.html',
  // The plans page and the page Paystack returns to. They ship together or the
  // second half of a payment is a 404.
  'pricing.html',
  'paid.html',
];
const DIRS = ['assets', 'r', 'legal'];
const OUT = 'public';

await mkdir(OUT, { recursive: true });

for (const file of FILES) {
  if (!existsSync(file)) {
    console.error(`[build] Missing ${file}. Refusing to publish a partial site.`);
    process.exit(1);
  }
  await cp(file, `${OUT}/${file}`);
  console.log(`[build] ${file}`);
}

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  // Removed first, so a file deleted from source does not linger in output.
  await rm(`${OUT}/${dir}`, { recursive: true, force: true });
  await cp(dir, `${OUT}/${dir}`, { recursive: true });
  console.log(`[build] ${dir}/`);
}

console.log('[build] Done. public/ now matches the source.');
