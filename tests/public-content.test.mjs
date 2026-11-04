import test from 'node:test';
import assert from 'node:assert/strict';
import {publicContentIssue} from '../scripts/check-public-content.mjs';

test('private snapshots, local drafts and unexpected notes cannot enter the public repository',()=>{
  for(const file of ['content/drafts/note.md','content/sources/notion/page.md','content/imports/import.json','content/examples/unpublished-example.md','.private/backup.md','private-note.md','.obsidian/plugins/obsidian-git/data.json']) assert.ok(publicContentIssue(file));
  for(const file of ['scripts/build.mjs','.github/workflows/pages.yml','.githooks/pre-commit','public/assets/photo.png','templates/review.md','tests/fixtures/content/examples/unpublished-example.md']) assert.equal(publicContentIssue(file),null);
});
test('only explicit publication-ready Markdown passes, with no private original URL',()=>{
  const file='content/entries/article.md';
  for(const source of ['---\ndraft: true\n---\nPrivate text.','---\ntitle: Undecided\n---\nPrivate text.','No front matter.','---\ndraft: false\nsourceUrl: https://app.notion.com/p/private\n---\nArticle.','---\ndraft: false\n---\n[Original](https://private.notion.site/page)']) assert.ok(publicContentIssue(file,source));
  assert.equal(publicContentIssue(file,'---\ndraft: false\n---\nArticle ready to publish.'),null);
});
