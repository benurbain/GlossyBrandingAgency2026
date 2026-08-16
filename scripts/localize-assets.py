#!/usr/bin/env python3
"""
Pull every Webflow-hosted asset into the repo and rewrite the data to match.

Until this runs, the site renders from Webflow's CDN and would break the day
that account goes away. Afterwards the only remote things left are Vimeo
embeds, which were never Webflow's to begin with.

    python3 scripts/localize-assets.py             # download + rewrite
    python3 scripts/localize-assets.py --dry-run   # just report what it would do

Paths are stored repo-relative ("assets/media/x.webp"); the renderers prefix
"../" for pages that live one directory down.
"""

import concurrent.futures as futures
import json
import pathlib
import re
import subprocess
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
MEDIA = ROOT / "assets" / "media"
DATA = [ROOT / "data" / f for f in ("cases.json", "news.json", "clients.json")]

REMOTE = re.compile(r"https://[^\"\s]+?\.(?:jpg|jpeg|png|webp|gif|svg|mp4|webm)", re.I)

# Hosts we are trying to get off. Anything else (Vimeo, YouTube) stays remote.
WEBFLOW_HOSTS = ("uploads-ssl.webflow.com", "cdn.prod.website-files.com",
                 "webflow-files-prod.global.ssl.fastly.net",
                 "s3.amazonaws.com", "assets.website-files.com")

UA = {"User-Agent": "glossy-rebuild/1.0"}


def is_webflow(url):
    return any(h in url for h in WEBFLOW_HOSTS)


def local_name(url):
    """Webflow filenames are already prefixed with a unique asset id, so the
    basename is safe to reuse. Strip the resize suffix and percent-escapes."""
    name = urllib.parse.unquote(url.rsplit("/", 1)[-1].split("?")[0])
    name = re.sub(r"-p-\d+(\.\w+)$", r"\1", name)
    return re.sub(r"[^A-Za-z0-9._-]", "-", name)


def collect():
    urls = set()
    for f in DATA:
        urls |= set(REMOTE.findall(f.read_text()))
    return sorted(u for u in urls if is_webflow(u))


def download(url):
    """Shells out to curl on purpose: some Python builds ship without a CA
    bundle, so urllib dies with CERTIFICATE_VERIFY_FAILED on every asset."""
    dest = MEDIA / local_name(url)
    if dest.exists() and dest.stat().st_size > 0:
        return url, dest, "cached", dest.stat().st_size

    proc = subprocess.run(
        ["curl", "-sSL", "--fail", "--retry", "2", "--max-time", "120",
         "-A", UA["User-Agent"], "-o", str(dest), url],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        dest.unlink(missing_ok=True)
        err = (proc.stderr or "").strip().splitlines()
        return url, None, f"curl {proc.returncode}: {err[-1][:60] if err else ''}", 0
    if not dest.exists() or dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        return url, None, "empty", 0
    return url, dest, "ok", dest.stat().st_size


def main():
    dry = "--dry-run" in sys.argv
    urls = collect()
    print(f"{len(urls)} Webflow-hosted assets referenced")
    if dry:
        for u in urls[:10]:
            print(f"  {u}  ->  assets/media/{local_name(u)}")
        print("  …")
        return

    MEDIA.mkdir(parents=True, exist_ok=True)

    mapping, failures, total = {}, [], 0
    done = 0
    with futures.ThreadPoolExecutor(max_workers=12) as pool:
        for url, dest, status, size in pool.map(download, urls):
            done += 1
            if dest:
                mapping[url] = f"assets/media/{dest.name}"
                total += size
            else:
                failures.append((url, status))
            if done % 100 == 0:
                print(f"  {done}/{len(urls)}  ({total / 1e6:.0f} MB)")

    print(f"\ndownloaded {len(mapping)}/{len(urls)} — {total / 1e6:.1f} MB")

    # Collisions would silently serve the wrong image, so check before rewriting.
    seen = {}
    for url, path in mapping.items():
        seen.setdefault(path, []).append(url)
    # Webflow moved CDN hostnames without changing paths, so the same asset can
    # appear under both uploads-ssl and cdn.prod. Those collapse safely; anything
    # else would silently serve the wrong image, so refuse to rewrite.
    def path_after_host(u):
        return u.split("/", 3)[3] if u.count("/") > 3 else u

    clashes = {
        p: u for p, u in seen.items()
        if len(u) > 1 and len({path_after_host(x) for x in u}) > 1
    }
    if clashes:
        print(f"! {len(clashes)} filename collisions — not rewriting")
        for p, u in list(clashes.items())[:5]:
            print(f"   {p}: {len(u)} sources")
        return

    # Rewrite longest-first so no URL is a prefix of another.
    for f in DATA:
        text = f.read_text()
        for url in sorted(mapping, key=len, reverse=True):
            text = text.replace(url, mapping[url])
        f.write_text(text)

    left = set()
    for f in DATA:
        left |= {u for u in REMOTE.findall(f.read_text()) if is_webflow(u)}
    print(f"rewrote {len(DATA)} data files; {len(left)} Webflow URLs remaining")

    if failures:
        print(f"\n{len(failures)} failed:")
        for url, status in failures[:15]:
            print(f"   {status}  {url}")


if __name__ == "__main__":
    main()
