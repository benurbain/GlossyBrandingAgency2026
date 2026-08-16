#!/usr/bin/env python3
"""
Recover Case Sections that the Webflow MCP cannot reach.

`list_collection_items` ignores limit/offset and always returns the first 100
records, but Case Sections has 177 — so the older cases came back empty. The
published site renders every section, so we read them back from there.

    python3 scripts/scrape-sections.py            # fetch + merge into data/cases.json
    python3 scripts/scrape-sections.py --cached   # reuse pages already downloaded

Then regenerate:  python3 scripts/build-cases.py
"""

import json
import pathlib
import re
import sys
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / "raw" / "live-cases"
BASE = "https://www.glossybranding.com/cases/"

# Webflow hides unused CMS slots rather than omitting them.
HIDDEN = "w-condition-invisible"
EMPTY = "w-dyn-bind-empty"

# Void elements never get an end tag, so they must not go on the depth stack.
VOID = {"img", "br", "hr", "input", "meta", "link", "source", "area", "base",
        "col", "embed", "param", "track", "wbr"}


def has(classes, name):
    return name in classes.split()


class CaseParser(HTMLParser):
    """Walks one published case page and pulls out its section blocks.

    Layout: <work-wrapper> … <w-dyn-item> <_16-9_ratio>
              <div-block-13> <tb10>title</tb10> <rich-case>description</rich-case>
              <div class="visual"> <visual-wrapper> img | video
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []            # (tag, classes)
        self.sections = []
        self.cur = None            # section being built
        self.in_work = False
        self.depth_work = None
        self.title_depth = None
        self.rich_depth = None
        self.visual_depth = None
        self.item_depth = None
        self.skip_depth = None     # inside a hidden block

    # -- helpers -----------------------------------------------------------
    def _classes(self, attrs):
        return dict(attrs).get("class", "") or ""

    def _flush(self):
        if self.cur and (self.cur["media"] or self.cur["title"] or self.cur["description"].strip()):
            self.cur["title"] = re.sub(r"\s+", " ", self.cur["title"]).strip()
            self.cur["description"] = self.cur["description"].strip()
            self.sections.append(self.cur)
        self.cur = None

    # -- parsing -----------------------------------------------------------
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_starttag(self, tag, attrs):
        cls = self._classes(attrs)

        if tag in VOID:
            # No depth change; just harvest media if we are inside a visual.
            if self.skip_depth is None and self.cur is not None \
                    and self.visual_depth is not None and tag in ("img", "source"):
                src = (dict(attrs).get("src") or "").strip()
                if src:
                    kind = "image" if tag == "img" else "video"
                    item = {"type": kind, "src": full_res(src)}
                    if kind == "video":
                        item["poster"] = None
                    self.cur["media"].append(item)
                    self.visual_depth = None
            if self.skip_depth is None and self.rich_depth is not None:
                self.cur["description"] += f"<{tag}>"
            return

        d = len(self.stack)
        self.stack.append((tag, cls))

        if self.skip_depth is not None:
            return

        if not self.in_work and has(cls, "work-wrapper"):
            self.in_work, self.depth_work = True, d
            return

        if not self.in_work:
            return

        # A hidden section (or hidden slot) — ignore everything inside it.
        if has(cls, HIDDEN):
            self.skip_depth = d
            return

        if has(cls, "w-dyn-item"):
            self._flush()
            self.cur = {"title": "", "description": "", "layout": "full", "media": []}
            self.item_depth = d
            return

        if self.cur is None:
            return

        if has(cls, "tb10") and not has(cls, EMPTY):
            self.title_depth = d
        elif has(cls, "rich-case") and not has(cls, EMPTY):
            self.rich_depth = d
        elif has(cls, "visual"):
            self.visual_depth = d
        elif self.visual_depth is not None:
            # Media lives inside the visual block.
            a = dict(attrs)
            if tag == "img":
                src = (a.get("src") or "").strip()
                if src:
                    self.cur["media"].append({"type": "image", "src": full_res(src)})
                    self.visual_depth = None
            elif tag == "source":
                src = (a.get("src") or "").strip()
                if src:
                    self.cur["media"].append({"type": "video", "src": src, "poster": None})
                    self.visual_depth = None

        if self.rich_depth is not None and d > self.rich_depth:
            self.cur["description"] += f"<{tag}>"

    def handle_endtag(self, tag):
        if not self.stack:
            return
        d = len(self.stack) - 1
        self.stack.pop()

        if self.skip_depth is not None:
            if d <= self.skip_depth:
                self.skip_depth = None
            return

        if self.rich_depth is not None:
            if d > self.rich_depth:
                self.cur["description"] += f"</{tag}>"
            elif d == self.rich_depth:
                self.rich_depth = None
        if self.title_depth is not None and d == self.title_depth:
            self.title_depth = None
        if self.visual_depth is not None and d <= self.visual_depth:
            self.visual_depth = None
        if self.item_depth is not None and d == self.item_depth:
            self._flush()
            self.item_depth = None
        if self.depth_work is not None and d == self.depth_work:
            self._flush()
            self.in_work = False

    def handle_data(self, data):
        if self.skip_depth is not None or self.cur is None:
            return
        if self.title_depth is not None:
            self.cur["title"] += data
        elif self.rich_depth is not None:
            self.cur["description"] += data


def full_res(src):
    """Webflow serves resized variants (-p-500.webp); prefer the original."""
    return re.sub(r"-p-\d+(\.\w+)$", r"\1", src)


def infer_layout(n):
    """The published markup does not expose the CMS Visual Type, so read the
    rhythm from how many visuals the section carries."""
    return "full" if n <= 1 else ("half" if n == 2 else "third")


def fetch(slug, cached):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{slug}.html"
    if cached and path.exists():
        return path.read_text(errors="replace")
    req = urllib.request.Request(BASE + slug, headers={"User-Agent": "glossy-rebuild/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode("utf-8", "replace")
    path.write_text(body)
    return body


def main():
    cached = "--cached" in sys.argv
    data = ROOT / "data" / "cases.json"
    cases = json.loads(data.read_text())

    targets = [c for c in cases if not c.get("sections")]
    print(f"{len(targets)} cases without sections\n")

    filled = media_total = 0
    for c in targets:
        try:
            html_doc = fetch(c["slug"], cached)
        except Exception as err:
            print(f"  ! {c['slug']}: fetch failed ({err})")
            continue

        p = CaseParser()
        p.feed(html_doc)
        secs = [s for s in p.sections if s["media"] or s["title"]]
        for s in secs:
            s["layout"] = infer_layout(len(s["media"]))

        if secs:
            c["sections"] = secs
            filled += 1
            media_total += sum(len(s["media"]) for s in secs)
            print(f"  {c['slug']:<34} {len(secs):>2} sections, "
                  f"{sum(len(s['media']) for s in secs):>2} media")
        else:
            print(f"  {c['slug']:<34}  no sections found")

    data.write_text(json.dumps(cases, indent=2, ensure_ascii=False))
    still = sum(1 for c in cases if not c.get("sections"))
    print(f"\nfilled {filled}/{len(targets)} cases, {media_total} media recovered")
    print(f"cases still without sections: {still}")


if __name__ == "__main__":
    main()
