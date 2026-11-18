// Writes a tiny site that forwards every old GitHub Pages link to the same page on the new link.
// GitHub Pages serves 404.html for any path it does not have, so index.html + 404.html cover all paths.
// Usage: NEW_SITE_URL=https://hyperactive.pages.dev OLD_BASE_PATH=/Fitness-app node scripts/build-redirect.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2];
const target = (process.env.NEW_SITE_URL ?? '').trim().replace(/\/+$/, '');
const oldBase = (process.env.OLD_BASE_PATH ?? '').replace(/\/+$/, '');
if (!outDir) throw new Error('Pass the output folder.');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(target)) throw new Error(`NEW_SITE_URL must look like https://name.pages.dev, got "${target}"`);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Hyper Active has moved</title>
<script>
  (function () {
    var oldBase = ${JSON.stringify(oldBase)};
    var path = location.pathname;
    if (oldBase && path.indexOf(oldBase) === 0) path = path.slice(oldBase.length);
    // Keep the rest of the address (including sign-in tokens after # or ?).
    location.replace(${JSON.stringify(target)} + (path || '/') + location.search + location.hash);
  })();
</script>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px;text-align:center}a{color:#0284c7}</style>
</head>
<body>
<p>Hyper Active has a new address.<br><a href="${target}/">Open ${target.replace('https://', '')}</a></p>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), page);
writeFileSync(join(outDir, '404.html'), page);
console.log(`Forwarding pages written to ${outDir} -> ${target}`);
