import {marked, Marked} from 'marked';
import {escape as esc, detailFields} from './content.mjs';

// The interface is English; language attributes describe the writing itself.
const view = entry => entry.english || entry;
const contentLanguage = entry => entry.english ? 'en' : entry.language || 'en';
export function articleIndex(entries,lang,url) {
  const articles=entries.filter(e=>e.longform);
  return `<section class="page-intro article-index-intro"><div><h1>Articles</h1><p>Writing on film, music, and opera.</p></div></section>
  ${articles.length?`<p class="article-index-count">${articles.length} ${articles.length===1?'article':'articles'}</p><div class="article-index-list">${articles.map(entry=>`<article class="article-index-item"><div class="index-meta"><time datetime="${entry.publicationDate}">${entry.publicationDate}</time><span>${esc(entry.subject)}</span></div><div lang="${contentLanguage(entry)}"><h2><a href="${url(`/life/${entry.slug}/`)}">${esc(view(entry).title)}</a></h2><p class="excerpt">${esc(view(entry).excerpt)}</p></div></article>`).join('')}</div>`:'<section class="quiet-empty"><p>No articles published yet.</p></section>'}
`;
}
export function localizedEntry(entry,lang,entries,url) {
  const article=entry.longform, content=view(entry), language=contentLanguage(entry);
  const date=value=>new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value));
  const notes=new Map(), references=new Map();
  const source=content.body.replace(/^\[\^(\d+)\]:[ \t]+(.+)$/gm,(_,id,text)=>{notes.set(id,text);return '';});
  const markdown=new Marked();
  markdown.use({extensions:[{
    name:'footnote',level:'inline',
    start:src=>src.indexOf('[^'),
    tokenizer(src){const match=/^\[\^(\d+)\]/.exec(src);if(match&&notes.has(match[1]))return {type:'footnote',raw:match[0],id:match[1]};},
    renderer(token){
      const count=(references.get(token.id)||0)+1;
      references.set(token.id,count);
      return `<sup class="note-ref"><a id="note-ref-${token.id}-${count}" href="#note-${token.id}" role="doc-noteref" aria-label="Read note ${token.id}">${token.id}</a></sup>`;
    }
  }]});
  const renderer=new marked.Renderer();
  renderer.link=function(token){const href=token.href.startsWith('/')&&!token.href.startsWith('//')?url(token.href):token.href;return `<a href="${esc(href)}">${this.parser.parseInline(token.tokens)}</a>`;};
  renderer.image=function(token){const imageHref=token.href.startsWith('public/assets/')?'/'+token.href.slice('public/'.length):token.href;const src=imageHref.startsWith('/')&&!imageHref.startsWith('//')?url(imageHref):imageHref;return `<figure><img src="${esc(src)}" alt="${esc(token.text.replace(/\[\^\d+\]/g,''))}" loading="lazy" decoding="async">${token.title?`<figcaption>${markdown.parseInline(esc(token.title))}</figcaption>`:''}</figure>`;};
  markdown.use({renderer});
  let body=markdown.parse(source);
  if(references.size){
    const items=[...references].map(([id,count])=>`<li id="note-${id}" value="${id}" tabindex="-1"><p>${markdown.parseInline(notes.get(id))} <span class="note-returns">${Array.from({length:count},(_,i)=>`<a class="note-return" href="#note-ref-${id}-${i+1}" role="doc-backlink" aria-label="Return to note ${id} reference ${i+1}">↩${count>1?i+1:''}</a>`).join(' ')}</span></p></li>`).join('');
    body+=`<section class="article-notes" role="doc-endnotes" aria-labelledby="article-notes-title"><h2 id="article-notes-title">Notes</h2><ol>${items}</ol></section>`;
  }
  const metadata={Subject:entry.subject,...Object.fromEntries(detailFields(entry).map(key=>[key,entry.metadata?.[key] ?? ''])),Rating:entry.rating ?? ''};
  const detailValue=value=>String(value).split('\n').map(line=>/^\d{4}-\d{2}-\d{2}$/.test(line)?esc(date(line)):esc(line)).join('<br>');
  const details=Object.entries(metadata).map(([key,value])=>`<div class="detail-item"><dt>${esc(key)}:</dt><dd>${value === '' ? '<span class="detail-empty" aria-label="Not supplied">—</span>' : key === 'Rating' ? `<span class="rating" aria-label="${value} out of 5">${'★'.repeat(Math.floor(value))}${value % 1 ? '☆' : ''}${value === 0 ? '—' : ''}</span>` : detailValue(value)}</dd></div>`).join('');
  const creditNames={sourceLanguage:'Source language',translator:'Transcription / translation',originalAuthor:'Original author',sourceTitle:'Source title'};
  const related=entries.filter(e=>e.slug!==entry.slug&&((entry.related||[]).includes(e.slug)||(e.related||[]).includes(entry.slug)||(entry.performanceIds||[]).some(id=>(e.performanceIds||[]).includes(id))||(!(entry.performanceIds?.length)&&!(e.performanceIds?.length)&&(entry.workIds||[]).some(id=>(e.workIds||[]).includes(id)))));
  const dateHtml=entry.publicationDate?`Published <time datetime="${entry.publicationDate}">${date(entry.publicationDate)}</time>`:'Publication date not supplied';
  return `<article class="entry localized-entry ${article?'':'log-entry'}"><header class="entry-header"><div class="entry-kind"><span>${esc(entry.subject)}</span></div><h1 lang="${language}">${esc(content.title)}</h1><p class="publication">${dateHtml}</p></header>
  <div class="entry-layout"><aside class="entry-details"><h2>Details</h2><dl class="details-list">${details}</dl></aside><div class="prose" lang="${language}">${body}</div></div>
  ${related.length?`<section class="related"><h2>Related entries</h2><ul>${related.map(e=>`<li><a href="${url(`/life/${e.slug}/`)}" lang="${contentLanguage(e)}">${esc(view(e).title)}</a></li>`).join('')}</ul></section>`:''}
  ${entry.translation?`<section class="entry-credits"><h2>Credits</h2><dl>${Object.entries(entry.translation).filter(([key])=>key!=='sourceUrl').map(([k,v])=>`<dt>${esc(creditNames[k]||k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`:''}
  </article>`;
}
