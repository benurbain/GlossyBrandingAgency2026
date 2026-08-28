#!/usr/bin/env python3
"""
Generate sitemap.xml for both language trees.

Every indexable page gets one <url> per language, each carrying the full
hreflang pair (en, nl, x-default) so Google sees the twins. Pages marked
noindex (careers, the design-system reference) and utility files (404,
hello, the old redirect stub) stay out.

    python3 scripts/build-sitemap.py
"""

import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://glossy.tv/"

ROOT_PAGES = [
    "", "about", "brand-ai-consultancy", "cases", "news", "contact",
    "kmo-portefeuille", "privacy-policy", "ai-driven-brand-innovation",
]


def lastmod(*files):
    ts = max(f.stat().st_mtime for f in files if f.exists())
    return datetime.date.fromtimestamp(ts).isoformat()


def entry(loc, mod, alt_en=None, alt_nl=None):
    lines = [f"  <url>", f"    <loc>{loc}</loc>", f"    <lastmod>{mod}</lastmod>"]
    if alt_en and alt_nl:
        lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{alt_en}"/>')
        lines.append(f'    <xhtml:link rel="alternate" hreflang="nl" href="{alt_nl}"/>')
        lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{alt_en}"/>')
    lines.append("  </url>")
    return "\n".join(lines)


def paired(path, en_file, nl_file):
    en_url = SITE + path if path else SITE
    nl_url = SITE + "nl/" + path if path else SITE + "nl/"
    mod = lastmod(en_file, nl_file)
    return [entry(en_url, mod, en_url, nl_url), entry(nl_url, mod, en_url, nl_url)]


def main():
    urls = []
    for p in ROOT_PAGES:
        fname = (p or "index") + ".html"
        urls += paired(p, ROOT / fname, ROOT / "nl" / fname)

    for kind in ("cases", "news"):
        data = json.loads((ROOT / "data" / f"{kind}.json").read_text())
        for item in data:
            slug = item.get("slug")
            if not slug:
                continue
            path = f"{kind}/{slug}"
            urls += paired(path, ROOT / kind / f"{slug}.html",
                           ROOT / "nl" / kind / f"{slug}.html")

    urls.append(entry(SITE + "bento/", lastmod(ROOT / "bento" / "index.html")))

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(urls) + "\n</urlset>\n")
    (ROOT / "sitemap.xml").write_text(xml)
    print(f"sitemap.xml: {len(urls)} URLs")


if __name__ == "__main__":
    main()
