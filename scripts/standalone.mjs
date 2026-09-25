// Portable preview: recursively rewrite static relative imports to browser-native data URLs.
// The deployable project remains standard ES modules under dist/. No runtime loader required.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const memo = new Map();
const visiting = new Set();
async function embed(file) {
  if (memo.has(file)) return memo.get(file);
  if (visiting.has(file)) throw new Error('Standalone export does not support circular imports.');
  visiting.add(file);
  let text = (await readFile(file, 'utf8')).replace(/\/\/# sourceMappingURL=.*$/gm, '');
  const imports = [...text.matchAll(/\bfrom\s+(['"])(\.\.?\/[^'"]+)\1/g)];
  for (const match of imports) {
    const url = await embed(resolve(dirname(file), match[2]));
    text = text.replace(match[0], `from '${url}'`);
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
  visiting.delete(file); memo.set(file, url); return url;
}
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const css = await readFile(resolve(dist, 'assets/styles.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="./assets/styles.css">', `<style>${css}</style>`);
html = html.replace('<script type="module" src="./assets/app.js"></script>', `<script type="module" src="${await embed(resolve(dist, 'assets/app.js'))}"></script>`);
await mkdir(resolve(root, 'artifacts'), { recursive: true });
const out = resolve(root, 'artifacts/peibu-prototype.html'); await writeFile(out, html);
console.log(`Portable preview: ${relative(root, out)} (${Buffer.byteLength(html)} bytes).`);
