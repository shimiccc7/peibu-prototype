/** Explicit initial PRIVATE publication helper. No credentials are read or stored by this script. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
  return (result.stdout || '').trim();
}
try {
  if (process.cwd() !== root || JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).name !== 'peibu-prototype') throw new Error('Run only from the Peibu project root.');
  const name = process.argv[2] || 'peibu-prototype';
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,70}$/.test(name)) throw new Error('Provide only a new repository name, not a URL or organization.');
  run('git', ['--version']); run('gh', ['auth', 'status']);
  const login = run('gh', ['api', 'user', '--jq', '.login']);
  if (!/^[A-Za-z0-9-]+$/.test(login)) throw new Error('Could not verify GitHub login.');
  const author = run('git', ['config', 'user.name']); const email = run('git', ['config', 'user.email']);
  if (!author || !email) throw new Error('Configure your own Git author name/email first.');
  const existing = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
  if (existing.status === 0 && resolve(existing.stdout.trim()) !== root) throw new Error('Refusing to operate inside another repository.');
  if (existsSync(resolve(root, '.git')) && run('git', ['remote']).length) throw new Error('A remote already exists. Review it manually; no automatic push will occur.');
  console.log(`Target: ${login}/${name}\nVisibility: PRIVATE\nAuthor: ${author} <${email}>\nRoot: ${root}\nNo existing repository will be overwritten. No deployment will be enabled.`);
  console.log('Check the folder contains no real family data or secrets. The source directories will be staged.');
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirmation = await prompt.question('Type CREATE to initialize/commit and create the new private repository: '); prompt.close();
  if (confirmation !== 'CREATE') { console.log('Cancelled.'); process.exit(0); }
  if (!existsSync(resolve(root, '.git'))) run('git', ['init', '-b', 'main']);
  if (run('git', ['branch', '--show-current']) !== 'main') throw new Error('Expected main branch. Please review your branch manually.');
  const paths = ['package.json', 'package-lock.json', 'tsconfig.json', '.gitignore', '.editorconfig', '.nvmrc', 'index.html', 'README.md', 'AGENTS.md', 'CHANGELOG.md', 'requirements-e2e.txt', 'src', 'scripts', 'tests', 'docs', '.github'];
  run('git', ['add', '--', ...paths]);
  const staged = run('git', ['diff', '--cached', '--name-only']);
  console.log(staged || 'No staged changes.');
  if (staged) run('git', ['commit', '-m', 'feat: bootstrap Peibu local-first prototype'], { stdio: 'inherit' });
  run('gh', ['repo', 'create', `${login}/${name}`, '--private', '--source=.', '--remote=origin', '--push', '--description', 'Peibu family learning rhythm prototype'], { stdio: 'inherit' });
  console.log('Private repository created and push command completed. Verify the remote and Actions results on GitHub.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Stopped. No force push or visibility change is attempted. Partial initialization may remain locally; inspect git status before retrying.');
  process.exitCode = 1;
}
