# GlossyBrandingAgency2026

A hand-written static rebuild of [glossybranding.com](https://glossybranding.com) —
semantic HTML, plain CSS, vanilla JS. No Webflow runtime, no jQuery, no build step.

**Live:** https://benurbain.github.io/GlossyBrandingAgency2026/

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
404.html

assets/css/style.css           Design system: tokens, layout, components
assets/js/main.js              Nav, FAQ accordion, CMS rendering
assets/fonts/                  Rethink Sans (variable, roman + italic)
assets/img/                    Logo, favicon, partner badges

data/cases.json                52 published cases, exported from Webflow CMS
data/news.json                 36 published news items
```

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

## Local development

Needs a real HTTP server — the CMS rendering uses `fetch`, which `file://` blocks.

```bash
python3 -m http.server 8899
```

## Known gaps

- **`careers.html` is a placeholder.** The live page is password-protected in
  Webflow (HTTP 401), so its copy could not be read.
- **Case and news images still point at the Webflow CDN.** They render fine today,
  but they are not self-hosted — localise them before switching Webflow off.
- **Case and news detail pages are not built.** Only the overviews exist; case
  cards link to `/cases/<slug>`, which has no page behind it yet.
- **Forms have no backend.** Both the contact and newsletter forms post to `#` —
  point them at a form handler.
- **The homepage Lottie logo is a static SVG here**, to avoid pulling in a
  Lottie player.
