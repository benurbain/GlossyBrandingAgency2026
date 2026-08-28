"""Shared page furniture for the generators, in both site languages.

Generated pages sit one level down inside their language tree:
    cases/x.html      nl/cases/x.html
    news/x.html       nl/news/x.html

Call set_lang() before rendering a batch; asset() then climbs the right
number of levels (../ for the English tree, ../../ from inside nl/)."""

import html
import json
import re

e = lambda s: html.escape(str(s or ""), quote=True)

SITE = "https://glossy.tv/"

LANG = "en"
A = "../"  # asset prefix for the current language tree


def set_lang(lang):
    global LANG, A
    LANG = lang
    A = "../" if lang == "en" else "../../"


def asset(src):
    """data/*.json stores media repo-relative ("assets/media/x.webp") so the
    root pages can use it as-is. Generated pages prefix their own depth."""
    src = str(src or "")
    return src if src.startswith(("http://", "https://", "../", "/")) else A + src


def absolute(src):
    """og:image must be an absolute URL."""
    src = str(src or "")
    return src if src.startswith(("http://", "https://")) else SITE + src.lstrip("./")


STR = {
    "en": {
        "skip": "Skip to content",
        "nav": [
            ("about.html", "About"),
            ("brand-ai-consultancy.html", "AI Consultancy"),
            ("cases.html", "Cases"),
            ("news.html", "News"),
            ("contact.html", "Contact"),
        ],
        "footer": [
            ("about.html", "About"),
            ("cases.html", "Work"),
            ("news.html", "News"),
            ("contact.html", "Contact"),
        ],
        "privacy": "Privacy &amp; cookie policy",
        "kmo": "KMO Portefeuille",
        "rights": "All rights reserved",
        "cookie_label": "Cookie notice",
        "cookie": "To make your website user experience as easy and personal as "
                  "possible, we make use of cookies. Read more in our "
                  '<a href="{p}privacy-policy.html">cookie policy</a>.',
        "accept": "Accept cookies",
        "close": "Dismiss",
        "external_blocked": "This video is provided by Vimeo and stays blocked until you allow external media.",
        "manage_cookies": "Manage preferences",
        "switch_label": "NL",
        "switch_aria": "Nederlandse versie",
        "switch_hreflang": "nl",
    },
    "nl": {
        "skip": "Ga naar inhoud",
        "nav": [
            ("about.html", "Over ons"),
            ("brand-ai-consultancy.html", "AI Consultancy"),
            ("cases.html", "Cases"),
            ("news.html", "Nieuws"),
            ("contact.html", "Contact"),
        ],
        "footer": [
            ("about.html", "Over ons"),
            ("cases.html", "Werk"),
            ("news.html", "Nieuws"),
            ("contact.html", "Contact"),
        ],
        "privacy": "Privacy- &amp; cookiebeleid",
        "kmo": "KMO-portefeuille",
        "rights": "Alle rechten voorbehouden",
        "cookie_label": "Cookiemelding",
        "cookie": "Om jouw ervaring op deze website zo vlot en persoonlijk "
                  "mogelijk te maken, gebruiken we cookies. Lees er meer over in ons "
                  '<a href="{p}privacy-policy.html">cookiebeleid</a>.',
        "accept": "Accepteer cookies",
        "close": "Sluiten",
        "external_blocked": "Deze video wordt door Vimeo geleverd en blijft geblokkeerd tot je externe media toestaat.",
        "manage_cookies": "Voorkeuren beheren",
        "switch_label": "EN",
        "switch_aria": "English version",
        "switch_hreflang": "en",
    },
}

GLOBE = ('<svg viewBox="0 0 24 24" width="15" height="15" fill="none" '
         'stroke="currentColor" stroke-width="1.6" aria-hidden="true">'
         '<circle cx="12" cy="12" r="9.2"/><ellipse cx="12" cy="12" rx="4.2" ry="9.2"/>'
         '<path d="M3.2 9h17.6M3.2 15h17.6"/></svg>')


ORG = {
    "@type": "Organization",
    "name": "Glossy Branding Agency",
    "url": SITE,
    "logo": SITE + "assets/img/webclip.png",
    "sameAs": [
        "https://www.linkedin.com/company/glossy-branding-agency/",
        "https://www.instagram.com/glossybrandingagency/",
        "https://www.facebook.com/glossybrandingagency",
        "https://x.com/glossybranding",
    ],
}

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
    "januari": 1, "februari": 2, "maart": 3, "mei": 5, "juni": 6, "juli": 7,
    "augustus": 8, "oktober": 10,
}


def iso_month(s):
    """'August 2025' or 'augustus 2025' -> '2025-08'; anything else -> None."""
    parts = str(s or "").split()
    if len(parts) == 2 and parts[0].lower() in _MONTHS and parts[1].isdigit():
        return f"{parts[1]}-{_MONTHS[parts[0].lower()]:02d}"
    return None


def jsonld_tag(data):
    if not data:
        return ""
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return f'\n<script type="application/ld+json">{blob}</script>'


def twin(path):
    """Relative URL from the current generated page to its language twin."""
    if LANG == "en":
        return f"../nl/{path}.html"
    return f"../../{path}.html"


def head(title, description, path, image=None, body_class="", jsonld=None):
    """path is language-neutral and extension-free, e.g. "cases/kaa-gent"."""
    canon_en = f"{SITE}{path}"
    canon_nl = f"{SITE}nl/{path}"
    canonical = canon_nl if LANG == "nl" else canon_en

    # Only English pages redirect: an explicit choice via the switch always
    # wins, otherwise browsers that prefer Dutch get the NL version. Crawlers
    # render with en-US, so they never bounce off the NL tree.
    redirect = ""
    if LANG == "en":
        redirect = f"""
<script>
(function () {{
  try {{
    var c = localStorage.getItem('glossy-lang');
    var w = (navigator.languages || [navigator.language || '']).some(function (l) {{
      return String(l).toLowerCase().indexOf('nl') === 0;
    }});
    if (c !== 'en' && (c === 'nl' || w)) location.replace('{twin(path)}');
  }} catch (e) {{}}
}})();
</script>"""

    og_img_url = image or f"{SITE}assets/img/og-default.png"
    locale = "nl_BE" if LANG == "nl" else "en_US"
    locale_alt = "en_US" if LANG == "nl" else "nl_BE"
    return f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<link rel="alternate" hreflang="en" href="{e(canon_en)}">
<link rel="alternate" hreflang="nl" href="{e(canon_nl)}">
<link rel="alternate" hreflang="x-default" href="{e(canon_en)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:site_name" content="Glossy Branding Agency">
<meta property="og:locale" content="{locale}">
<meta property="og:locale:alternate" content="{locale_alt}">
<meta property="og:image" content="{e(og_img_url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}">
<meta name="twitter:image" content="{e(og_img_url)}">
<link rel="icon" href="{A}assets/img/favicon.png">
<link rel="apple-touch-icon" href="{A}assets/img/webclip.png">
<link rel="stylesheet" href="{A}assets/css/style.css?v=23">{jsonld_tag(jsonld)}{redirect}
</head>
<body class="{body_class}">

<a class="skip-link" href="#main">{STR[LANG]["skip"]}</a>
"""


def nav(current="", path=""):
    s = STR[LANG]
    items = "\n".join(
        f'        <li><a class="nav__link" href="../{href}"'
        f'{" aria-current=\"page\"" if href == current else ""}>{label}</a></li>'
        for href, label in s["nav"]
    )
    switch = (
        f'        <li><a class="nav__link nav__link--lang" href="{e(twin(path))}" '
        f'hreflang="{s["switch_hreflang"]}" data-set-lang="{s["switch_hreflang"]}" '
        f'aria-label="{s["switch_aria"]}">\n          {GLOBE}\n          '
        f'{s["switch_label"]}</a></li>'
    )
    return f"""
<header class="site-header">
  <div class="container site-header__inner">
    <a class="logo" href="../index.html" aria-label="Glossy Branding Agency, home">
      <span class="logo__anim" data-lottie="assets/media/glossy-logo.json" data-lottie-white="assets/media/glossy-logo-white.json">
        <img class="lottie-fallback" src="{A}assets/img/logo.svg" alt="Glossy Branding Agency" width="154" height="58">
      </span>
    </a>
    <nav class="nav" data-nav aria-label="Main">
      <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__list">
{items}
{switch}
      </ul>
    </nav>
  </div>
</header>
"""


def footer():
    s = STR[LANG]
    links = "\n".join(
        f'          <li><a href="../{href}">{label}</a></li>'
        for href, label in s["footer"]
    )
    return f"""
<footer class="site-footer">
  <div class="container">
    <a class="logo" href="../index.html" aria-label="Glossy Branding Agency, home">
      <img src="{A}assets/img/logo.svg" alt="" width="154" height="58">
    </a>

    <div class="site-footer__grid">
      <nav aria-label="Footer">
        <ul>
{links}
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
        <img src="{A}assets/img/badge-kmo.png" alt="Erkend dienstverlener KMO-portefeuille" loading="lazy">
        <img src="{A}assets/img/badge-school.svg" alt="School of Branding" loading="lazy">
      </div>
    </div>

    <div class="site-footer__legal">
      <a href="../privacy-policy.html">{s["privacy"]}</a>
      <a href="../kmo-portefeuille.html">{s["kmo"]}</a>
      <span>© 2004–2026 · Glossy Branding Agency</span>
      <span>{s["rights"]}</span>
    </div>
  </div>
</footer>

<aside class="cookie-bar" data-cookie-bar aria-label="{s["cookie_label"]}">
  <p class="cookie-bar__text">{s["cookie"].format(p="../")}</p>
  <div class="cookie-bar__actions">
    <button class="btn" type="button" data-cookie-accept>{s["accept"]}</button>
    <button class="cookie-bar__close" type="button" data-cookie-close aria-label="{s["close"]}">&times;</button>
  </div>
</aside>

<div class="transition" data-transition aria-hidden="true">
  <div class="transition__logo" data-lottie="assets/media/glossy-logo.json" data-lottie-white="assets/media/glossy-logo-white.json"></div>
</div>

<script src="{A}assets/js/lottie.min.js"></script>
<script src="{A}assets/js/main.js?v=7"></script>
<script>
document.querySelectorAll('[data-set-lang]').forEach(function (a) {{
  a.addEventListener('click', function () {{
    try {{ localStorage.setItem('glossy-lang', a.getAttribute('data-set-lang')); }} catch (e) {{}}
  }});
}});
</script>
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
        match = re.match(r"https?://(?:www\.)?vimeo\.com/(\d+)", src)
        embed_src = (
            f"https://player.vimeo.com/video/{match.group(1)}?dnt=1"
            if match
            else src
        )
        s = STR[LANG]
        return (
            f'<div class="media media--embed" data-consent-embed '
            f'data-consent-src="{e(embed_src)}" data-consent-title="{e(alt) or "Video"}">'
            f'<div class="consent-embed__placeholder" data-consent-placeholder>'
            f'<p>{s["external_blocked"]}</p>'
            f'<button class="btn cookie-btn" type="button" data-consent-manage>'
            f'{s["manage_cookies"]}</button></div></div>'
        )

    loading = "eager" if eager else "lazy"
    return (
        f'<img class="media" src="{e(src)}" alt="{e(alt)}" '
        f'loading="{loading}" decoding="async">'
    )
