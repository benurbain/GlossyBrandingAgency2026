# V02 / LAB-03 release — 9 September 2026

Ben approved publication of the completed V02/LAB-03 website on 9 September 2026.

## Production and rollback

- GitHub Pages: `main`, repository root, custom domain `glossy.tv`.
- Previous live release: `4b50e239a3332f58ac0006c949fecca6674974aa`.
- Permanent fallback tag: `v01-pre-lab03-2026-09-09`.
- Independent local archive: `GlossyBranding-backups/production-4b50e23-before-v02.tar.gz`.
- Archive SHA-256: `495ebca857d134ac8916556e864df416e241a96e7855a729882a023ddf99fcd4`.
- The earlier 7 September V01 archive and original LAB working directory remain intact.

Rollback requires explicit approval. Restore the tagged website as a new commit on main; do not force-push or reset shared history. Review later edits first. The tag captures the complete previous deployed repository and all its tracked assets.

## Contents

The approved V02 output replaces the public EN/NL pages. Shared LAB-03 grid, typography, H4 subgrid headings, footer/video CTA, consent styling, project interactions and the refined Dutch contact page are included. News article media remain in colour. The design-system reference is updated and stays noindex.

The release preserves CNAME, .nojekyll, the original robots policy, 203 sitemap URLs, original per-page indexing exclusions, form endpoint and consent-gated analytics. Localhost still suppresses mail and analytics. No test email was sent.

## Editing / rebuilding

The approved workspace is `GlossyBranding-V02/`, alongside the original repository. Its immutable `source/`, generator `tools/build-v02.cjs`, shared CSS/JS in `site/assets/` and `tools/prepare-release.cjs` are the V02 source of truth. The generated website is committed here.

**Do not run the legacy Python page generators directly over V02:** they generate the V01 layout. They remain in this repository for content/export reference. Build changes in the V02 workspace, review them, then prepare a separately approved release.

## Verification

- Static route/asset/anchor check: 210 pages, zero errors; two design-handbook runtime hash warnings.
- Release sitemap validation: 203 URLs resolve to generated pages and none is noindex.
- Contact endpoint CORS preflight: HTTP 204, allows `https://glossy.tv`, POST and Content-Type.
- Production publication and serving checks are recorded in the local version notes after push.

This is not a complete cross-browser/accessibility certification or an email-delivery test.
