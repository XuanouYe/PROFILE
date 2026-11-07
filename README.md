# Culture & Life

An English-interface notebook of film, opera, and music. Markdown files in `content/entries/` are the source of truth. Long articles currently retain their Chinese writing; opera entries are in English. The site builds to static HTML in `dist/`.

## Local use

With Node.js 22 or newer and pnpm installed:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:4173/life/`. The preview watches Markdown, images, and site settings and refreshes automatically after a save. You can also double-click `Preview.command` to open the local preview without a terminal command. `pnpm test` checks content validation, Details, numeric ratings and star rendering, archive behavior, and root/subpath links. `pnpm check` checks the built local links and assets.

## Entry fields

```yaml
title: "Your title"
slug: a-stable-permalink
publicationDate: "2026-11-03"
subject: film
longform: true
excerpt: "Your introduction."
draft: false
language: en
rating: null
metadata:
  Film: |-
    English title
    Original title
  Director: "Director name"
  Year: 2000
```

`subject` is exactly one lowercase value: `film`, `opera`, or `music`. Choose the main subject even when the writing discusses other art forms. There is no Format field, format filter, or Review/Essay/Interview taxonomy. `longform: true` only places the entry in the Articles directory and makes it eligible for homepage selection; it is not a displayed category or archive filter. `featured: true` selects a long article for the homepage.

`publicationDate` controls ordering and archive year. A shorter, undated record may use `publicationDate: null`; long articles require a date. Production years, release years, and performance dates never supply a missing publication date. Existing undated opera entries keep their original order.

`rating` is a number from 0 to 5 in increments of 0.5, or `null` when not supplied. Store `3.5`, not a star string. The page shows `★★★☆` for 3.5, `★★★★★` for 5, and `☆` for 0.5. It does not fill the unused portion with empty stars. An unfilled rating displays a dash; zero generates no stars. All 11 long-article ratings remain unfilled for the author to enter later.

## Details schema

Details begins with `Subject` and ends with `Rating`. All other rows follow the lists below, in order. Missing values display a dash. No extra fields are accepted in `metadata`.

| Subject | Metadata fields |
| --- | --- |
| `film` | `Film`, `Director`, `Year` |
| `opera` | `Opera`, `Director`, `Production year`, `Venue` |
| `music` | `Programme`, `Conductor`, `Orchestra` |
| `music` with `medium: live` | Add `Venues`, `Performance date` |
| `music` with `medium: recording` | Add `label`, `Release date` |

Use a YAML multiline string for `Film`: English title on the first line, original title on the second. Use the director's original Latin-script name, or the established English name for a name originally written in a non-Latin script. Opera titles use the original title, or the established English title for a non-Latin title.

Programme names use the composer's full given name and surname, the complete English work name including key and catalogue number, and any supplied soloist in parentheses, for example `Robert Schumann：Cello Concerto in A minor, Op. 129（Cello: Pablo Ferrández）`. Keep descriptive titles in their original language. Logs may leave `excerpt: ""` and the body empty until a personal response is supplied. Store performance dates as `YYYY-MM-DD`; they display as `27 Nov 2025`. `Release date` uses the same storage and display formats. For multiple venues or performances, use matching multiline values in `Venues` and `Performance date`.

Do not infer a particular concert, conductor, orchestra, label, release date, or rating for a comparative essay. For instance, the Aranjuez article discusses several recordings; its Programme is filled, and edition-specific information is unfilled.

## Writing and replacement

Keep slugs stable: they create `/life/<slug>/`. Standard Markdown headings, paragraphs, lists, links, quotations, and images are supported. Start body headings at `##`, because the page already supplies the title.

Images belong in `public/assets/`; reference them as Markdown, for example:

```markdown
![Description](/assets/photo.jpg "Caption and credit")
```

Chinese text uses the existing Songti system-font stack; interface text stays English. To replace a Chinese article later, update its title, excerpt, body, and language while retaining the slug and dates. A reviewed, non-draft file in `content/translations/en/<slug>.md` can also supply its English replacement. Old `/en/` URLs redirect to the main article, and no language switch is displayed.

`related`, `workIds`, and `performanceIds` preserve explicit relationships. Exact performance identifiers link records automatically. Do not merge different performances merely because they share a work. Optional translation attribution remains separate from Details, at the end of the article.

Only publication-ready Markdown belongs in `content/entries/` and `content/translations/en/`. Keep unfinished or private writing in `content/drafts/`, which Git ignores. Local Git hooks and GitHub Actions reject staged or committed drafts in the published directories. Templates and synthetic test fixtures are development files, not personal drafts. Import snapshots, manifests, demonstration content, and the obsolete importer are excluded from the public repository.

Article pages have no navigation bars, back/forward toolbars, or Notion original links. Private source URLs are not included in archive data.

## Archive and hosting

Archive filters combine the single subject, publication year, and search. Search covers titles, excerpts, and Details values, ignores accents and letter case, and supports browser Back/Forward. Without JavaScript, every published entry remains visible. Old format query parameters are ignored.

`site.config.json` controls the title, description, optional owner, featured activity, and whether demonstration content is included. Real content is under `content/entries/`; private drafts stay in the ignored `content/drafts/` directory, and templates are never published.

`pnpm build` writes deployable files to `dist/`. `BASE_PATH=/PROFILE pnpm build` builds for a repository subpath. The workflow in `.github/workflows/pages.yml` checks, builds, and deploys automatically whenever `main` is pushed, and can also be triggered manually. It reads the hosting subpath from GitHub Pages itself; no `PAGES_BASE_PATH` variable is needed. The source repository is [XuanouYe/PROFILE](https://github.com/XuanouYe/PROFILE), and the website is served at [Culture & Life](https://xuanouye.github.io/PROFILE/life/).

## Obsidian editing

Open the entire PROFILE directory as an Obsidian vault. The official Git plugin is installed locally, with scheduled synchronization disabled. The Source Control pane exposes **Commit all changes and sync**, and **⌘⇧S** runs the same command. The local Git credential helper reuses GitHub CLI credentials stored by the operating system; credentials are not committed. See [EDITING.md](EDITING.md) for daily editing, images, publishing, and troubleshooting.

The local checkout uses `git config core.hooksPath .githooks`. When setting up another clone, run that command once after installing dependencies to enable the same commit/push checks.
