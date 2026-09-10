"""Rebuild a canonical sitemap from indexable HTML; refresh content-based dates."""
from pathlib import Path
from lxml import html, etree
import json
import subprocess
import sys

ROOT=Path(__file__).resolve().parent.parent
NS='http://www.sitemaps.org/schemas/sitemap/0.9'
XHTML='http://www.w3.org/1999/xhtml'
ledger_path=ROOT/'scripts/seo-dates.json'
ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
old={n.find('{*}loc').text:n.find('{*}lastmod').text for n in etree.parse(str(ROOT/'sitemap.xml')).getroot()}
tree=etree.Element('{'+NS+'}urlset',nsmap={None:NS,'xhtml':XHTML})
pages=list(ROOT.glob('*.html'))
for folder in ['cases','news','nl']:pages.extend((ROOT/folder).rglob('*.html'))
seen=set()
for p in sorted(pages):
    d=html.fromstring(p.read_bytes())
    if d.xpath('//meta[@name="robots" and contains(@content,"noindex")]'):continue
    canonical=d.xpath('//head/link[@rel="canonical"]/@href')
    if not canonical or canonical[0] in seen:continue
    if d.xpath('//meta[translate(@http-equiv,"REFSH","refsh")="refresh"]'):continue
    url=canonical[0];assert url.startswith('https://glossy.tv/');seen.add(url)
    node=etree.SubElement(tree,'{'+NS+'}url');etree.SubElement(node,'{'+NS+'}loc').text=url
    # Maintenance resolves missing dates from Git/content, never filesystem mtimes.
    etree.SubElement(node,'{'+NS+'}lastmod').text=ledger.get(p.relative_to(ROOT).as_posix(),{}).get('lastmod') or old.get(url,'')
    for l in d.xpath('//link[@hreflang]'):
        etree.SubElement(node,'{'+XHTML+'}link',rel='alternate',hreflang=l.get('hreflang'),href=l.get('href'))
(ROOT/'sitemap.xml').write_bytes(etree.tostring(tree,xml_declaration=True,encoding='UTF-8',pretty_print=True))
subprocess.run([sys.executable,str(ROOT/'scripts/seo-maintenance.py'),str(ROOT)],check=True)
