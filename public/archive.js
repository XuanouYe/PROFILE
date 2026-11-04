import {readState, matches, queryFor} from './archive-core.js';
const entries = JSON.parse(document.querySelector('#archive-data').textContent);
const years = [...new Set(entries.filter(e=>e.publicationDate).map(e => e.publicationDate.slice(0,4)))];
const form = document.querySelector('#archive-form');
const count = document.querySelector('#result-count');
const active = document.querySelector('#active-filters');
const rows = [...document.querySelectorAll('[data-slug]')];
function render() {
  const state = readState(location.search, years);
  for (const key of ['subject','year','q']) form.elements.namedItem(key).value = state[key];
  const shown = new Set(entries.filter(e => matches(e,state)).map(e=>e.slug));
  rows.forEach(row => { row.hidden = !shown.has(row.dataset.slug); });
  document.querySelectorAll('[data-year-group]').forEach(group => { group.hidden = ![...group.querySelectorAll('[data-slug]')].some(row=>!row.hidden); });
  count.textContent = `${shown.size} ${shown.size === 1 ? 'entry' : 'entries'}`;
  active.textContent = [state.subject || 'All subjects',state.year || 'All years',state.q ? `Search: “${state.q}”` : ''].filter(Boolean).join(' / ');
  document.querySelector('#empty-state').hidden = shown.size !== 0;
  document.querySelector('#reset').hidden = !Object.values(state).some(Boolean);
}
function update() {
  const data = new FormData(form);
  const next = Object.fromEntries(['subject','year','q'].map(key=>[key,String(data.get(key)||'').trim()]));
  const url = location.pathname + queryFor(next);
  if (url !== location.pathname + location.search) history.pushState(null,'',url);
  render();
}
form.addEventListener('change',event=> { if(event.target.name !== 'q') update(); });
form.addEventListener('submit',event=> {event.preventDefault();update();});
document.querySelector('#reset').addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',location.pathname);render();});
window.addEventListener('popstate',render);
form.hidden = false;
render();
