# GlossyBrandingAgency2026

A hand-written static rebuild of [glossybranding.com](https://glossybranding.com) —
semantic HTML, plain CSS, vanilla JS. No Webflow runtime, no jQuery, no build step.

**Live:** https://glossy.tv/

## Why a rebuild and not an export

The published Webflow site ships ~155 KB of generated CSS, jQuery 3.5.1, `webflow.js`
plus two chunks, and two Finsweet scripts — and contains no `<h1>`–`<h6>` at all
(321 `<div>`s on the homepage). This version drops all of that and adds a real
heading outline, skip link, focus states and `prefers-reduced-motion` support.

## Structure

```
index.html                     Home — hero + case grid
about.html                     The 4-step process (Consultancy → Strategy → Branding → Experience)
cases.html                     Full case overview
news.html                      News overview
contact.html                   Contact details, form, FAQ accordion
brand-ai-consultancy.html      AI Consultancy
ai-driven-brand-innovation.html  AI-Driven Brand Innovation
careers.html                   PLACEHOLDER — see "Known gaps"
privacy-policy.html            Privacy & cookie policy
kmo-portefeuille.html          Subsidies for consultancy & strategy
404.html                       Self-contained (inlined CSS) so it works at any depth
brand-ai-consultancy-nl.html   Redirect stub — the page moved to nl/

cases/<slug>.html              54 generated case detail pages
news/<slug>.html               36 generated news detail pages

nl/                            The complete Dutch site: translated root pages
nl/cases/<slug>.html           plus both generated trees, same slugs as English
nl/news/<slug>.html

scripts/export-cms.py          Raw Webflow exports -> data/*.json
scripts/scrape-sections.py     Recovers Case Sections the MCP cannot reach
scripts/localize-assets.py     Downloads Webflow media into assets/media/
scripts/build-cases.py         data/cases(-nl).json -> cases/ and nl/cases/
scripts/build-news.py          data/news(-nl).json  -> news/ and nl/news/
scripts/build-sitemap.py       Both trees -> sitemap.xml with hreflang pairs
scripts/merge-nl.py            Translator output + fixed glossary -> data/*-nl.json
scripts/_shell.py              Shared nav/footer/media markup, per language
scripts/raw/                   Raw CMS exports (input to export-cms.py)

assets/css/style.css           Design system: tokens, layout, components
assets/js/main.js              Nav, FAQ, CMS rendering and consent management
assets/fonts/                  Rethink Sans (variable, roman + italic)
assets/img/                    Logo, favicon, partner badges
assets/media/                  803 case/news/client assets (324 MB), self-hosted

data/cases.json                54 published cases, exported from Webflow CMS
data/news.json                 36 published news items
data/cases-nl.json             Dutch twin of cases.json — same slugs, media and
data/news-nl.json              layout; only the copy, tags and dates differ
```

## Two languages

The Dutch site is a full mirror under `nl/`, sharing slugs, assets and
`main.js` with the English tree. `_shell.py` carries both string sets; the
builders write both trees in one run. Every page links its twin via a globe
switch in the nav and via `hreflang` alternates. English pages redirect to
their Dutch twin when the browser prefers Dutch (`navigator.languages`)
unless the visitor explicitly chose English; the choice is stored in
`localStorage` under `glossy-lang`, and Dutch pages never auto-redirect, so
crawlers (which render as en-US) never bounce off the `nl/` tree.

Copy rule: no em dashes anywhere in site copy, either language.

To change content: edit `data/cases.json` AND `data/cases-nl.json` (same for
news), then rerun the builders. The one-off translator merge that produced
the `-nl` files lives in `scripts/merge-nl.py`, glossary included.

## How a case page is assembled

A case is not one CMS record — it is stitched from **five collections**:

| Collection | Role on the page |
|---|---|
| Cases | Hero, baseline, facts, slogan, intro, testimonial |
| Case Sections | The visual body: each section has a heading, description and up to 15 media slots |
| Consultancy / Strategy / Branding / Experience Services | MultiReference IDs resolved to the "Services" tags |

Each Case Section carries a **Visual Type** (Full / Half / Third) which becomes
`data-cols="1|2|3"` on its media grid — that is what drives the layout rhythm.

### Regenerating — order matters

`export-cms.py` rebuilds `data/*.json` from the raw exports, which **overwrites
the scraped sections and the localised asset paths**. Always run the full chain:

```bash
python3 scripts/export-cms.py && python3 scripts/scrape-sections.py --cached && python3 scripts/localize-assets.py && python3 scripts/build-cases.py && python3 scripts/build-news.py && python3 scripts/build-sitemap.py
```

### Card media

The CMS field names are misleading and easy to wire up backwards:

| CMS field | Display name | Used for |
|---|---|---|
| `video-url-1` | Hero Video Url | the card's animation |
| `social-share-image` | **Hero** Fallback Image | the card image / video poster |
| `video-fallback-image` | **Social Share** Image | `og:image` only |

Cards lead with the case's own opening frame — the hero video where there is
one (9 of the 14 on the homepage), the hero image otherwise.

### Grids

The homepage and the cases overview do not share a layout:

| Page | Grid | Per page |
|---|---|---|
| `index.html` | 6 columns, spans repeating every 14 cards (3+3 · 2+4 · 4+2 · 3+3 · 3+3 · 2+4 · 3+3) | 14 |
| `cases.html` | uniform 4-up (2-up under 1100px) | 12 |

Aspect ratios scale with the column span so each row keeps a single height.

## The CMS layer

`data/*.json` was exported from the Webflow CMS via the API. Any element with a
`data-collection` attribute renders itself client-side and paginates:

```html
<div class="case-grid"
     data-collection="data/cases.json"
     data-kind="cases"
     data-per-page="12"
     data-more="#cases-more"
     data-counter="#cases-counter"></div>
```

To refresh the content, re-export from Webflow and overwrite the JSON files.

## Design system

Type scales fluidly with `clamp()` rather than the original's `font-size: 1vw`,
which broke under browser zoom. Tokens live at the top of `assets/css/style.css`:
`--ink`, `--paper`, `--smoke`, `--cream`, `--step-0`…`--step-4`, `--space-*`.

## SEO

Every page carries the full head Webflow offered per page and more: title,
meta description, canonical, hreflang alternates, Open Graph (url,
site_name, locale plus alternate, image with `assets/img/og-default.png`
as the fallback), Twitter cards and JSON-LD. The generators emit
CreativeWork schema per case and NewsArticle per news item; the root pages
carry Organization, WebSite, Service (AI Consultancy), ContactPage,
AboutPage and CollectionPage blocks. `sitemap.xml` lists all 199 indexable
URLs with their language twins; `robots.txt` points at it. Noindex pages
(careers, the design-system reference) stay out of the sitemap.

## Consent management

The black bottom bar carries the visual language of the previous Webflow site,
but consent is explicit by category: Necessary, Analytics, Marketing and
External media. Accept and reject have equal prominence, preferences expire
after six months and the footer always offers a way to revise the choice.

Google Analytics 4 uses the measurement ID recovered from the Webflow export,
`G-NPJVJ2CEFQ`, and follows basic consent mode: the Google tag is not requested
and no data is sent until Analytics is enabled. Revocation disables further
collection and removes accessible first-party `_ga` cookies; advertising
storage, user data and personalisation remain denied.

Optional scripts must be inert in source and declare their category:

```html
<script type="text/plain" data-consent="analytics" data-src="…"></script>
```

Interactive Vimeo players are emitted as local placeholders by `_shell.py` and
receive an iframe only after External media is enabled. Rebuilding the case
trees therefore preserves the consent gate.

## Local development

Needs a real HTTP server — the CMS rendering uses `fetch`, which `file://` blocks.

```bash
python3 -m http.server 8899
```

## Assets

All 807 Webflow-hosted files were pulled into `assets/media/` (803 after four
duplicates — the same asset served from both `uploads-ssl` and `cdn.prod` —
collapsed). Nothing on the site loads from Webflow any more.

Paths in `data/*.json` are stored repo-relative (`assets/media/x.webp`). Root
pages use them as-is; `cases/` and `news/` prefix `../` (`asset()` in
`scripts/_shell.py`, `assetUrl()` in `main.js`).

Vimeo-hosted video files stay remote — they were never Webflow's. Interactive
Vimeo players are consent-gated before their iframe is requested.

## Known gaps

- **`careers.html` is a placeholder.** The live page is password-protected in
  Webflow (HTTP 401), so its copy could not be read.
- **Case Section layout is inferred for the 29 scraped cases.** The Webflow MCP's
  `list_collection_items` ignores `limit`/`offset` and always returns the first
  100 records, while Case Sections has 177 — so 29 cases came back empty and were
  recovered from the published site instead (`scripts/scrape-sections.py`). The
  rendered markup does not expose the CMS Visual Type, so those sections get their
  layout from media count (1 = full, 2 = half, 3+ = third) rather than the real
  Full/Half/Third value. All 52 cases now have sections; 23 use the true CMS layout.
- **`assets/media/` is 324 MB.** Fine for GitHub (largest file is 4 MB, well
  under the 100 MB limit) but it makes clones heavy, and these are full-size
  originals rather than web-optimised derivatives.
- **The contact form uses FormSubmit.** Its first real submission triggers a
  one-time activation email to `info@glossy.tv`; the recipient must approve it
  before later intake requests are forwarded.
- **Only one case carries a testimonial** in the CMS.
- **The homepage Lottie logo is a static SVG here**, to avoid pulling in a
  Lottie player.
