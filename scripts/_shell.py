"""Shared page furniture for the generators. Pages sit one level down
(cases/, news/), so every internal link is prefixed with ../."""

import html

e = lambda s: html.escape(str(s or ""), quote=True)

SITE = "https://glossybranding.com/"


def asset(src):
    """data/*.json stores media repo-relative ("assets/media/x.webp") so the
    root pages can use it as-is. Generated pages sit one level down."""
    src = str(src or "")
    return src if src.startswith(("http://", "https://", "../", "/")) else "../" + src


def absolute(src):
    """og:image must be an absolute URL."""
    src = str(src or "")
    return src if src.startswith(("http://", "https://")) else SITE + src.lstrip("./")

NAV_LINKS = [
    ("about.html", "About"),
    ("brand-ai-consultancy.html", "AI Consultancy"),
    ("cases.html", "Cases"),
    ("news.html", "News"),
    ("contact.html", "Contact"),
]


def head(title, description, canonical, image=None, body_class=""):
    og_image = f'\n<meta property="og:image" content="{e(image)}">' if image else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="article">{og_image}
<link rel="icon" href="../assets/img/favicon.png">
<link rel="apple-touch-icon" href="../assets/img/webclip.png">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="{body_class}">

<a class="skip-link" href="#main">Skip to content</a>
"""


def nav(current=""):
    items = "\n".join(
        f'        <li><a class="nav__link" href="../{href}"'
        f'{" aria-current=\"page\"" if href == current else ""}>{label}</a></li>'
        for href, label in NAV_LINKS
    )
    return f"""
<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="../index.html" aria-label="Glossy Branding Agency — home">
      <span class="logo__anim" data-lottie="assets/media/glossy-logo.json" data-lottie-white="assets/media/glossy-logo-white.json">
        <img class="lottie-fallback" src="../assets/img/logo.svg" alt="Glossy Branding Agency" width="154" height="58">
      </span>
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
</header>
"""


FOOTER = """
<footer class="site-footer">
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
      <a href="../kmo-portefeuille.html">KMO Portefeuille</a>
      <span>© 2004–2026 · Glossy Branding Agency</span>
      <span>All rights reserved</span>
    </div>
  </div>
</footer>

<div class="transition" data-transition aria-hidden="true">
  <div class="transition__logo" data-lottie="assets/media/glossy-logo.json" data-lottie-white="assets/media/glossy-logo-white.json"></div>
</div>

<script src="../assets/js/lottie.min.js"></script>
<script src="../assets/js/main.js"></script>
</body>
</html>
"""


def media_tag(m, alt="", eager=False):
    """One media slot from a CMS section: image, silent looping video, or embed."""
    src = asset(m.get("src"))
    if not m.get("src"):
        return ""

    if m["type"] == "video":
        poster = f' poster="{e(asset(m["poster"]))}"' if m.get("poster") else ""
        return (
            f'<video class="media" src="{e(src)}"{poster} '
            f'autoplay muted loop playsinline preload="metadata"></video>'
        )

    if m["type"] == "embed":
        return (
            f'<div class="media media--embed">'
            f'<iframe src="{e(src)}" title="{e(alt) or "Video"}" loading="lazy" '
            f'allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
        )

    loading = "eager" if eager else "lazy"
    return (
        f'<img class="media" src="{e(src)}" alt="{e(alt)}" '
        f'loading="{loading}" decoding="async">'
    )
