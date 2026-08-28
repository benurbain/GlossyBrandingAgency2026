#!/usr/bin/env python3
"""
Merge translated copy into data/cases-nl.json and data/news-nl.json.

Free text comes from translator override files (arrays of {slug, ...fields});
fixed vocabulary (tags, services, industries, month names) is mapped here so
every case uses identical terms.

    python3 scripts/merge-nl.py cases out.json chunk1.json chunk2.json ...
    python3 scripts/merge-nl.py news  out.json chunk1.json ...
"""

import copy
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

MONTHS = {
    "January": "januari", "February": "februari", "March": "maart",
    "April": "april", "May": "mei", "June": "juni", "July": "juli",
    "August": "augustus", "September": "september", "October": "oktober",
    "November": "november", "December": "december",
}

GLOSSARY = {
    "3D visualizations": "3D-visualisaties",
    "Advertising": "Advertising",
    "Art direction": "Artdirection",
    "Brand analysis": "Merkanalyse",
    "Brand curation": "Merkcuratie",
    "Brand definition": "Merkdefinitie",
    "Brand ideation": "Brand ideation",
    "Brand opportunities": "Merkopportuniteiten",
    "Brand story": "Merkverhaal",
    "Brand templates": "Merktemplates",
    "Campaigns": "Campagnes",
    "Co-create": "Co-creatie",
    "Concept validation": "Conceptvalidatie",
    "Content creation": "Contentcreatie",
    "Copywriting": "Copywriting",
    "Cultural context": "Culturele context",
    "Design systems": "Design systems",
    "Digital marketing": "Digitale marketing",
    "Editorial design": "Editorial design",
    "Film & Photography": "Film & fotografie",
    "Go-to-market": "Go-to-market",
    "Identity expertise": "Identiteitsexpertise",
    "Industry trends": "Sectortrends",
    "Motion design": "Motion design",
    "Naming": "Naming",
    "Packaging design": "Verpakkingsdesign",
    "Personality": "Persoonlijkheid",
    "Positioning": "Positionering",
    "Proposition": "Propositie",
    "Purpose": "Purpose",
    "Research and Insights": "Research en inzichten",
    "Social media": "Social media",
    "Spatial design": "Ruimtelijk design",
    "Trademark": "Merkregistratie",
    "UX/UI design": "UX/UI-design",
    "Visual identity": "Visuele identiteit",
    "Visual language": "Beeldtaal",
    "Websites": "Websites",
}

INDUSTRY = {
    "Architecture": "Architectuur",
    "Artificial Intelligence": "Artificiële intelligentie",
    "Catering & Hospitality": "Catering & horeca",
    "Data Strategy Consulting": "Datastrategie-consulting",
    "Deep Tech & AI Venture Studio": "Deep Tech & AI venture studio",
    "Entertainment Hospitality": "Entertainment & horeca",
    "FMCG Market": "FMCG",
    "Fashion": "Mode",
    "Fashion & Tailoring": "Mode & maatwerk",
    "Festivals & Events": "Festivals & events",
    "Fintech": "Fintech",
    "Fitness": "Fitness",
    "Fitness Industry": "Fitnesssector",
    "Food & Beverage": "Food & beverage",
    "Gaming, Event & Marketing": "Gaming, events & marketing",
    "Growth Platform": "Groeiplatform",
    "Hospitality & Bars": "Horeca & bars",
    "Hospitality & Events": "Horeca & events",
    "Hospitality & Food": "Horeca & food",
    "Hospitality & Foods": "Horeca & food",
    "Hospitality & Restaurants": "Horeca & restaurants",
    "Interior Design": "Interieurdesign",
    "Lighting": "Verlichting",
    "Liquors & Spirits": "Sterke dranken",
    "Nightlife": "Nachtleven",
    "Payroll Services": "Payrollservices",
    "Personalised Petfood": "Gepersonaliseerde dierenvoeding",
    "Piano Industry": "Pianosector",
    "Production Company": "Productiehuis",
    "Professional Cycling": "Profwielrennen",
    "Professional Soccer Team": "Profvoetbal",
    "Public Relations": "Public relations",
    "Public speaking & Events": "Public speaking & events",
    "Retail Park": "Retailpark",
    "Shared Mobility & Mobility-as-a-Service": "Gedeelde mobiliteit & Mobility-as-a-Service",
    "Software Platform": "Softwareplatform",
    "Technology & Innovation": "Technologie & innovatie",
}

CASE_TEXT = ["baseline", "intro", "seo", "testimonial", "testimonialTitle"]
NEWS_TEXT = ["name", "subtitle", "excerpt", "body", "seo", "linkText"]


def nl_date(s):
    for en, nl in MONTHS.items():
        if s and s.startswith(en):
            return s.replace(en, nl, 1)
    return s


def tag_names(html_text):
    return sorted(re.findall(r"</?([a-zA-Z][a-zA-Z0-9]*)", html_text or ""))


def merge(kind, out_path, chunk_paths):
    src = json.loads((ROOT / "data" / f"{kind}.json").read_text())
    overrides = {}
    for p in chunk_paths:
        for o in json.loads(pathlib.Path(p).read_text()):
            overrides[o["slug"]] = o

    problems, result = [], []
    text_fields = CASE_TEXT if kind == "cases" else NEWS_TEXT

    for item in src:
        slug = item.get("slug")
        rec = copy.deepcopy(item)
        o = overrides.get(slug)
        if not o:
            problems.append(f"MISSING override: {slug}")
            result.append(rec)
            continue

        for f in text_fields:
            if (item.get(f) or "").strip():
                if not (o.get(f) or "").strip():
                    problems.append(f"{slug}: veld '{f}' niet vertaald")
                else:
                    if tag_names(item[f]) != tag_names(o[f]):
                        problems.append(f"{slug}: tag-structuur wijkt af in '{f}'")
                    rec[f] = o[f]

        if kind == "cases":
            secs = item.get("sections") or []
            osecs = o.get("sections") or []
            if len(secs) != len(osecs):
                problems.append(f"{slug}: sections {len(osecs)} != bron {len(secs)}")
            else:
                for i, (s, os_) in enumerate(zip(rec.get("sections") or [], osecs)):
                    for f in ("title", "description"):
                        if (secs[i].get(f) or "").strip():
                            if not (os_.get(f) or "").strip():
                                problems.append(f"{slug}: sections[{i}].{f} niet vertaald")
                            else:
                                if f == "description" and tag_names(secs[i][f]) != tag_names(os_[f]):
                                    problems.append(f"{slug}: tag-structuur wijkt af in sections[{i}]")
                                s[f] = os_[f]
            if rec.get("industry"):
                rec["industry"] = INDUSTRY.get(rec["industry"], rec["industry"])
                if item["industry"] in INDUSTRY:
                    pass
                else:
                    problems.append(f"{slug}: industry niet in woordenlijst: {item['industry']}")
            if rec.get("when"):
                rec["when"] = nl_date(rec["when"])
            if rec.get("tags"):
                rec["tags"] = [GLOSSARY.get(t, t) for t in rec["tags"]]
                for t in item["tags"]:
                    if t not in GLOSSARY:
                        problems.append(f"{slug}: tag niet in woordenlijst: {t}")
            if rec.get("services"):
                rec["services"] = {
                    k: [GLOSSARY.get(v, v) for v in vs]
                    for k, vs in rec["services"].items()
                }
        else:
            if rec.get("monthYear"):
                rec["monthYear"] = nl_date(rec["monthYear"])

        result.append(rec)

    blob = json.dumps(result, ensure_ascii=False, indent=2)
    if "—" in blob:
        for line in blob.splitlines():
            if "—" in line:
                problems.append(f"EM DASH: {line.strip()[:90]}")

    pathlib.Path(out_path).write_text(blob + "\n")
    print(f"{kind}: {len(result)} records -> {out_path}")
    if problems:
        print(f"{len(problems)} aandachtspunten:")
        for p in problems:
            print("  -", p)
    else:
        print("geen aandachtspunten")


if __name__ == "__main__":
    kind, out_path, *chunks = sys.argv[1:]
    merge(kind, out_path, chunks)
