/** Build a small static deployment; never publish the repository root or source maps. */
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'site');
try {
  const info = await lstat(output).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (info?.isSymbolicLink() || (info && !info.isDirectory())) {
    throw new Error('Refusing to replace a non-directory or symbolic-link site output.');
  }
  await rm(output, { recursive: true, force: true });
  await mkdir(resolve(output, 'assets'), { recursive: true });
  const build = spawnSync(process.execPath, [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '--outDir', resolve(output, 'assets'), '--sourceMap', 'false',
  ], { cwd: root, stdio: 'inherit' });
  if (build.error || build.status !== 0) throw new Error('Hosted TypeScript build failed.');
  await cp(resolve(root, 'index.html'), resolve(output, 'index.html'));
  await cp(resolve(root, 'src/styles.css'), resolve(output, 'assets/styles.css'));
  await writeFile(resolve(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
  await writeFile(resolve(output, 'deployment.json'), JSON.stringify({
    app: 'peibu-prototype', version: pkg.version,
    commit: /^[0-9a-f]{40}$/i.test(candidate) ? candidate : null,
    kind: 'static-demo', storage: 'browser-local-only',
  }, null, 2) + '\n');

  async function walk(dir) {
    const paths = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in hosted output.');
      if (entry.isDirectory()) paths.push(...await walk(file));
      else if (entry.isFile()) paths.push(file);
      else throw new Error('Unexpected output entry.');
    }
    return paths;
  }
  const files = await walk(output);
  for (const file of files) {
    const path = relative(output, file).split(sep).join('/');
    if (!/^(?:index\.html|robots\.txt|deployment\.json|assets\/[A-Za-z0-9_/-]+\.(?:js|css))$/.test(path)) {
      throw new Error(`Unexpected hosted file: ${path}`);
    }
    if (file.endsWith('.js')) {
      const code = await readFile(file, 'utf8');
      if (code.includes('sourceMappingURL=')) throw new Error(`Unexpected source map reference: ${path}`);
      for (const match of code.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const dependency = resolve(dirname(file), match[1]);
        if (!dependency.startsWith(output + sep) || !files.includes(dependency)) {
          throw new Error(`Broken module reference in ${path}`);
        }
      }
    }
  }
  const index = await readFile(resolve(output, 'index.html'), 'utf8');
  for (const match of index.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
    if (!files.includes(resolve(output, match[1]))) throw new Error(`Missing entry asset: ${match[1]}`);
  }
  console.log(`Hosted output ready: site/ (${files.length} files; module references verified; no source maps).`);
  console.log('This builds files only. No deployment has been created by this script.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
