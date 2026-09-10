# SEO publication policy

- Existing canonical paths are authoritative; do not bulk-change URL identities.
- Authored production links use those paths, preserving hashes and queries.
- NL/EN/x-default alternates remain reciprocal. Preview HTML remains noindex.
- Run `python3 scripts/seo-maintenance.py .` after content edits, or
  `python3 scripts/build-sitemap.py` when adding/removing pages. Requires lxml.
- Run `python3 scripts/package-public.py` before publication. The GitHub workflow
  validates again and stages only public runtime files.
- `seo-dates.json` records semantic content fingerprints and per-page lastmod.
  Initial dates come from Git revisions with matching relevant content, not
  checkout timestamps. Content edits advance the date; reruns do not.
- Article dateModified tracks article text/media, excluding unrelated footer
  updates. Existing precise publication dates are retained.
- Incomplete historical dates stay in `seo-date-uncertainties.json`, not emitted
  as fabricated full dates in JSON-LD. Visible month/year labels remain.
- Bento stays available and linked, but noindex and outside the sitemap.
- `scripts/`, including `scripts/raw/`, never enters the Pages artifact. These
  files remain recoverable in Git. The repository itself is not made private.
- Canonical links handle existing `.html` aliases. GitHub Pages has no arbitrary
  HTTP redirect rules; no fake JavaScript replacement pages are generated.

## Hosting and rollback

Pages uses GitHub Actions, publishing the validated artifact only. CNAME and
HTTPS are unchanged. Previous release: `2449136a382d6f64665d00e137f0f890810b7e02`.
For content rollback, retain the workflow and restore the approved old public
files. Do not revert to publishing the complete source repository.
