#!/usr/bin/env python3
"""Dependency-free static and policy-link integrity checks for Thorns2Roses.

Checks source integrity, not policy/legal accuracy, browser usability, or WCAG conformance.
"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.images = []
        self.refs = []
        self.mains = 0
        self.h1 = 0
        self.lang = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "main":
            self.mains += 1
        if tag == "h1":
            self.h1 += 1
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "img":
            self.images.append(a)
        for key in ("href", "src"):
            if a.get(key):
                self.refs.append(a[key])

def main():
    files = sorted(ROOT.glob("*.html"))
    problems = []
    pages = {}
    if not files:
        problems.append("No root HTML documents found")
    for file in files:
        parser = Page()
        parser.feed(file.read_text(encoding="utf-8"))
        pages[file.resolve()] = parser
        if parser.lang != "en":
            problems.append(f"{file.name}: missing lang=en")
        if parser.mains != 1:
            problems.append(f"{file.name}: expected exactly one main; found {parser.mains}")
        if parser.h1 != 1:
            problems.append(f"{file.name}: expected exactly one h1; found {parser.h1}")
        for key, count in Counter(parser.ids).items():
            if count > 1:
                problems.append(f"{file.name}: duplicate id {key}")
        for img in parser.images:
            if "alt" not in img:
                problems.append(f"{file.name}: image missing alt attribute: {img.get('src')}")

    for file, page in pages.items():
        for url in page.refs:
            parts = urlsplit(url)
            if parts.scheme or parts.netloc or url.startswith("//"):
                continue
            target = (file.parent / unquote(parts.path)).resolve() if parts.path else file
            if not target.is_relative_to(ROOT.resolve()):
                problems.append(f"{file.name}: unsafe local path: {url}")
                continue
            if parts.path and not target.is_file():
                problems.append(f"{file.name}: missing local asset/page: {url}")
                continue
            if parts.fragment and target in pages and parts.fragment not in pages[target].ids:
                problems.append(f"{file.name}: missing fragment: {url}")

    # Legal/policy pages must not advertise missing downloads.
    for name in ("privacy.html", "terms.html"):
        content = (ROOT / name).read_text(encoding="utf-8")
        if 'onclick="window.print()"' not in content or "Save / Download as PDF" not in content:
            problems.append(f"{name}: printable policy action missing")
        if "assets/docs/thorns2roses-" in content:
            problems.append(f"{name}: obsolete PDF link remains")

    style = (ROOT / "assets/css/styles.css").read_text(encoding="utf-8")
    if "@media print" not in style:
        problems.append("Missing print stylesheet for PDF-saving action")

    primary = "https://thorns2roses.com/"
    urls = []
    for page_file in files:
        url = primary + ("" if page_file.name == "index.html" else page_file.name)
        urls.append(url)
        if f'<link rel="canonical" href="{url}">' not in page_file.read_text(encoding="utf-8"):
            problems.append(f"{page_file.name}: missing matching canonical")
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "Sitemap: https://thorns2roses.com/sitemap.xml" not in robots:
        problems.append("robots.txt does not point to custom-domain sitemap")
    try:
        root = ElementTree.parse(ROOT / "sitemap.xml").getroot()
        tag = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        sitemap_urls = [node.text for node in root.findall(f"{tag}url/{tag}loc")]
        if len(sitemap_urls) != len(urls) or set(sitemap_urls) != set(urls):
            problems.append("Sitemap XML URLs do not match published coaching HTML pages")
    except (OSError, ElementTree.ParseError) as exc:
        problems.append(f"Cannot parse XML sitemap: {exc}")

    if problems:
        print("Static site validation FAILED")
        for error in problems:
            print(" -", error)
        raise SystemExit(1)
    print(f"Static site validation PASSED: {len(pages)} pages; local assets, anchors, headings, image alt, printable policies")
if __name__ == "__main__":
    main()
