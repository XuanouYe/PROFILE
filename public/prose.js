const justifiedBlocks = ':is(.prose p, .prose li, .excerpt, .row-main p):not(:lang(zh))';
const spacesByBlock = new Map();
const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);

for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  const block = node.parentElement.closest('p, li, code, pre, figcaption');
  if (!block?.matches(justifiedBlocks)) continue;

  for (const match of node.data.matchAll(/[ \t\r\n\f]+/g)) {
    const space = document.createRange();
    space.setStart(node, match.index);
    space.setEnd(node, match.index + match[0].length);
    if (!spacesByBlock.has(block)) spacesByBlock.set(block, []);
    spacesByBlock.get(block).push(space);
  }
}

function updateHyphenation(blocks) {
  for (const block of blocks) block.classList.remove('auto-hyphenate');

  // Compare the same rendered spaces before and after removing justification.
  const measurements = blocks.map(block => {
    const spaces = spacesByBlock.get(block);
    const widths = spaces.map(space => space.getBoundingClientRect().width);
    return { block, spaces, widths };
  });

  for (const block of blocks) block.classList.add('measure-word-spacing');
  const blocksToHyphenate = measurements.filter(({ spaces, widths }) =>
    spaces.some((space, index) => {
      if (widths[index] === 0) return false;
      const naturalWidth = space.getBoundingClientRect().width;
      return naturalWidth > 0 && widths[index] >= 2 * naturalWidth;
    })
  );
  for (const block of blocks) block.classList.remove('measure-word-spacing');
  for (const { block } of blocksToHyphenate) block.classList.add('auto-hyphenate');
}

if (spacesByBlock.size) {
  document.fonts.ready.then(() => {
    const widths = new WeakMap();
    const observer = new ResizeObserver(entries => {
      const resized = [];
      for (const { target, contentRect } of entries) {
        const { width } = contentRect;
        if (width === widths.get(target)) continue;
        widths.set(target, width);
        if (width > 0) resized.push(target);
      }
      if (resized.length) updateHyphenation(resized);
    });
    for (const block of spacesByBlock.keys()) observer.observe(block);
  });
}
