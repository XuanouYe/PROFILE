import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

export const subjects = ['film', 'opera', 'music'];
export function detailFields(entry) {
  if (entry.subject === 'film') return ['Film', 'Director', 'Year'];
  if (entry.subject === 'opera') return ['Opera', 'Director', 'Production year', 'Venue'];
  return ['Programme', 'Conductor', 'Orchestra', ...(entry.medium === 'live' ? ['Venues', 'Performance date'] : entry.medium === 'recording' ? ['label', 'Release date'] : [])];
}
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validate(entry, file) {
  const fail = message => { throw new Error(`${file}: ${message}`); };
  for (const key of ['title', 'slug', 'excerpt']) if (typeof entry[key] !== 'string' || !entry[key].trim()) fail(`${key} must be a nonempty string`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) fail('slug must be lowercase words separated by hyphens');
  if (!(!entry.longform && entry.publicationDate === null) && !validDate(entry.publicationDate)) fail('publicationDate must be YYYY-MM-DD (or null for an undated log)');
  if (entry.language !== undefined && !['zh-CN','en'].includes(entry.language)) fail('language must be zh-CN or en');
  if (entry.sourceUrl !== undefined && !/^https:\/\//.test(entry.sourceUrl)) fail('sourceUrl must use https');
  if (entry.importedAt !== undefined && !validDate(entry.importedAt)) fail('importedAt must be YYYY-MM-DD');
  if (!subjects.includes(entry.subject)) fail('subject must be exactly one of film, opera, music');
  if (entry.longform !== undefined && typeof entry.longform !== 'boolean') fail('longform must be boolean');
  for (const key of ['format', 'articleType', 'subjects']) if (key in entry) fail(`${key} is no longer supported`);
  if (entry.medium !== undefined && (entry.subject !== 'music' || !['live', 'recording'].includes(entry.medium))) fail('medium must be live or recording, for music only');
  if (entry.rating !== undefined && entry.rating !== null && (typeof entry.rating !== 'number' || !Number.isFinite(entry.rating) || entry.rating < 0 || entry.rating > 5 || !Number.isInteger(entry.rating * 2))) fail('rating must be a number from 0 to 5 in steps of 0.5, or null');
  if (typeof entry.draft !== 'boolean') fail('draft must be true or false');
  for (const key of ['featured', 'demo']) if (entry[key] !== undefined && typeof entry[key] !== 'boolean') fail(`${key} must be boolean`);
  if (entry.featured && !entry.longform) fail('only articles can be featured');
  if (entry.experienceDate && !validDate(entry.experienceDate)) fail('experienceDate must be YYYY-MM-DD');
  if (entry.experienceDate && !['Watched', 'Listened', 'Attended'].includes(entry.experienceLabel)) fail('experienceLabel must identify Watched, Listened, or Attended');
  if (entry.coverageYear !== undefined && (!Number.isInteger(entry.coverageYear) || entry.coverageYear < 1800 || entry.coverageYear > 9999)) fail('coverageYear must be a year');
  for (const key of ['related', 'workIds', 'performanceIds']) if (entry[key] !== undefined && (!Array.isArray(entry[key]) || entry[key].some(v => typeof v !== 'string' || !v))) fail(`${key} must be an array of identifiers`);
  if (entry.metadata !== undefined) {
    if (!entry.metadata || Array.isArray(entry.metadata) || typeof entry.metadata !== 'object') fail('metadata must be an object');
    const allowed = detailFields(entry);
    for (const [key, value] of Object.entries(entry.metadata)) {
      if (!allowed.includes(key)) fail(`metadata field ${key} is not allowed for ${entry.subject}${entry.medium ? ' / ' + entry.medium : ''}`);
      if (!['string', 'number'].includes(typeof value)) fail('metadata values must be text or numbers');
      if (['Year', 'Production year'].includes(key) && (!Number.isInteger(value) || value < 1800 || value > 9999)) fail(`${key} must be a year`);
      if (key === 'Release date' && value && !validDate(value)) fail('Release date must be YYYY-MM-DD');
    }
  }
  if (entry.translation !== undefined) {
    if (!entry.translation || typeof entry.translation !== 'object' || Array.isArray(entry.translation)) fail('translation must be an object');
    for (const [key, value] of Object.entries(entry.translation)) {
      if (!['originalAuthor', 'sourceTitle', 'sourceUrl', 'sourceLanguage', 'translator'].includes(key) || typeof value !== 'string') fail('invalid translation credit');
      if (key === 'sourceUrl' && !/^https?:\/\//.test(value)) fail('sourceUrl must use https or http');
    }
  }
  return entry;
}

async function files(dir) {
  const items = await fs.readdir(dir, {withFileTypes:true}).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  return (await Promise.all(items.map(item => item.isDirectory() ? files(path.join(dir,item.name)) : item.name.endsWith('.md') ? [path.join(dir,item.name)] : []))).flat();
}
export async function loadEntries(root, includeExamples) {
  const paths = [...await files(path.join(root,'content/entries')), ...(includeExamples ? await files(path.join(root,'content/examples')) : [])];
  const all = await Promise.all(paths.map(async file => {
    const source = await fs.readFile(file, 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: missing YAML front matter`);
    const entry = validate(YAML.parse(match[1]), file);
    if (file.includes(`${path.sep}examples${path.sep}`)) entry.demo = true;
    const translationPath = path.join(root,'content/translations/en',`${entry.slug}.md`);
    const translationSource = await fs.readFile(translationPath,'utf8').catch(error=>{if(error.code==='ENOENT') return null; throw error;});
    let english = null;
    if (translationSource !== null) {
      if (entry.language !== 'zh-CN' || !entry.longform) throw new Error(`${translationPath}: English translations require a Chinese article`);
      const translated = translationSource.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!translated) throw new Error(`${translationPath}: missing front matter`);
      const data = YAML.parse(translated[1]);
      if (typeof data.draft !== 'boolean') throw new Error(`${translationPath}: draft must be boolean`);
      if (!data.draft) {
        for (const key of ['title','excerpt']) if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${translationPath}: ${key} required`);
        if (!translated[2].trim()) throw new Error(`${translationPath}: a published translation needs a body`);
        english = {title:data.title,excerpt:data.excerpt,body:translated[2]};
      }
    }
    return {...entry, body:match[2], english};
  }));
  const ids = new Set();
  for (const entry of all) { if (ids.has(entry.slug)) throw new Error(`Duplicate slug: ${entry.slug}`); ids.add(entry.slug); }
  const published = all.filter(e => !e.draft).sort((a,b) => (b.publicationDate || '').localeCompare(a.publicationDate || '') || (a.sourceOrder ?? 0)-(b.sourceOrder ?? 0) || a.slug.localeCompare(b.slug));
  for (const entry of published) for (const slug of entry.related || []) if (!published.some(e => e.slug === slug)) throw new Error(`${entry.slug}: relationship ${slug} is missing or unpublished`);
  return published;
}
