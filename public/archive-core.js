export function readState(search, years) {
  const params = new URLSearchParams(search);
  const subject = (params.get('subject') || '').toLowerCase();
  return {
    subject: ['film','opera','music'].includes(subject) ? subject : '',
    year: years.includes(params.get('year')) ? params.get('year') : '',
    q: (params.get('q') || '').trim()
  };
}
export function matches(entry, state) {
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const haystack = normalize([entry.title,entry.excerpt,entry.english?.title || '',entry.english?.excerpt || '',...Object.values(entry.metadata || {})].join(' '));
  return (!state.subject || entry.subject === state.subject) && (!state.year || !!entry.publicationDate?.startsWith(state.year)) && normalize(state.q).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
export function queryFor(state) {
  const params = new URLSearchParams();
  for (const key of ['subject','year','q']) if (state[key]) params.set(key,state[key]);
  return params.toString() ? `?${params}` : '';
}
