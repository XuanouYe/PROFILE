import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadEntries,validate} from '../scripts/content.mjs';
import {matches,readState,queryFor} from '../public/archive-core.js';

const root = process.cwd();
const fixtureRoot = path.join(root,'tests/fixtures');
const entries = await loadEntries(fixtureRoot,true);
const blank = {subject:'',year:'',q:''};
const years = [...new Set(entries.map(e=>e.publicationDate.slice(0,4)))];
test('all filter combinations agree with independent set intersections',()=>{
  for(const subject of ['', 'film','music','opera']) for(const year of ['',...years]) for(const q of ['','recording','Gould','does-not-exist']) {
    const state = {subject,year,q};
    let expected = entries;
    if(subject) expected = expected.filter(e=>e.subject===subject);
    if(year) expected = expected.filter(e=>e.publicationDate.slice(0,4)===year);
    if(q) expected = expected.filter(e=>[e.title,e.excerpt,...Object.values(e.metadata || {})].join(' ').toLowerCase().includes(q.toLowerCase()));
    assert.deepEqual(entries.filter(e=>matches(e,state)).map(e=>e.slug),expected.map(e=>e.slug));
    assert.deepEqual(readState(queryFor(state),years),state);
  }
});
test('each entry matches only its single subject and publication year',()=>{
  const annual = entries.find(e=>e.slug==='year-in-company');
  assert.ok(matches(annual,{...blank,subject:'film',year:'2026'}));
  for(const subject of ['music','opera']) assert.equal(matches(annual,{...blank,subject,year:'2026'}),false);
  assert.equal(matches(annual,{...blank,year:'2025'}),false);
  assert.equal(annual.coverageYear,2025);
});
test('search covers creator and ignores accents; invalid filter values normalize',()=>{
  const film = entries.find(e=>e.slug==='tokyo-story-log');
  assert.ok(matches(film,{...blank,q:'Yasujiro Ozu'}));
  assert.deepEqual(readState('?subject=Books&format=Unknown&year=1900&q=%20Ozu%20',years),{...blank,q:'Ozu'});
});
test('content schema rejects bad dates, slugs, subjects and broken field types',()=>{
  const good = entries[0];
  for(const change of [{publicationDate:'2026-02-30'},{slug:'../unsafe'},{subject:['film','opera']},{subject:'Books'},{format:'Review'},{draft:'false'},{featured:'true'},{experienceDate:'2026-10-10',experienceLabel:undefined},{related:'slug'},{metadata:{cast:{}}}]) assert.throws(()=>validate({...good,...change},'test'));
});
test('draft exclusion, ordering, dates, and explicit relationships',()=>{
  assert.ok(!entries.some(e=>e.draft));
  assert.deepEqual(entries.map(e=>e.publicationDate),entries.map(e=>e.publicationDate).sort().reverse());
  assert.ok(!years.includes('2024'));
  const log=entries.find(e=>e.slug==='tokyo-story-log');
  assert.notEqual(log.publicationDate,log.experienceDate);
  assert.ok(log.related.includes('between-scenes'));
});
async function walk(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]))).flat();}
for(const base of ['', '/PROFILE']) test(`static output and every local link resolve at ${base || '/'}`,async()=>{
  const output = `.preview/${base?'subpath':'root'}`;
  execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,BASE_PATH:base,OUTPUT_DIR:output,CONTENT_ROOT:fixtureRoot,INCLUDE_EXAMPLES:'true'}});
  const outputRoot=path.resolve(output);
  const files=await walk(outputRoot);
  assert.ok(!files.some(f=>f.includes('unpublished-example')));
  for(const file of files.filter(f=>f.endsWith('.html'))) {
    const html=await fs.readFile(file,'utf8');
    assert.ok(!html.includes('Unpublished example'));
    for(const [,raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if(!raw.startsWith('/')) continue;
      const pathname=new URL(raw.replaceAll('&amp;','&'),'https://example.test').pathname;
      assert.ok(pathname.startsWith(base+'/'),`${file}: ${pathname} lacks base path`);
      const relative=decodeURIComponent(pathname.slice(base.length));
      const target=path.join(outputRoot,relative,relative.endsWith('/')?'index.html':'');
      await assert.doesNotReject(fs.access(target),`${file}: broken link ${raw}`);
    }
  }
  const detail = await fs.readFile(path.join(outputRoot,'life/tokyo-story-log/index.html'),'utf8');
  assert.match(detail,/Published <time datetime="2026-10-26"/);
  assert.match(detail,/<dt>Film:<\/dt><dd>Tokyo Story<br>東京物語/);
  assert.ok(!detail.includes('<dt>Watched'));
  assert.ok(!detail.includes('<dt>Format'));
  assert.ok(!detail.includes('<dt>Focus'));
  assert.ok(detail.includes(`${base}/life/between-scenes/`));
  const archive=await fs.readFile(path.join(outputRoot,'life/archive/index.html'),'utf8');
  assert.ok(!archive.includes('<option value="2024">'));
  assert.match(archive,/<noscript>/);
  assert.ok(!archive.includes('name="format"'));
  assert.ok(!archive.includes('All formats'));
});
test('removing examples builds a clean empty site',async()=>{
  execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,INCLUDE_EXAMPLES:'false',OUTPUT_DIR:'.preview/empty',CONTENT_ROOT:fixtureRoot}});
  const html=await fs.readFile('.preview/empty/life/index.html','utf8');
  assert.ok(!html.includes('Sample notebook'));
  assert.match(html,/No records published yet/);
});
test('text palette meets WCAG AA on paper and filter wash',()=>{
  const luminance = hex => hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  for(const ink of ['263B53','52646F','39766F']) for(const paper of ['FAFAF7','EDF1EC']) assert.ok((luminance(paper)+.05)/(luminance(ink)+.05)>=4.5);
});
