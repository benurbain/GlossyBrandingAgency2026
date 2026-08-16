#!/usr/bin/env python3
"""
Turn the raw Webflow CMS exports into the JSON this site renders from.

A case is stitched together from five collections: the case itself, its ordered
Case Sections (the visual body), and four service taxonomies whose MultiReference
IDs resolve to plain tag names.

Point RAW at a directory holding the raw `list_collection_items` responses, then:

    python3 scripts/export-cms.py
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = pathlib.Path(
    sys.argv[1] if len(sys.argv) > 1 else ROOT / "scripts" / "raw"
)

# Webflow Option-field IDs for Case Sections → visual-type.
VISUAL_TYPE = {
    "491ac2f74239cde197e9b9ca8cb8cc2b": "full",
    "03a8ac5299584c6968e690fef5cf8b8d": "half",
    "05b63c8daacc6af88bb4c158464a5e01": "third",
}

# The four service taxonomies, id → display name.
SERVICES = {
    # Consultancy
    "64833cfbbed90c3bbe2d2198": "Brand opportunities",
    "64833cfbbed90c3bbe2d2196": "Cultural context",
    "64833cfbbed90c3bbe2d2195": "Industry trends",
    "64833cfbbed90c3bbe2d2194": "Go-to-market",
    "64833cfbbed90c3bbe2d2193": "Concept validation",
    "64833cfbbed90c3bbe2d2192": "Research and Insights",
    "64833cfbbed90c3bbe2d2191": "Identity expertise",
    "64833cfbbed90c3bbe2d2190": "Brand analysis",
    "64833cfbbed90c3bbe2d218f": "Brand ideation",
    # Strategy
    "64833cfbbed90c3bbe2d21a1": "Trademark",
    "64833cfbbed90c3bbe2d21a0": "Competitive landscape",
    "64833cfbbed90c3bbe2d219f": "Personality",
    "64833cfbbed90c3bbe2d219e": "Proposition",
    "64833cfbbed90c3bbe2d219d": "Positioning",
    "64833cfbbed90c3bbe2d219c": "Purpose",
    "64833cfbbed90c3bbe2d219b": "Naming",
    "64833cfbbed90c3bbe2d219a": "Brand definition",
    "64833cfbbed90c3bbe2d2199": "Co-create",
    # Branding
    "64833cfbbed90c3bbe2d21aa": "Brand templates",
    "64833cfbbed90c3bbe2d21a9": "Design systems",
    "64833cfbbed90c3bbe2d21a8": "Copywriting",
    "64833cfbbed90c3bbe2d21a7": "Brand story",
    "64833cfbbed90c3bbe2d21a6": "Motion design",
    "64833cfbbed90c3bbe2d21a5": "UX/UI design",
    "64833cfbbed90c3bbe2d21a4": "Visual language",
    "64833cfbbed90c3bbe2d21a3": "Visual identity",
    "64833cfbbed90c3bbe2d21a2": "Art direction",
    # Experience
    "64833cfbbed90c3bbe2d21b7": "3D visualizations",
    "64833cfbbed90c3bbe2d21b6": "Spatial design",
    "64833cfbbed90c3bbe2d21b5": "Social media",
    "64833cfbbed90c3bbe2d21b4": "Advertising",
    "64833cfbbed90c3bbe2d21b3": "Film & Photography",
    "64833cfbbed90c3bbe2d21b2": "Packaging design",
    "64833cfbbed90c3bbe2d21b1": "Digital marketing",
    "64833cfbbed90c3bbe2d21b0": "Content creation",
    "64833cfbbed90c3bbe2d21af": "Editorial design",
    "64833cfbbed90c3bbe2d21ae": "Websites",
    "64833cfbbed90c3bbe2d21ad": "Campaigns",
    "64833cfbbed90c3bbe2d21ac": "Brand curation",
}

SERVICE_GROUPS = ("consultancy", "strategy", "branding", "experience")


def plain(s):
    """Strip tags from CMS rich text, then decode entities exactly once —
    the page generator escapes on output, so leaving them encoded double-escapes."""
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))).strip()


def url(o):
    return (o or {}).get("url")


def link(v):
    """Webflow VideoLink fields arrive as {url, metadata}; plain-text ones as a
    bare string. Normalise both to a string so generators never see a dict."""
    if isinstance(v, dict):
        return v.get("url") or None
    return v or None


def month_year(v):
    """The CMS "Month Year" field is a Date, so it arrives as an ISO timestamp.
    Render it the way the site shows it: "July 2026"."""
    s = plain(v)
    m = re.match(r"^(\d{4})-(\d{2})", s)
    if not m:
        return s
    year, month = m.group(1), int(m.group(2))
    names = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"]
    return f"{names[month - 1]} {year}" if 1 <= month <= 12 else s


def is_live(it):
    """Webflow sets isDraft on an item that has unpublished edits, even when a
    published version is still serving. Only drop items never published."""
    if it.get("isArchived"):
        return False
    return bool(it.get("lastPublished")) or not it.get("isDraft")


def load_items(*names):
    """Read raw export files and concatenate their `items` arrays."""
    items = []
    for name in names:
        path = RAW / name
        if not path.exists():
            sys.exit(f"missing raw export: {path}")
        items += json.loads(path.read_text())["result"]["items"]
    return items


def build_section(f):
    """One Case Section: a heading, a description and up to 15 media slots."""
    media = []
    for i in range(1, 16):
        img, vid = url(f.get(f"image-{i}")), f.get(f"video-{i}")
        if vid:
            media.append({"type": "video", "src": vid, "poster": img})
        elif img:
            media.append({"type": "image", "src": img})
    for i in range(1, 6):
        v = f.get(f"video-with-sound-{i}")
        if v:
            src = v.get("url") if isinstance(v, dict) else v
            if src:
                media.append({"type": "embed", "src": src})

    return {
        "title": plain(f.get("tussentitel")),
        "description": f.get("korte-beschrijving") or "",
        "layout": VISUAL_TYPE.get(f.get("visual-type"), "full"),
        "media": media,
    }


def main():
    # --- sections, indexed by id so cases can resolve their references ---------
    sections = {}
    for it in load_items("case-sections-1.json", "case-sections-2.json"):
        if is_live(it):
            sections[it["id"]] = build_section(it["fieldData"])

    # --- cases ----------------------------------------------------------------
    cases = []
    for it in load_items("cases.json"):
        if not is_live(it):
            continue
        f = it["fieldData"]

        services = {}
        tags = []
        for group in SERVICE_GROUPS:
            names = [SERVICES[sid] for sid in (f.get(group) or []) if sid in SERVICES]
            if names:
                services[group] = names
            for n in names:
                if n not in tags:
                    tags.append(n)

        body_sections = [
            sections[sid] for sid in (f.get("case-sections") or []) if sid in sections
        ]

        cases.append({
            "name": f.get("name"),
            "slug": f.get("slug"),
            "order": f.get("order") or 0,
            "client": plain(f.get("name-client")),
            "baseline": plain(f.get("baseline")),
            "slogan": plain(f.get("slogan")),
            "intro": f.get("text") or "",
            "industry": plain(f.get("industry-1")),
            "location": plain(f.get("location-1")),
            "company": plain(f.get("company-1")),
            "founders": plain(f.get("founders-1")),
            "when": plain(f.get("month-year-location")),
            "website": f.get("website-url"),
            "image": url(f.get("video-fallback-image")) or url(f.get("social-share-image")),
            "hero": url(f.get("social-share-image")) or url(f.get("video-fallback-image")),
            "heroVideo": link(f.get("video-url-1")),
            "secondHero": url(f.get("second-hero-fallback-image")),
            "secondHeroVideo": link(f.get("second-hero-video-url")),
            "testimonial": plain(f.get("testimonial-text")),
            "testimonialPerson": plain(f.get("testimonial-person")),
            "testimonialTitle": plain(f.get("testimonial-title")),
            "testimonialImage": url(f.get("testimonial-image")),
            "tags": tags,
            "services": services,
            "sections": body_sections,
            "isNew": bool(f.get("new-case")),
            # CMS switch: nav sits white over a dark full-screen hero.
            "whiteNav": bool(f.get("white-nav-text")),
            "seo": plain(f.get("seo-share-text")),
        })

    cases.sort(key=lambda c: -c["order"])
    (ROOT / "data" / "cases.json").write_text(
        json.dumps(cases, indent=2, ensure_ascii=False)
    )

    # --- client logos ---------------------------------------------------------
    # The About page closes on a client wall. Each logo may point at a case,
    # by item id, so resolve those to the slug the generated pages actually use.
    id_to_slug = {
        it["id"]: it["fieldData"].get("slug")
        for it in load_items("cases.json")
        if is_live(it)
    }

    logos = []
    for it in load_items("client-logos.json"):
        if not is_live(it):
            continue
        f = it["fieldData"]
        src = url(f.get("logo"))
        if not src:
            continue
        logos.append({
            "name": plain(f.get("name")),
            "logo": src,
            "case": id_to_slug.get(f.get("link-to-case")),
        })

    logos.sort(key=lambda l: l["name"].lower())
    (ROOT / "data" / "clients.json").write_text(
        json.dumps(logos, indent=2, ensure_ascii=False)
    )

    # --- news -----------------------------------------------------------------
    news = []
    for it in load_items("news.json"):
        if not is_live(it):
            continue
        f = it["fieldData"]
        extra = [url(f.get(f"extra-image-{i}")) for i in range(1, 7)]
        vids = [link(f.get(f"extra-video-0{i}")) for i in range(1, 3)]
        news.append({
            "name": plain(f.get("name")),
            "slug": f.get("slug"),
            "monthYear": month_year(f.get("month-year")),
            "subtitle": plain(f.get("subtitle")),
            "excerpt": plain(f.get("text"))[:280],
            "body": f.get("text") or "",
            "image": url(f.get("image")),
            "video": link(f.get("video-link")) or link(f.get("video-1")),
            "gallery": [x for x in extra if x],
            "videos": [v for v in vids if v],
            "link": link(f.get("link-button")),
            "linkText": plain(f.get("button-text")),
            "seo": plain(f.get("seo-text")),
            "published": (it.get("lastPublished") or it.get("createdOn") or "")[:10],
        })

    news.sort(key=lambda n: n["published"], reverse=True)
    (ROOT / "data" / "news.json").write_text(
        json.dumps(news, indent=2, ensure_ascii=False)
    )

    linked = sum(1 for l in logos if l["case"])
    print(f"clients:  {len(logos)}  ({linked} linked to a case)")

    with_sections = sum(1 for c in cases if c["sections"])
    total_media = sum(len(s["media"]) for c in cases for s in c["sections"])
    print(f"cases:    {len(cases)}  ({with_sections} with sections, "
          f"{sum(len(c['sections']) for c in cases)} sections, {total_media} media)")
    print(f"sections: {len(sections)} available")
    print(f"news:     {len(news)}")


if __name__ == "__main__":
    main()
