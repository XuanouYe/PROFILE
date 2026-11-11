const prose = document.querySelector('.prose');
const spacesByBlock = new Map();
const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);

for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  const block = node.parentElement.closest('p, li, code, pre, figcaption');
  if (!block?.matches('p:not(:lang(zh)), li:not(:lang(zh))')) continue;

  for (const match of node.data.matchAll(/[ \t\r\n\f]+/g)) {
    const space = document.createRange();
    space.setStart(node, match.index);
    space.setEnd(node, match.index + match[0].length);
    if (!spacesByBlock.has(block)) spacesByBlock.set(block, []);
    spacesByBlock.get(block).push(space);
  }
}

function updateHyphenation() {
  for (const block of spacesByBlock.keys()) block.classList.remove('auto-hyphenate');

  // Compare the same rendered spaces before and after removing justification.
  const justifiedWidths = new Map();
  for (const [block, spaces] of spacesByBlock) {
    justifiedWidths.set(block, spaces.map(space => space.getBoundingClientRect().width));
  }

  prose.classList.add('measure-word-spacing');
  const blocksToHyphenate = [];
  for (const [block, spaces] of spacesByBlock) {
    const widths = justifiedWidths.get(block);
    const hasWideGap = spaces.some((space, index) => {
      if (widths[index] === 0) return false;
      const naturalWidth = space.getBoundingClientRect().width;
      return naturalWidth > 0 && widths[index] >= 2 * naturalWidth;
    });
    if (hasWideGap) blocksToHyphenate.push(block);
  }
  prose.classList.remove('measure-word-spacing');

  for (const block of blocksToHyphenate) block.classList.add('auto-hyphenate');
}

if (spacesByBlock.size) {
  let measuredWidth;
  new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (width === measuredWidth) return;
    measuredWidth = width;
    updateHyphenation();
  }).observe(prose);
  document.fonts.ready.then(updateHyphenation);
}
