"""Validate and stage only runtime website files for GitHub Pages (stdlib only).

Source exports and maintenance scripts stay in Git, never in the Pages artifact.
Usage: python3 scripts/package-public.py [--output /empty/staging/directory]
"""
import argparse
import json
import re
import shutil
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parent.parent
DIRECTORIES=('assets','data','cases','news','nl','bento')
FILES=('CNAME','robots.txt','sitemap.xml','.nojekyll')

class Head(HTMLParser):
    def __init__(self, source):
        super().__init__();self.canonical=[];self.alternates={};self.robots=[];self.description=[];self.title=[];self.h1=0;self.anchors=[];self.current=None;self.json=[];self.feed(source)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
        if tag=='link' and a.get('hreflang'):self.alternates[a['hreflang']]=a['href']
        if tag=='meta' and a.get('name')=='robots':self.robots.append(a.get('content',''))
        if tag=='meta' and a.get('name')=='description':self.description.append(a.get('content',''))
        if tag=='h1':self.h1+=1
        if tag=='a' and a.get('href'):self.anchors.append(a['href'])
        if tag=='title':self.current='title'
        if tag=='script' and a.get('type')=='application/ld+json':self.current='json'
    def handle_endtag(self,tag):
        if tag in ('title','script'):self.current=None
    def handle_data(self,data):
        if self.current:getattr(self,self.current).append(data)

def target(path):
    p=ROOT/path.lstrip('/')
    return p/'index.html' if path.endswith('/') else p if p.suffix else p.with_suffix('.html')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path);args=ap.parse_args()
    assert (ROOT/'CNAME').read_text().strip()=='glossy.tv'
    assert 'Disallow: /\n' not in (ROOT/'robots.txt').read_text()
    urls=ET.parse(ROOT/'sitemap.xml').getroot()
    docs={};lastmods={};aliases={}
    for entry in urls:
        u=entry.find('{*}loc').text;mod=entry.find('{*}lastmod').text
        assert date.fromisoformat(mod)<=date.today(),(u,'future modification date')
        parsed=urlsplit(u);assert parsed.netloc=='glossy.tv'
        assert not parsed.path.startswith(('/scripts/','/bento/','/experiments/'))
        p=target(parsed.path);assert p.is_file(),u
        d=Head(p.read_text());docs[u]=d;lastmods[u]=mod
        assert d.canonical==[u],(u,'canonical mismatch')
        assert not any('noindex' in r for r in d.robots),(u,'blocked')
        assert len(d.description)==1 and d.description[0],(u,'description')
        assert len(d.title)==1 and d.title[0],(u,'title')
        assert d.h1==1,(u,'h1')
        assert d.json,(u,'missing schema')
        for s in d.json:json.loads(s)
        aliases['/'+p.relative_to(ROOT).as_posix()]=parsed.path
        aliases[parsed.path]=parsed.path
    for u,d in docs.items():
        assert set(d.alternates)=={'en','nl','x-default'},(u,'languages')
        for language,v in d.alternates.items():
            assert v in docs and u in docs[v].alternates.values(),(u,'missing reciprocal language',v)
        for a in d.anchors:
            p=urlsplit(urljoin(u,a))
            if p.netloc in ('glossy.tv','www.glossy.tv') and p.path in aliases:
                assert p.netloc=='glossy.tv' and p.path==aliases[p.path],(u,'noncanonical internal link',a)
    assert 'noindex' in ','.join(Head((ROOT/'bento/index.html').read_text()).robots)
    selected=[p for p in ROOT.glob('*.html')]+[ROOT/f for f in FILES]
    for folder in DIRECTORIES:selected.extend(p for p in (ROOT/folder).rglob('*') if p.is_file())
    assert all(not p.is_symlink() for p in selected),'Symlinks are not publishable'
    assert all(not p.relative_to(ROOT).as_posix().startswith(('scripts/','experiments/','.git/')) for p in selected)
    if args.output:
        out=args.output.resolve();assert out!=ROOT and ROOT not in out.parents,'Stage outside source tree'
        out.mkdir(parents=True,exist_ok=True);assert not any(out.iterdir()),'Staging directory must be empty'
        for p in selected:
            dest=out/p.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
    print(json.dumps({'validated_urls':len(docs),'public_files':len(selected),'output':str(args.output) if args.output else None}))

if __name__=='__main__':main()
