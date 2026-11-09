import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadEntries,validate} from '../scripts/content.mjs';
import {articleIndex,localizedEntry} from '../scripts/localized.mjs';
import {matches} from '../public/archive-core.js';

const entry={title:'中文标题',slug:'chinese-article',excerpt:'中文摘要',publicationDate:'2025-10-31',longform:true,subject:'film',language:'zh-CN',draft:false,body:'这是中文正文。',english:null};
const url=p=>'/PROFILE'+p;
test('footnotes link body and caption references to formatted endnotes with return links',()=>{
  const noted={...entry,body:'Text[^4], repeated[^4].\n\n![A view[^5]](/assets/view.png "A caption[^5].")\n\n[^4]: A note with *emphasis* and [a source](https://example.com).\n\n[^5]: A caption note.'};
  const html=localizedEntry(noted,'en',[noted],url);
  assert.match(html,/id="note-ref-4-1" href="#note-4"/);
  assert.match(html,/id="note-ref-4-2" href="#note-4"/);
  assert.match(html,/<figcaption>A caption<sup class="note-ref"><a id="note-ref-5-1"/);
  assert.match(html,/alt="A view"/);
  assert.match(html,/<li id="note-4" value="4" tabindex="-1"><p>A note with <em>emphasis<\/em>/);
  assert.match(html,/href="#note-ref-4-1" role="doc-backlink"/);
  assert.match(html,/href="#note-ref-4-2" role="doc-backlink"/);
  assert.match(html,/href="#note-ref-5-1" role="doc-backlink"/);
  assert.ok(!html.includes('[^'));
  assert.ok(html.indexOf('article-notes')>html.indexOf('</figure>'));
  const plain=localizedEntry({...entry,body:'Undefined[^9]. `Literal[^4]`\n\n[^4]: Unused note.'},'en',[entry],url);
  assert.match(plain,/Undefined\[\^9\]/);
  assert.match(plain,/<code>Literal\[\^4\]<\/code>/);
  assert.ok(!plain.includes('doc-endnotes'));
});
test('metadata-only music logs allow an empty review and retain programme, date and rating',()=>{
  const log={...entry,subject:'music',medium:'live',longform:false,excerpt:'',body:'',rating:3.5,metadata:{Programme:'Robert Schumann：Cello Concerto in A minor, Op. 129（Cello: Pablo Ferrández）','Performance date':'2026-10-30',Venue:'Konzerthaus Berlin'}};
  assert.doesNotThrow(()=>validate(log,'metadata-only log'));
  assert.throws(()=>validate({...log,longform:true},'empty article'));
  assert.throws(()=>validate({...log,excerpt:null},'invalid excerpt'));
  const html=localizedEntry(log,'en',[log],url);
  assert.match(html,/Cello Concerto in A minor/);
  assert.match(html,/30 Oct 2026/);
  assert.match(html,/3.5 out of 5/);
  assert.match(html,/<div class="prose" lang="zh-CN"><\/div>/);
  assert.ok(matches(log,{subject:'music',year:'2025',q:'Ferrandez'}));
});
test('articles keep Chinese writing in an English interface without language controls',()=>{
  const html=localizedEntry(entry,'en',[entry],url);
  assert.ok(html.includes(entry.body));
  assert.ok(html.includes(entry.title));
  assert.match(html,/31 Oct 2025/);
  assert.match(html,/<h2>Details<\/h2>/);
  assert.match(html,/<dt>Subject:<\/dt><dd>film/);
  assert.ok(!html.includes('<dt>Format'));
  assert.ok(!html.includes('<dt>Focus'));
  assert.match(html,/<div class="prose" lang="zh-CN">/);
  assert.ok(!html.includes('<nav'));
  assert.ok(!html.includes('entry-toolbar'));
  assert.ok(!html.includes('language-nav'));
  assert.ok(!html.includes('/en/'));
  const index=articleIndex([entry],'en',url);
  assert.match(index,/1 article/);
  assert.ok(index.includes(entry.title));
  assert.match(index,/<h1>Articles<\/h1>/);
  assert.ok(!index.includes('translation pending'));
});
test('a supplied published replacement uses the same article URL',()=>{
  const translated={...entry,english:{title:'English title',excerpt:'English introduction',body:'English body.'}};
  const html=localizedEntry(translated,'en',[translated],url);
  assert.match(html,/English body/);
  assert.ok(!html.includes(entry.body));
  assert.match(html,/<div class="prose" lang="en">/);
  assert.match(articleIndex([translated],'en',url),/English title/);
  assert.match(articleIndex([translated],'en',url),/href="\/PROFILE\/life\/chinese-article\/"/);
});
test('undated logs retain English details and never acquire a year from production metadata',()=>{
  const log={...entry,language:'en',subject:'opera',longform:false,publicationDate:null,metadata:{'Production year':2026},rating:4};
  assert.doesNotThrow(()=>validate(log,'undated log'));
  assert.throws(()=>validate({...entry,publicationDate:null},'undated article'));
  assert.ok(matches(log,{subject:'opera',year:'',q:''}));
  assert.equal(matches(log,{subject:'opera',year:'2026',q:''}),false);
  const html=localizedEntry(log,'en',[log],url);
  assert.match(html,/Publication date not supplied/);
  assert.match(html,/<dt>Production year:<\/dt><dd>2026/);
  assert.match(html,/aria-label="4 out of 5">★★★★<\/span>/);
  assert.ok(!html.includes('datetime='));
});
test('translation files honor draft state and reject empty published translations',async()=>{
  await fs.mkdir(path.join(process.cwd(),'.preview'),{recursive:true});
  const root=await fs.mkdtemp(path.join(process.cwd(),'.preview/translation-test-'));
  await fs.mkdir(path.join(root,'content/entries'),{recursive:true});
  await fs.mkdir(path.join(root,'content/translations/en'),{recursive:true});
  await fs.writeFile(path.join(root,'content/entries/chinese-article.md'),'---\n'+JSON.stringify({...entry,body:undefined,english:undefined})+'\n---\n\n'+entry.body);
  const translated=path.join(root,'content/translations/en/chinese-article.md');
  try {
    await fs.writeFile(translated,'---\ndraft: true\n---\n\n');
    assert.equal((await loadEntries(root,false))[0].english,null);
    await fs.writeFile(translated,'---\ntitle: English title\nexcerpt: English introduction\ndraft: false\n---\n\n');
    await assert.rejects(loadEntries(root,false),/published translation needs a body/);
    await fs.appendFile(translated,'English body.');
    assert.equal((await loadEntries(root,false))[0].english.body.trim(),'English body.');
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('subject and medium determine the exact Details fields and order',()=>{
  const keys=entry=>[...localizedEntry(entry,'en',[entry],url).matchAll(/<div class="detail-item"><dt>([^<]+):<\/dt>/g)].map(m=>m[1]);
  assert.deepEqual(keys(entry),['Subject','Film','Director','Year','Rating']);
  assert.deepEqual(keys({...entry,subject:'opera'}),['Subject','Opera','Director','Production year','Venue','Rating']);
  assert.deepEqual(keys({...entry,subject:'music',medium:'live'}),['Subject','Programme','Conductor','Orchestra','Venue','Performance date','Rating']);
  assert.deepEqual(keys({...entry,subject:'music',medium:'recording'}),['Subject','Programme','Conductor','Orchestra','label','Release date','Rating']);
  assert.throws(()=>validate({...entry,metadata:{Focus:'No extra fields'}},'extra field'));
  assert.throws(()=>validate({...entry,subject:'music',medium:'live',metadata:{label:'Not a recording'}},'wrong medium'));
});
test('ratings are stored numerically in half steps and displayed with half stars',()=>{
  for(let value=0;value<=5;value+=0.5){
    const rated={...entry,rating:value};
    assert.doesNotThrow(()=>validate(rated,'valid rating'));
    const html=localizedEntry(rated,'en',[rated],url);
    assert.ok(html.includes(`aria-label="${value} out of 5">${'★'.repeat(Math.floor(value))}${value%1?'☆':''}${value===0?'—':''}</span>`));
  }
  for(const rating of [-0.5,5.5,3.25,'★★★☆',NaN,Infinity])assert.throws(()=>validate({...entry,rating},'invalid rating'));
  assert.match(localizedEntry({...entry,rating:null},'en',[entry],url),/<dt>Rating:<\/dt><dd><span class="detail-empty" aria-label="Not supplied">—/);
});

test('images pasted into Obsidian use the public assets path under the hosting base',()=>{
  const image={...entry,body:'![Pasted photograph](public/assets/uploads/photo.png)'};
  const html=localizedEntry(image,'en',[image],url);
  assert.match(html,/src="\/PROFILE\/assets\/uploads\/photo.png"/);
  assert.ok(!html.includes('src="public/'));
});

test('article pages omit navigation and Notion originals even for legacy input',()=>{
  const legacy={...entry,sourceUrl:'https://app.notion.com/p/private',importNote:'private import note',translation:{translator:'Credited translator',sourceUrl:'https://app.notion.com/p/private'}};
  const html=localizedEntry(legacy,'en',[legacy],url);
  assert.ok(!html.includes('<nav'));
  assert.ok(!html.includes('entry-toolbar'));
  assert.ok(!html.includes('notion.com'));
  assert.ok(!html.includes('private import note'));
  assert.ok(html.includes('Credited translator'));
});
