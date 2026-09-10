"""Scoped SEO maintenance. Preserve markup, layout, media and preview protections.

Run on the release first, then preview. Dates are content-based, never file mtimes.
The release carries the same script and its persisted date ledger for future edits.
"""
import argparse
import hashlib
import html as H
import json
import re
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from lxml import html, etree

BASE = 'https://glossy.tv'
SCHEMA = re.compile(r'(<script\b[^>]*type="application/ld\+json"[^>]*>)([\s\S]*?)(</script>)')
CONTACT = {
 'nl': 'Bespreek je merk- of AI-vraag rechtstreeks met Ben Urbain. Glossy helpt vanuit Gent met merkstrategie, identiteit, AI-workflows en training.',
 'en': 'Discuss your brand or AI challenge directly with Ben Urbain. Based in Ghent, Glossy helps with brand strategy, identity, AI workflows and training.'
}
TRANSLATIONS = {'Positioning':'Positionering','Naming':'Naamontwikkeling','Brand definition':'Merkdefinitie','Visual identity':'Visuele identiteit','Design systems':'Design systems','Art direction':'Artdirection','Websites':'Webdesign','Packaging design':'Verpakkingsdesign','Spatial design':'Ruimtelijk ontwerp','Campaigns':'Campagnes','Film & Photography':'Film & fotografie','Social media':'Social media','Content creation':'Contentcreatie'}

def file_for(root, path):
    p = root / path.lstrip('/')
    if path.endswith('/'): return p / 'index.html'
    return p if p.suffix else p.with_suffix('.html')

def text_of(node):
    return ' '.join(node.text_content().split())

def fingerprint(source, article=False):
    d = html.fromstring(source)
    nodes = d.xpath('//main/article[1]' if article else '//main')
    if not nodes: return ''
    node = nodes[0]
    # Related projects and CTAs are not changes to the article's authored content.
    for el in node.xpath('.//script|.//style|.//*[@id="more-projects"]|.//*[contains(concat(" ",normalize-space(@class)," ")," contact ")]'):
        el.getparent().remove(el)
    parts = [text_of(node)]
    if not article:
        parts += d.xpath('//title/text()|//meta[@name="description"]/@content')
    parts += node.xpath('.//img/@src|.//video/@src|.//video/source/@src')
    return hashlib.sha256('\n'.join(parts).encode()).hexdigest()

def history_date(root, rel, source, article=False):
    """Latest committed change to relevant content, ignoring nav/CSS/link changes."""
    wanted = fingerprint(source, article)
    if not wanted: return None
    r = subprocess.run(['git','log','--format=%H %cs','--',rel], cwd=root, capture_output=True, text=True)
    found = None
    for line in r.stdout.splitlines():
        sha, day = line.split()
        old = subprocess.run(['git','show',f'{sha}:{rel}'],cwd=root,capture_output=True,text=True)
        if old.returncode: continue
        try: same = fingerprint(old.stdout,article) == wanted
        except Exception: same = False
        if not same: break
        found = day
    return found

def set_meta(source, key, value):
    pattern = r'<meta\b[^>]*(?:name|property)="'+re.escape(key)+r'"[^>]*>'
    if not re.search(pattern,source): return source
    return re.sub(pattern,lambda m: re.sub(r'content="[^"]*"','content="'+H.escape(value,quote=True)+'"',m[0]),source)

def apply(root, preview=False, today=None):
    today = today or date.today().isoformat()
    robots=(root/'robots.txt').read_text()
    assert ('Disallow: /\n' in robots) == preview, 'Preview/release mode does not match robots protection'
    ledger_path = root/'scripts/seo-dates.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
    tree = etree.parse(str(root/'sitemap.xml'))
    urls = tree.xpath('//*[local-name()="loc"]/text()')
    urls = [u for u in urls if u != BASE+'/bento/']
    routes = {u: file_for(root,urlsplit(u).path) for u in urls}
    assert all(p.exists() for p in routes.values())
    aliases = {}
    for u,p in routes.items():
        aliases[urlsplit(u).path] = urlsplit(u).path
        aliases['/'+p.relative_to(root).as_posix()] = urlsplit(u).path
    cases = {c['slug']:c for c in json.loads((root/'data/cases.json').read_text())}
    groups = [['Positioning','Naming','Brand definition'],['Visual identity','Design systems','Art direction'],['Packaging design','Spatial design','Websites','Campaigns','Film & Photography','Social media','Content creation']]
    changed = []; unknown = []
    for u,p in routes.items():
        rel = p.relative_to(root).as_posix(); source = p.read_text(); new = source
        d = html.fromstring(source); lang = 'nl' if rel.startswith('nl/') else 'en'
        assert d.xpath('//link[@rel="canonical"]/@href') == [u], rel
        old = ledger.get(rel,{})
        base_fp = fingerprint(source)
        historical = old.get('lastmod') or history_date(root,rel,source)
        is_news = '/news/' in u
        article_fp = fingerprint(source,True) if is_news else None
        article_date = old.get('article_modified')
        if is_news:
            if old.get('article_fingerprint') != article_fp:
                article_date = history_date(root,rel,source,True)
                if old.get('article_fingerprint') and not article_date: article_date = today
        description = d.xpath('//meta[@name="description"]/@content')[0]
        title = d.xpath('//title/text()')[0]
        if rel in ('contact.html','nl/contact.html'): description = CONTACT[lang]
        if '/cases/' in u:
            slug = p.stem; case = cases[slug]
            terms = [next((t for t in g if t in case['tags']),None) for g in groups]
            terms = [t for t in terms if t][:2]
            terms = [TRANSLATIONS[t] if lang=='nl' else t for t in terms]
            subject = ' en '.join(t.lower() for t in terms) if lang=='nl' else ' & '.join(terms)
            if slug == 'battmobility':
                subject = 'merkstrategie en AI-marketingtools' if lang=='nl' else 'Brand Strategy & AI Marketing Tools'
                description = ('Merkstrategie, identiteit, AI-beeldtaal en marketingtools voor BattMobility. Ontdek hoe Glossy een samenhangend merk en werkbaar systeem bouwde.' if lang=='nl' else 'Brand strategy, identity, AI imagery and marketing tools for BattMobility. See how Glossy built a coherent brand and a practical system for its team.')
            title = f'{case["name"]}: {subject} | Glossy'
        new = re.sub(r'<title>[\s\S]*?</title>',lambda m:'<title>'+H.escape(title)+'</title>',new,count=1)
        for k in ['description','og:description','twitter:description']: new = set_meta(new,k,description)
        for k in ['og:title','twitter:title']: new = set_meta(new,k,title)
        def schema_edit(m):
            obj=json.loads(m[2])
            def walk(o):
                if isinstance(o,list):
                    for v in o: walk(v)
                if not isinstance(o,dict): return
                typ=o.get('@type')
                if o.get('url') == u and typ in ['WebPage','ContactPage','AboutPage','CollectionPage','Service','NewsArticle','CreativeWork']:
                    o['description']=description
                    o['@id']=u+'#'+{'Service':'service','NewsArticle':'article','CreativeWork':'project'}.get(typ,'webpage')
                    if typ in ['WebPage','AboutPage','ContactPage','CollectionPage']: o['name']=title.split(' | ')[0]
                if typ=='Organization' and o.get('url')==BASE+'/': o['@id']=BASE+'/#organization'
                if typ=='Person' and o.get('name')=='Ben Urbain': o['@id']=BASE+'/#ben-urbain'
                if typ=='WebSite':
                    o['@id']=BASE+'/#website';o['inLanguage']=['en','nl']
                if typ=='Service' and 'availableLanguage' in o:
                    o['availableChannel']={'@type':'ServiceChannel','serviceUrl':u,'availableLanguage':o.pop('availableLanguage')}
                for key in ['datePublished','dateCreated','dateModified']:
                    if key in o and not re.match(r'^\d{4}-\d{2}-\d{2}(?:T.*)?$',o[key]):
                        unknown.append({'page':rel,'field':key,'known':o.pop(key)})
                if typ=='NewsArticle' and article_date:
                    published=o.get('datePublished','')[:10]
                    if not published or article_date >= published: o['dateModified']=article_date
                for v in list(o.values()): walk(v)
            walk(obj)
            return m[1]+json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+m[3]
        new=SCHEMA.sub(schema_edit,new)
        if '/cases/' in u or is_news:
            parent='/nl/' if lang=='nl' else '/'
            section='news' if is_news else 'cases'
            name=text_of(d.xpath('//h1')[0])
            crumbs={'@context':'https://schema.org','@type':'BreadcrumbList','@id':u+'#breadcrumb','itemListElement':[
                {'@type':'ListItem','position':1,'name':'Home','item':BASE+parent},
                {'@type':'ListItem','position':2,'name':('Nieuws' if lang=='nl' else 'News') if is_news else 'Cases','item':BASE+parent+section},
                {'@type':'ListItem','position':3,'name':name,'item':u}]}
            tag='<script type="application/ld+json" id="seo-breadcrumb">'+json.dumps(crumbs,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>'
            new=re.sub(r'\n?<script[^>]*id="seo-breadcrumb"[^>]*>[\s\S]*?</script>','',new)
            new=new.replace('</head>',tag+'\n</head>')
        final_fp=fingerprint(new)
        lastmod=(today if final_fp != old.get('fingerprint',base_fp) else historical) or today
        ledger[rel]={'fingerprint':final_fp,'lastmod':lastmod}
        if is_news: ledger[rel].update(article_fingerprint=article_fp,article_modified=article_date)
        if new!=source: p.write_text(new);changed.append(rel)
    # Rewrite authored anchors, not assets, forms or JavaScript. Root-relative links
    # work for clean URLs and .html aliases and retain query strings and fragments.
    for p in root.rglob('*.html'):
        rel=p.relative_to(root).as_posix()
        if rel.startswith(('scripts/','experiments/','.git/','assets/')): continue
        s=p.read_text()
        def link(m):
            target=H.unescape(m[2])
            if target.startswith(('#','mailto:','tel:','javascript:')): return m[0]
            resolved=urlsplit(urljoin(BASE+'/'+rel,target))
            if resolved.netloc not in ('glossy.tv','www.glossy.tv'):return m[0]
            if resolved.path not in aliases:return m[0]
            result=aliases[resolved.path]+('?' + resolved.query if resolved.query else '')+('#'+resolved.fragment if resolved.fragment else '')
            return m[1]+H.escape(result,quote=True)+m[3]
        # The file-based local review server does not resolve extensionless URLs.
        new=s if preview else re.sub(r'(<a\b[^>]*\bhref=")([^"]*)(")',link,s)
        if rel=='bento/index.html':
            if 'name="robots"' not in new:new=new.replace('</head>','<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="https://glossy.tv/bento/">\n</head>')
        if new!=s:p.write_text(new);changed.append(rel)
    # Preserve local noindex/robots protections; sitemap is a release input only.
    for node in list(tree.getroot()):
        loc=node.find('{*}loc').text
        if loc not in routes:tree.getroot().remove(node);continue
        rel=routes[loc].relative_to(root).as_posix()
        node.find('{*}lastmod').text=ledger[rel]['lastmod']
    (root/'sitemap.xml').write_bytes(etree.tostring(tree,xml_declaration=True,encoding='UTF-8',pretty_print=True))
    ledger_path.parent.mkdir(exist_ok=True)
    ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    # Keep unresolved historical dates explicit; do not manufacture day precision.
    unknown_path=root/'scripts/seo-date-uncertainties.json'
    previous=json.loads(unknown_path.read_text()) if unknown_path.exists() else []
    unique={json.dumps(x,sort_keys=True):x for x in previous+unknown}
    unknown_path.write_text(json.dumps(list(unique.values()),ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'site':str(root),'changed_pages':len(set(changed)),'sitemap_urls':len(routes),'uncertain_dates':len(unique)}))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('site',type=Path);ap.add_argument('--preview',action='store_true');ap.add_argument('--date')
    args=ap.parse_args();apply(args.site.resolve(),args.preview,args.date)
