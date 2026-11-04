import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

const roots = ['.github/', '.githooks/', '.obsidian/', 'scripts/', 'tests/', 'templates/', 'public/'];
const rootFiles = new Set(['.gitignore', 'README.md', 'EDITING.md', 'Preview.command', 'package.json', 'pnpm-lock.yaml', 'site.config.json']);
const privatePaths = /^(?:\.private\/|content\/(?:drafts|sources|imports|examples)\/|scripts\/import-notion\.mjs$|node_modules\/|dist\/|\.preview\/|\.pnpm-store\/|\.obsidian\/(?:plugins\/|cache\/|workspace|appearance\.json))/;
const notionUrl = /https?:\/\/(?:[\w-]+\.)?(?:notion\.so|notion\.site|notion\.com)(?:[/:?#]|$)/i;
export function publicContentIssue(file, source = '') {
  if (privatePaths.test(file)) return 'Private or generated material is not allowed in the public repository.';
  if (!rootFiles.has(file) && !roots.some(root => file.startsWith(root)) && !/^content\/(?:entries\/|translations\/en\/)/.test(file)) return 'Keep private notes in content/drafts/; only site files belong in this repository.';
  if (/(?:^|\/)\.env(?:\.|$)|\.(?:key|pem)$/.test(file)) return 'Credentials must stay outside the public repository.';
  if (!/^content\/(?:entries|translations\/en)\/.*\.md$/.test(file)) return null;
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return 'Published Markdown needs YAML front matter.';
  let data;
  try { data = YAML.parse(match[1]); } catch { return 'Invalid YAML front matter.'; }
  if (data?.draft !== false) return 'This is a draft. Move it to content/drafts/ before syncing; publish only files with draft: false.';
  if (notionUrl.test(source) || data.sourceUrl !== undefined || data.importNote !== undefined) return 'Remove private import metadata and Notion original URLs from published content.';
  return null;
}
export function checkPublicContent({staged = false, ref = 'HEAD'} = {}) {
  const args = staged ? ['ls-files', '--cached', '-z'] : ['ls-tree', '-r', '--name-only', '-z', ref];
  const files = execFileSync('git', args, {encoding:'utf8'}).split('\0').filter(Boolean);
  const problems = [];
  for (const file of files) {
    const source = /^content\/(?:entries|translations\/en)\/.*\.md$/.test(file)
      ? execFileSync('git', ['show', staged ? `:${file}` : `${ref}:${file}`], {encoding:'utf8'}) : '';
    const issue = publicContentIssue(file, source);
    if (issue) problems.push(`${file}: ${issue}`);
  }
  if (problems.length) throw new Error('Public repository check failed:\n' + problems.join('\n'));
  console.log(`Public repository check passed for ${files.length} files.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const refIndex = process.argv.indexOf('--ref');
    checkPublicContent({staged:process.argv.includes('--staged'), ref:refIndex >= 0 ? process.argv[refIndex + 1] : 'HEAD'});
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
