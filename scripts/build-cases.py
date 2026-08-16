#!/usr/bin/env python3
"""
Generate one static HTML page per case from data/cases.json.

A case page is assembled from several CMS collections: the case record, its
ordered Case Sections (each with its own Full/Half/Third layout and media),
and the four service taxonomies flattened into tags.

    python3 scripts/export-cms.py     # refresh data/ from the raw exports
    python3 scripts/build-cases.py    # then regenerate cases/
"""

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _shell import FOOTER, absolute, asset, e, head, media_tag, nav  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "cases"

# How many media items sit on one row for each CMS "Visual Type".
COLUMNS = {"full": 1, "half": 2, "third": 3}


def section_html(sec, case_name):
    """One Case Section: optional heading + description, then its media grid."""
    head_parts = []
    if sec.get("title"):
        head_parts.append(f'<h2 class="case-section__title">{e(sec["title"])}</h2>')
    if (sec.get("description") or "").strip():
        head_parts.append(f'<div class="prose">{sec["description"]}</div>')
    header = (
        f'<header class="case-section__head">{"".join(head_parts)}</header>'
        if head_parts
        else ""
    )

    media = sec.get("media") or []
    grid = ""
    if media:
        cols = COLUMNS.get(sec.get("layout"), 1)
        tiles = "\n        ".join(
            media_tag(m, alt=f"{case_name} — {sec.get('title') or 'case visual'}")
            for m in media
        )
        grid = (
            f'\n      <div class="case-section__grid" data-cols="{cols}">\n'
            f"        {tiles}\n      </div>"
        )

    if not header and not grid:
        return ""

    return f"""
  <section class="container case-section">
    {header}{grid}
  </section>"""


def hero_media(case):
    video, img = case.get("heroVideo"), case.get("hero")
    if video and re.match(r"^https?://\S+\.(mp4|webm)(\?|$)", video):
        poster = f' poster="{e(asset(img))}"' if img else ""
        return (
            f'<video class="case-hero__media" src="{e(asset(video))}"{poster} '
            f"autoplay muted loop playsinline></video>"
        )
    if img:
        return (
            f'<img class="case-hero__media" src="{e(asset(img))}" alt="{e(case["name"])}" '
            f'fetchpriority="high" decoding="async">'
        )
    return ""


def facts(case):
    rows = [
        ("Client", case.get("client") or case.get("name")),
        ("Industry", case.get("industry")),
        ("Location", case.get("location")),
        ("When", case.get("when")),
    ]
    out = "".join(
        f'\n          <div class="case-meta__row">'
        f"<dt>{e(k)}</dt><dd>{e(v)}</dd></div>"
        for k, v in rows
        if v
    )
    return f'<dl class="case-meta">{out}\n        </dl>' if out else ""


def tag_list(case):
    tags = case.get("tags") or []
    if not tags:
        return ""
    items = "".join(f"<li>{e(t)}</li>" for t in tags)
    return f"""
        <div class="case-tags">
          <p class="eyebrow">Services</p>
          <ul class="tag-list">{items}</ul>
        </div>"""


def page(case, prev_case, next_case):
    title = f'{case["name"]} • Glossy Branding Agency'
    desc = case.get("seo") or case.get("baseline") or case["name"]

    intro = (
        f'<div class="prose case-intro">{case["intro"]}</div>'
        if (case.get("intro") or "").strip()
        else ""
    )
    slogan = f'<p class="case-slogan">{e(case["slogan"])}</p>' if case.get("slogan") else ""
    website = (
        f'<p style="margin-top: var(--space-l);">'
        f'<a class="btn" href="{e(case["website"])}" rel="noopener">Visit website →</a></p>'
        if case.get("website")
        else ""
    )

    sections = "".join(section_html(s, case["name"]) for s in case.get("sections") or [])

    second = ""
    if case.get("secondHero"):
        second = f"""
  <section class="container section--tight">
    <img class="case-figure" src="{e(asset(case["secondHero"]))}" alt="" loading="lazy" decoding="async">
  </section>"""

    testimonial = ""
    if case.get("testimonial"):
        who = " — ".join(
            filter(None, [case.get("testimonialPerson"), case.get("testimonialTitle")])
        )
        testimonial = f"""
  <section class="container section">
    <blockquote class="case-quote">
      <p>{e(case["testimonial"])}</p>
      {f"<footer>{e(who)}</footer>" if who else ""}
    </blockquote>
  </section>"""

    pager = "".join(
        f'<a class="case-pager__link" href="{e(c["slug"])}.html">'
        f'<span class="eyebrow">{label}</span>'
        f'<span class="case-pager__name">{e(c["name"])}</span></a>'
        for c, label in ((prev_case, "Previous"), (next_case, "Next"))
        if c
    )

    flag = '<span class="case-flag">new</span>' if case.get("isNew") else ""

    return (
        head(title, desc, f"https://glossybranding.com/cases/{case['slug']}", absolute(case.get("image")),
             body_class="has-hero nav-invert" if case.get("whiteNav") else "has-hero")
        + nav("cases.html")
        + f"""
<main id="main">

  <article>

    <div class="case-hero-wrap">
      <figure class="case-hero">{hero_media(case)}</figure>
      <a class="case-hero__scroll" href="#case-body">Scroll down</a>
    </div>

    <header class="container hero" id="case-body">
      {flag}
      <h1 class="hero__title">{e(case["name"])}</h1>
      {f'<p class="hero__lead">{e(case["baseline"])}</p>' if case.get("baseline") else ""}
    </header>

    <div class="container section--tight">
      <div class="case-intro-grid">
        <aside>
          {facts(case)}{tag_list(case)}
        </aside>
        <div>
          {slogan}
          {intro}
          {website}
        </div>
      </div>
    </div>
{sections}{second}{testimonial}
  </article>

  <nav class="container section" aria-label="More cases">
    <div class="case-pager">{pager}</div>
    <p style="margin-top: var(--space-l);"><a class="btn" href="../cases.html">All cases</a></p>
  </nav>

</main>
"""
        + FOOTER
    )


def main():
    cases = json.loads((ROOT / "data" / "cases.json").read_text())
    OUT.mkdir(exist_ok=True)

    written = 0
    for i, case in enumerate(cases):
        if not case.get("slug"):
            print(f"  ! skipped (no slug): {case.get('name')}")
            continue
        prev_case = cases[i - 1] if i > 0 else None
        next_case = cases[i + 1] if i + 1 < len(cases) else None
        (OUT / f"{case['slug']}.html").write_text(page(case, prev_case, next_case))
        written += 1

    with_sections = sum(1 for c in cases if c.get("sections"))
    print(f"Wrote {written} case pages ({with_sections} with CMS sections)")


if __name__ == "__main__":
    main()
