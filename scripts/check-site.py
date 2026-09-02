#!/usr/bin/env python3
"""Run lightweight structural checks against the generated static site."""

import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(
    path
    for path in ROOT.rglob("*.html")
    if "scripts/raw" not in path.as_posix()
    and path.relative_to(ROOT).as_posix()
    not in {"bento/index.html", "brand-ai-consultancy-nl.html", "designsystem.html"}
)


def local_target(page, value):
    parsed = urlsplit(value.strip())
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    target = (
        ROOT / unquote(parsed.path).lstrip("/")
        if parsed.path.startswith("/")
        else page.parent / unquote(parsed.path)
    ).resolve()
    if parsed.path.endswith("/"):
        target /= "index.html"
    return target


errors = []
for page in HTML_FILES:
    relative = page.relative_to(ROOT)
    try:
        document = html.fromstring(page.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{relative}: HTML parse failed: {exc}")
        continue

    if len(document.xpath("//title[normalize-space()]")) != 1:
        errors.append(f"{relative}: expected one non-empty title")
    if len(document.xpath("//h1[normalize-space()]")) != 1:
        errors.append(f"{relative}: expected one non-empty h1")
    if document.get("lang") not in {"en", "nl"}:
        errors.append(f"{relative}: missing or invalid html lang")

    ids = [value for value in document.xpath("//*[@id]/@id") if value]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"{relative}: duplicate ids: {', '.join(duplicates)}")

    for script in document.xpath('//script[@type="application/ld+json"]'):
        try:
            json.loads(script.text or "")
        except json.JSONDecodeError as exc:
            errors.append(f"{relative}: invalid JSON-LD: {exc}")

    for attribute in ("href", "src", "poster"):
        for value in document.xpath(f"//*[@{attribute}]/@{attribute}"):
            target = local_target(page, value)
            if target is not None and not target.exists():
                errors.append(f"{relative}: missing {attribute} target {value}")


if errors:
    print(f"Site check failed with {len(errors)} issue(s):")
    print("\n".join(f"- {error}" for error in errors))
    raise SystemExit(1)

print(f"Site check passed: {len(HTML_FILES)} HTML pages checked.")
