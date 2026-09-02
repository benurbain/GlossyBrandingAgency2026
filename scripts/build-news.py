#!/usr/bin/env python3
"""
Generate one static HTML page per news item, in both languages.

English pages come from data/news.json into news/; Dutch pages from
data/news-nl.json into nl/news/.

    python3 scripts/export-cms.py    # refresh data/ from the raw exports
    python3 scripts/build-news.py    # then regenerate news/ and nl/news/
"""

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import _shell  # noqa: E402
from _shell import ORG, SITE, absolute, asset, e, head, iso_month, media_tag, nav  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent

T = {
    "en": {"newer": "Newer", "older": "Older", "all": "All insights & updates", "read": "Read more"},
    "nl": {"newer": "Nieuwer", "older": "Ouder", "all": "Alle inzichten & updates", "read": "Lees meer"},
}


def nested_assets(markup):
    """Make CMS-authored asset links work from pages inside the news trees."""
    markup = re.sub(r"\s+id=([\"'])\1", "", markup or "")
    return re.sub(r'\b(src|href)=(["\'])assets/', rf'\1=\2{_shell.A}assets/', markup)


def hero(item):
    video = item.get("video")
    if video and re.search(r"\.(mp4|webm)(\?|$)", video):
        poster = f' poster="{e(asset(item["image"]))}"' if item.get("image") else ""
        return (
            f'<video class="case-hero__media" src="{e(asset(video))}"{poster} '
            f"autoplay muted loop playsinline></video>"
        )
    if item.get("image"):
        return (
            f'<img class="case-hero__media" src="{e(asset(item["image"]))}" '
            f'alt="{e(item["name"])}" fetchpriority="high" decoding="async">'
        )
    return ""


def gallery(item):
    tiles = [media_tag({"type": "image", "src": src}, alt=item["name"])
             for src in item.get("gallery") or []]
    tiles += [media_tag({"type": "video", "src": v}) for v in item.get("videos") or []]
    tiles = [t for t in tiles if t]
    if not tiles:
        return ""
    cols = 2 if len(tiles) > 1 else 1
    return f"""
  <section class="container case-section">
    <div class="case-section__grid" data-cols="{cols}">
      {"".join(tiles)}
    </div>
  </section>"""


def page(item, prev_item, next_item, t):
    title = f'{item["name"]} | Glossy'
    desc = item.get("seo") or item.get("subtitle") or item.get("excerpt") or item["name"]
    path = f"news/{item['slug']}"

    body = (
        f'<div class="prose case-intro">{nested_assets(item["body"])}</div>'
        if (item.get("body") or "").strip()
        else ""
    )

    link = ""
    if item.get("link"):
        label = item.get("linkText") or t["read"]
        link = (
            f'<p style="margin-top: var(--space-l);">'
            f'<a class="btn" href="{e(item["link"])}" rel="noopener">{e(label)} →</a></p>'
        )

    pager = "".join(
        f'<a class="case-pager__link" href="{e(n["slug"])}.html">'
        f'<span class="eyebrow">{label}</span>'
        f'<span class="case-pager__name">{e(n["name"])}</span></a>'
        for n, label in ((prev_item, t["newer"]), (next_item, t["older"]))
        if n
    )

    date = item.get("monthYear") or item.get("published") or ""
    subtitle = (
        f'<p class="hero__lead">{e(item["subtitle"])}</p>' if item.get("subtitle") else ""
    )

    lang = _shell.LANG
    canonical = f"{SITE}nl/{path}" if lang == "nl" else f"{SITE}{path}"
    short_desc = (item.get("subtitle") or item.get("excerpt") or item["name"]).strip()[:250]
    jsonld = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": item["name"],
        "url": canonical,
        "mainEntityOfPage": canonical,
        "inLanguage": lang,
        "description": short_desc,
        "publisher": ORG,
        "author": ORG,
    }
    if item.get("image"):
        jsonld["image"] = absolute(item["image"])
    if item.get("published"):
        jsonld["datePublished"] = item["published"]
    elif iso_month(item.get("monthYear")):
        jsonld["datePublished"] = iso_month(item.get("monthYear"))

    return (
        head(title, desc, path, absolute(item.get("image")), jsonld=jsonld)
        + nav("news.html", path)
        + f"""
<main id="main">

  <article>
    <header class="container hero">
      <p class="eyebrow">{e(date)}</p>
      <h1 class="hero__title" style="margin-top: var(--space-s);">{e(item["name"])}</h1>
      {subtitle}
    </header>

    <div class="container section--tight">
      <figure class="case-hero case-hero--ratio">{hero(item)}</figure>
    </div>

    <div class="container section--tight">
      {body}
      {link}
    </div>
{gallery(item)}
  </article>

  <nav class="container section" aria-label="More insights and updates">
    <div class="case-pager">{pager}</div>
    <p style="margin-top: var(--space-l);"><a class="btn" href="../news.html">{t["all"]}</a></p>
  </nav>

</main>
"""
        + _shell.footer()
    )


def build(lang):
    data_file = "news.json" if lang == "en" else "news-nl.json"
    out = ROOT / "news" if lang == "en" else ROOT / "nl" / "news"
    src = ROOT / "data" / data_file
    if not src.exists():
        print(f"  ! {data_file} missing, skipped {lang}")
        return

    _shell.set_lang(lang)
    items = json.loads(src.read_text())
    out.mkdir(parents=True, exist_ok=True)
    t = T[lang]

    written = 0
    for i, item in enumerate(items):
        if not item.get("slug"):
            print(f"  ! skipped (no slug): {item.get('name')}")
            continue
        prev_item = items[i - 1] if i > 0 else None
        next_item = items[i + 1] if i + 1 < len(items) else None
        (out / f"{item['slug']}.html").write_text(page(item, prev_item, next_item, t))
        written += 1

    print(f"[{lang}] Wrote {written} news pages")


def main():
    for lang in ("en", "nl"):
        build(lang)


if __name__ == "__main__":
    main()
