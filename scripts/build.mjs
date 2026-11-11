import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEntries, escape as esc, subjects} from './content.mjs';
import {archiveUrl, articleIndex, localizedEntry, subjectLink} from './localized.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
const base = (process.env.BASE_PATH ?? config.basePath).replace(/\/$/,'');
if (base && !/^\/[a-zA-Z0-9_/-]+$/.test(base)) throw new Error('basePath must be empty or an absolute pathname such as /PROFILE');
const out = path.resolve(root, process.env.OUTPUT_DIR || 'dist');
if (out !== path.join(root,'dist') && !out.startsWith(path.join(root,'.preview') + path.sep)) throw new Error('Output must be dist or inside .preview');
const url = value => `${base}${value}`;
async function versionedAsset(name) {
  const contents = await fs.readFile(path.join(root,'public',name));
  const version = createHash('sha256').update(contents).digest('hex').slice(0,12);
  return url(`/assets/${name}?v=${version}`);
}
const [styleUrl, proseUrl] = await Promise.all(['style.css','prose.js'].map(versionedAsset));
const entries = await loadEntries(process.env.CONTENT_ROOT ? path.resolve(process.env.CONTENT_ROOT) : root, process.env.INCLUDE_EXAMPLES === undefined ? config.includeExamples : process.env.INCLUDE_EXAMPLES === 'true');
const date = value => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value));
const time = value => value ? `<time datetime="${value}">${date(value)}</time>` : '<span>Undated</span>';
const archive = archiveUrl(url);
const permalink = entry => url(`/life/${entry.slug}/`);
const badge = entry => entry.demo ? '<span class="demo-tag">Example</span>' : '';
function layout(title, description, body, {isHome=false,script=''}={}) {
  const mastheadLink = `<a class="masthead-link" href="${url('/life/')}">${esc(config.title)}</a>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}${title === config.title ? '' : ` | ${esc(config.title)}`}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#FAFAF7"><link rel="stylesheet" href="${styleUrl}"><script type="module" src="${proseUrl}"></script>${script ? `<script type="module" src="${url(`/assets/${script}`)}"></script>` : ''}</head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="site-masthead"><div class="site-shell masthead-inner">${isHome ? `<h1>${mastheadLink}</h1>` : mastheadLink}</div></header>
<main id="main" tabindex="-1"${isHome ? '' : ' class="site-shell"'}>${body}</main>
<div class="site-shell"><footer class="site-footer"><span>${esc(config.owner || config.title)}</span><p>A notebook of film, music, and opera.</p></footer></div>
<a class="home-link" href="${url('/life/')}">HOME</a></body></html>`;
}
function feature(entry, main=false) {
  return `<article class="editorial ${main?'lead-article':''}"><div class="article-meta">${subjectLink(entry.subject,url)}${badge(entry)}</div><div><h3 lang="${entry.language||'en'}"><a href="${permalink(entry)}">${esc(entry.title)}</a></h3><p class="excerpt" lang="${entry.language||'en'}">${esc(entry.excerpt)}</p><p class="publication">${time(entry.publicationDate)}</p></div></article>`;
}
function row(entry) {
  return `<li class="log-row" data-slug="${esc(entry.slug)}"><div class="row-date">${time(entry.publicationDate)}</div><div class="row-main"><h3 lang="${entry.language||'en'}"><a href="${permalink(entry)}">${esc(entry.title)}</a></h3>${entry.excerpt.trim() ? `<p lang="${entry.language||'en'}">${esc(entry.excerpt)}</p>` : ''}${entry.experienceDate ? `<span class="experience">${date(entry.experienceDate)}</span>`:''}</div><div class="row-meta">${subjectLink(entry.subject,url)}${badge(entry)}</div></li>`;
}
const examplesNotice = entries.some(e=>e.demo) ? '<aside class="example-notice"><span class="notice-marker" aria-hidden="true"></span><p>Sample notebook <span>These entries demonstrate the site. They are not personal viewing or listening history.</span></p></aside>' : '';
const selected = entries.filter(e=>e.longform && e.featured);
const logs = entries.filter(e=>!e.longform && (e.excerpt.trim() || e.body.trim())).slice(0,config.recentLimit || 6);
const home = `${examplesNotice ? `<div class="site-shell">${examplesNotice}</div>` : ''}
<section aria-labelledby="selected-heading">
<div class="section-heading-band"><div class="site-shell section-heading"><h2 id="selected-heading"><a href="${url('/life/articles/')}">Selected articles</a></h2></div></div>
<div class="site-shell">${selected.length ? `<div class="selected-articles">${selected.map((e,i)=>feature(e,i===0)).join('')}</div>` : '<p class="quiet-empty">No articles selected yet. New writing will appear here.</p>'}</div>
</section>
<section class="recent-section" aria-labelledby="recent-heading">
<div class="section-heading-band"><div class="site-shell section-heading"><h2 id="recent-heading"><a href="${archive}">Recent log</a></h2></div></div>
<div class="site-shell">${logs.length ? `<ul class="log-list">${logs.map(e=>row(e)).join('')}</ul>`:'<p class="quiet-empty">No records published yet.</p>'}
<a class="archive-link" href="${archive}">Explore the complete archive <span aria-hidden="true">↗</span></a></div>
</section>${config.current?.text ? `<div class="site-shell"><section class="current"><h2>Currently</h2><p>${esc(config.current.text)}</p></section></div>`:''}`;
const years = [...new Set(entries.filter(e=>e.publicationDate).map(e=>e.publicationDate.slice(0,4)))];
const radios = (name, values) => values.map(([value,label],i)=>`<label class="filter-option"><input type="radio" name="${name}" value="${value}" ${i===0?'checked':''}><span>${label}</span></label>`).join('');
const archiveBody = `<section class="page-intro"><h1>The archive</h1><p>Find a film, a recording, a performance, or a longer thought.</p></section>${examplesNotice}
<form id="archive-form" class="archive-form" hidden><div class="search"><label for="search">Search the notebook</label><div class="search-line"><input id="search" name="q" type="search" placeholder="Title, work, creator, or a few words"><button type="submit">Search</button></div></div><div class="filter-line"><fieldset><legend>Subject</legend><div class="filter-options">${radios('subject',[['','All'],...subjects.map(s=>[s,s])])}</div></fieldset><div class="year-filter"><label for="year">Publication year</label><select name="year" id="year"><option value="">All years</option>${years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></div></div></form>
<noscript><p class="example-notice">Search and filters need JavaScript. All published entries are listed below; every entry can be read without it.</p></noscript>
<div class="results-summary" role="status" aria-live="polite"><strong id="result-count">${entries.length} entries</strong><span id="active-filters">All subjects / All years</span><a id="reset" href="${archive}" hidden>Reset all</a></div>
<div id="archive-results">${years.map(y=>`<section class="archive-year" data-year-group="${y}"><h2>${y}</h2><ul class="log-list">${entries.filter(e=>e.publicationDate?.startsWith(y)).map(e=>row(e)).join('')}</ul></section>`).join('')}${entries.some(e=>!e.publicationDate)?`<section class="archive-year" data-year-group="undated"><h2>Undated</h2><ul class="log-list">${entries.filter(e=>!e.publicationDate).map(e=>row(e)).join('')}</ul></section>`:''}</div><div id="empty-state" class="empty-state" ${entries.length?'hidden':''}><h2>No entries found</h2><p>Try a shorter search or reset the filters to see all published entries.</p></div>
<script type="application/json" id="archive-data">${JSON.stringify(entries.map(({body,english,sourceUrl,importedAt,importNote,...entry})=>({...entry,...(english?{english:{title:english.title,excerpt:english.excerpt}}:{})}))).replace(/</g,'\\u003c')}</script>`;
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'assets'),{recursive:true});
await fs.cp(path.join(root,'public'),out,{recursive:true});
for (const name of ['archive.js','archive-core.js','prose.js','style.css']) { await fs.rename(path.join(out,name),path.join(out,'assets',name)); }
async function write(route,html) { const folder = path.join(out,route); await fs.mkdir(folder,{recursive:true}); await fs.writeFile(path.join(folder,'index.html'),html); }
await write('life',layout(config.title,config.description,home,{isHome:true}));
await write('life/archive',layout('Archive','Browse film, music, and opera by subject, year, or search.',archiveBody,{script:'archive.js'}));
await write('life/articles',layout('Articles','Writing on film, music, and opera.',articleIndex(entries,'en',url)));
function legacyRedirect(route) { const target=esc(url(route)); return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${target}"><title>Redirect | ${esc(config.title)}</title></head><body><a href="${target}">Continue reading</a></body></html>`; }
await write('life/articles/en',legacyRedirect('/life/articles/'));
for (const entry of entries) {
  const localized=entry.language==='zh-CN';
  await write(`life/${entry.slug}`,layout(entry.title,entry.excerpt,localizedEntry(entry,'en',entries,url)));
  if(localized && entry.longform) await write(`life/${entry.slug}/en`,legacyRedirect(`/life/${entry.slug}/`));
  for (const alias of entry.aliases || []) {
    await write(`life/${alias}`,legacyRedirect(`/life/${entry.slug}/`));
    if(localized && entry.longform) await write(`life/${alias}/en`,legacyRedirect(`/life/${entry.slug}/`));
  }
}
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=${url('/life/')}"><title>${esc(config.title)}</title></head><body><a href="${url('/life/')}">Open Culture &amp; Life</a></body></html>`);
await fs.writeFile(path.join(out,'404.html'),layout('Page not found','This page could not be found.',`<section class="page-intro"><h1>Page not found</h1><p>This address may have changed. <a href="${archive}">Look in the archive</a> or <a href="${url('/life/')}">return home</a>.</p></section>`));
await fs.writeFile(path.join(out,'.nojekyll'),'');
console.log(`Built ${entries.length} published entries at ${out}; base path: ${base || '/'}`);
