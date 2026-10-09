"""Make the standard (Russian-style) Cyrillic letterforms the default in a Sofia Sans subset.

The file is a Latin and Cyrillic subset from Google Fonts (variable, weights 1–1000). Sofia Sans draws
Bulgarian forms by default and switches to the standard ones through the `locl` feature for RUS.
This applies those single substitutions to the cmap, so the standard forms show whatever the page language is.
"""
import io
import urllib.parse
import urllib.request

from fontTools.ttLib import TTFont

# Run from the repository root: python3 scripts/fonts/sofia-sans-standard.py (needs `pip install fonttools brotli`).
OUT = "src/app/fonts/sofia-sans-standard.woff2"
# Latin, Latin-1, the Cyrillic block and the punctuation the site uses; Google Fonts returns one variable file for it.
CHARS = [chr(c) for c in range(0x20, 0x7F)] + [chr(c) for c in range(0xA0, 0x100)] + [chr(c) for c in range(0x400, 0x460)]
CHARS += ["\u0490", "\u0491"] + list("–—‘’‚“”„…•€№←→↑↓↗↘·×÷≈≤≥−′″‹›«»‰†‡™℃°±")
TEXT = "".join(dict.fromkeys(CHARS))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read()

css = fetch("https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@1..1000&text=" + urllib.parse.quote(TEXT)).decode()
url = css.split("url(", 1)[1].split(")", 1)[0]
font = TTFont(io.BytesIO(fetch(url)))
gsub = font["GSUB"].table
features = gsub.FeatureList.FeatureRecord

def langsys(script_tag, lang_tag):
    for sr in gsub.ScriptList.ScriptRecord:
        if sr.ScriptTag == script_tag:
            for lr in sr.Script.LangSysRecord:
                if lr.LangSysTag == lang_tag:
                    return lr.LangSys
    raise SystemExit(f"no {script_tag}/{lang_tag} language system")

rus = langsys("cyrl", "RUS ")
lookups = [i for fi in rus.FeatureIndex if features[fi].FeatureTag == "locl" for i in features[fi].Feature.LookupListIndex]
mapping = {}
for li in lookups:
    lookup = gsub.LookupList.Lookup[li]
    for sub in lookup.SubTable:
        if lookup.LookupType == 7:  # extension
            sub = sub.ExtSubTable
        if hasattr(sub, "mapping"):
            mapping.update(sub.mapping)
        else:
            raise SystemExit(f"unexpected lookup type {lookup.LookupType}")

changed = []
for table in font["cmap"].tables:
    if not table.isUnicode():
        continue
    for cp, glyph in list(table.cmap.items()):
        if glyph in mapping and 0x400 <= cp <= 0x4FF:
            table.cmap[cp] = mapping[glyph]
            changed.append(chr(cp))
font.flavor = "woff2"
font.save(OUT)
print("remapped:", "".join(sorted(set(changed))))
