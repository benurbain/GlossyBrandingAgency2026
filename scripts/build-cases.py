#!/usr/bin/env python3
"""
Generate one static HTML page per case from data/cases.json.

Output: cases/<slug>.html — real files, no build step at runtime.
Re-run after re-exporting the CMS:

    python3 scripts/build-cases.py
"""

import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "cases"

e = lambda s: html.escape(str(s or ""), quote=True)


def nav(current=""):
    links = [
        ("about.html", "About"),
        ("brand-ai-consultancy.html", "AI Consultancy"),
        ("cases.html", "Cases"),
        ("news.html", "News"),
        ("careers.html", "Careers"),
        ("contact.html", "Contact"),
    ]
    items = "\n".join(
        f'        <li><a class="nav__link" href="../{href}"'
        f'{" aria-current=\"page\"" if href == current else ""}>{label}</a></li>'
        for href, label in links
    )
    return f"""<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="../index.html" aria-label="Glossy Branding Agency — home">
      <img src="../assets/img/logo.svg" alt="Glossy Branding Agency" width="154" height="58">
    </a>
    <nav class="nav" data-nav aria-label="Main">
      <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__list">
{items}
      </ul>
    </nav>
  </div>
</header>"""


FOOTER = """<footer class="site-footer">
  <div class="container">
    <a class="logo" href="../index.html" aria-label="Glossy Branding Agency — home">
      <img src="../assets/img/logo.svg" alt="" width="154" height="58">
    </a>

    <div class="site-footer__grid">
      <nav aria-label="Footer">
        <ul>
          <li><a href="../about.html">About</a></li>
          <li><a href="../cases.html">Work</a></li>
          <li><a href="../news.html">News</a></li>
          <li><a href="../contact.html">Contact</a></li>
        </ul>
      </nav>

      <nav aria-label="Social">
        <ul>
          <li><a href="https://www.linkedin.com/company/glossy-branding-agency/" rel="noopener">LinkedIn</a></li>
          <li><a href="https://www.instagram.com/glossybrandingagency/" rel="noopener">Instagram</a></li>
          <li><a href="https://www.facebook.com/glossybrandingagency" rel="noopener">Facebook</a></li>
          <li><a href="https://x.com/glossybranding" rel="noopener">X (ex-Twitter)</a></li>
        </ul>
      </nav>

      <div class="site-footer__badges">
        <img src="../assets/img/badge-kmo.png" alt="Erkend dienstverlener KMO-portefeuille" loading="lazy">
        <img src="../assets/img/badge-school.svg" alt="School of Branding" loading="lazy">
      </div>
    </div>

    <div class="site-footer__legal">
      <a href="../privacy-policy.html">Privacy &amp; cookie policy</a>
      <span>© 2004–2026 · Glossy Branding Agency</span>
      <span>All rights reserved</span>
    </div>
  </div>
</footer>"""


def meta_row(case):
    """The small fact list under the hero — only rows that actually have a value."""
    rows = [
        ("Client", case.get("client") or case.get("name")),
        ("Industry", case.get("industry")),
        ("Location", case.get("location")),
        ("When", case.get("when")),
        ("Services", case.get("services")),
    ]
    out = "".join(
        f'\n        <div class="case-meta__row">'
        f'<dt class="eyebrow">{e(k)}</dt><dd>{e(v)}</dd></div>'
        for k, v in rows
        if v
    )
    return f'<dl class="case-meta">{out}\n      </dl>' if out else ""


def hero_media(case):
    video, img = case.get("heroVideo"), case.get("hero")
    if video and re.match(r"^https?://\S+\.(mp4|webm)(\?|$)", video):
        poster = f' poster="{e(img)}"' if img else ""
        return (
            f'<video class="case-hero__media" src="{e(video)}"{poster} '
            f'autoplay muted loop playsinline></video>'
        )
    if img:
        return (
            f'<img class="case-hero__media" src="{e(img)}" '
            f'alt="{e(case["name"])}" fetchpriority="high" decoding="async">'
        )
    return ""


def page(case, prev_case, next_case):
    title = f'{case["name"]} • Glossy Branding Agency'
    desc = case.get("seo") or case.get("baseline") or case["name"]

    body = case.get("body") or ""
    body_html = f'<div class="prose case-body">{body}</div>' if body.strip() else ""

    slogan = (
        f'<p class="case-slogan">{e(case["slogan"])}</p>' if case.get("slogan") else ""
    )

    website = (
        f'<p style="margin-top: var(--space-l);">'
        f'<a class="btn" href="{e(case["website"])}" rel="noopener">Visit website →</a></p>'
        if case.get("website")
        else ""
    )

    testimonial = ""
    if case.get("testimonial"):
        who = " — ".join(
            filter(None, [case.get("testimonialPerson"), case.get("testimonialTitle")])
        )
        cite = f"<footer>{e(who)}</footer>" if who else ""
        testimonial = f"""
  <section class="container section">
    <blockquote class="case-quote">
      <p>{e(case["testimonial"])}</p>
      {cite}
    </blockquote>
  </section>"""

    second = ""
    if case.get("secondHero"):
        second = f"""
  <section class="container section--tight">
    <img class="case-figure" src="{e(case["secondHero"])}" alt="" loading="lazy" decoding="async">
  </section>"""

    pager = "".join(
        f'<a class="case-pager__link" href="{e(c["slug"])}.html">'
        f'<span class="eyebrow">{label}</span>'
        f'<span class="case-pager__name">{e(c["name"])}</span></a>'
        for c, label in ((prev_case, "Previous"), (next_case, "Next"))
        if c
    )

    flag = '<span class="case-card__flag" style="position:static;display:inline-block;margin-bottom:var(--space-s);">new</span>' if case.get("isNew") else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="https://glossybranding.com/cases/{e(case['slug'])}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="article">
{f'<meta property="og:image" content="{e(case["image"])}">' if case.get("image") else ""}
<link rel="icon" href="../assets/img/favicon.png">
<link rel="apple-touch-icon" href="../assets/img/webclip.png">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

{nav("cases.html")}

<main id="main">

  <article>
    <header class="container hero">
      {flag}
      <h1 class="hero__title">{e(case["name"])}</h1>
      {f'<p class="hero__lead">{e(case["baseline"])}</p>' if case.get("baseline") else ""}
    </header>

    <div class="container section--tight">
      <figure class="case-hero">{hero_media(case)}</figure>
    </div>

    <div class="container section--tight">
      <div class="split">
        <div>{meta_row(case)}</div>
        <div>
          {slogan}
          {body_html}
          {website}
        </div>
      </div>
    </div>
{second}{testimonial}
  </article>

  <nav class="container section" aria-label="More cases">
    <div class="case-pager">{pager}</div>
    <p style="margin-top: var(--space-l);"><a class="btn" href="../cases.html">All cases</a></p>
  </nav>

</main>

{FOOTER}

<script src="../assets/js/main.js"></script>
</body>
</html>
"""


def main():
    cases = json.loads((ROOT / "data" / "cases.json").read_text())
    OUT.mkdir(exist_ok=True)

    seen = {}
    for i, case in enumerate(cases):
        slug = case.get("slug")
        if not slug:
            print(f"  ! skipped (no slug): {case.get('name')}")
            continue
        if slug in seen:
            print(f"  ! duplicate slug '{slug}' — {case.get('name')} overwrites {seen[slug]}")
        seen[slug] = case.get("name")

        prev_case = cases[i - 1] if i > 0 else None
        next_case = cases[i + 1] if i + 1 < len(cases) else None
        (OUT / f"{slug}.html").write_text(page(case, prev_case, next_case))

    print(f"Wrote {len(seen)} case pages to {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
