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
            media_tag(m, alt=f"{case_name}, {sec.get('title') or 'case visual'}")
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
    """The overview strip: four labelled facts side by side, as on the original."""
    rows = [
        ("Founders", case.get("founders")),
        ("Company", case.get("company") or case.get("client") or case.get("name")),
        ("Industry", case.get("industry")),
        ("Location", case.get("location")),
    ]
    out = "".join(
        f'\n        <div class="case-facts__item"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>'
        for k, v in rows
        if v
    )
    return f'<dl class="case-facts">{out}\n      </dl>' if out else ""


SERVICE_LABEL = {
    "consultancy": "Consultancy",
    "strategy": "Strategy",
    "branding": "Branding",
    "experience": "Experience",
}


def what_we_did(case):
    """Services stay grouped by their taxonomy — four columns, not one tag soup."""
    groups = case.get("services") or {}
    cols = "".join(
        f'\n        <div class="what-we-did__col"><p class="what-we-did__label">{e(label)}</p>'
        + "".join(f"<p>{e(n)}</p>" for n in groups[key])
        + "</div>"
        for key, label in SERVICE_LABEL.items()
        if groups.get(key)
    )
    if not cols:
        return ""
    return f"""
  <section class="container case-block">
    <h2 class="case-block__title">What we did</h2>
    <div class="what-we-did">{cols}
    </div>
  </section>"""


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
        f'<div class="container case-website">'
        f'<a class="btn" href="{e(case["website"])}" rel="noopener">Visit the website here</a></div>'
        if case.get("website")
        else ""
    )

    sections = "".join(section_html(s, case["name"]) for s in case.get("sections") or [])

    second = (
        f'<img class="case-overview__figure" src="{e(asset(case["secondHero"]))}" '
        f'alt="" loading="lazy" decoding="async">'
        if case.get("secondHero") else ""
    )

    testimonial = ""
    if case.get("testimonial"):
        who = " · ".join(
            filter(None, [case.get("testimonialPerson"), case.get("testimonialTitle")])
        )
        testimonial = f"""
  <section class="container section">
    <blockquote class="case-quote">
      <p>{e(case["testimonial"])}</p>
      {f"<footer>{e(who)}</footer>" if who else ""}
    </blockquote>
  </section>"""

    def more_card(c):
        img = (f'<img src="{e(asset(c.get("hero") or c.get("image")))}" alt="" '
               f'loading="lazy" decoding="async">') if (c.get("hero") or c.get("image")) else ""
        return (f'<a class="more-cases__card" href="{e(c["slug"])}.html">{img}'
                f'<span class="more-cases__name">{e(c["name"])}</span>'
                f'<span class="more-cases__baseline">{e(c.get("baseline") or "")}</span></a>')

    pager = "".join(more_card(c) for c in (prev_case, next_case) if c)

    flag = ' <span class="case-flag">new</span>' if case.get("isNew") else ""

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

    <div class="container case-overview" id="case-body">
      <div class="case-overview__head">
        <h1 class="case-overview__title">{e(case["name"])}{flag}</h1>
        {f'<p class="case-overview__date">{e(case["when"])}</p>' if case.get("when") else ""}
      </div>
      {f'<p class="case-overview__baseline">{e(case["baseline"])}</p>' if case.get("baseline") else ""}
      {facts(case)}
      {second}
      {intro}
    </div>
{sections}
    {website}
{testimonial}
  </article>
{what_we_did(case)}
  <section class="container case-block">
    <h2 class="case-block__title">Inspired by this case?</h2>
    <p class="case-block__lead">Can your business, organisation or product benefit from a (re)branding?
      Contact us to discover if we are the right partner for you. See you soon!</p>
    <p><a class="btn btn--solid" href="../contact.html">Contact us</a></p>
  </section>

  <section class="more-cases">
    <div class="container">
      <h2 class="case-block__title">You might also like</h2>
      <div class="more-cases__grid">{pager}</div>
    </div>
  </section>

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
