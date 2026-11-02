#!/usr/bin/env python3
"""Build the main site.

Each file in src/pages/ starts with a header comment:

    <!--
    title: About Gaurang Misra
    description: One sentence for Google and link previews.
    path: /gaurang-misra/
    nav: about
    -->

The rest of the file is the page body. This script wraps every body in
src/layout.html (shared head, navigation, footer, scripts) and writes it to
<path>/index.html at the repo root, which Cloudflare Pages serves as-is.

Run:  python3 tools/build.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
LAYOUT = (SRC / "layout.html").read_text(encoding="utf-8")
NAV = ["work", "seminars", "results", "about"]


def parse(text, name):
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    if not m:
        sys.exit(f"{name}: missing header comment")
    meta = {}
    for line in m.group(1).strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    for key in ("title", "description", "path"):
        if not meta.get(key):
            sys.exit(f"{name}: header needs '{key}'")
    return meta, text[m.end():]


def render(meta, body):
    html = LAYOUT
    for key in NAV:
        html = html.replace("{{active_" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    html = html.replace("{{title}}", meta["title"])
    html = html.replace("{{description}}", meta["description"])
    html = html.replace("{{path}}", meta["path"])
    html = html.replace("{{head_extra}}", meta.get("head", ""))
    html = html.replace("{{body}}", body.rstrip() + "\n")
    return html


def main():
    built = []
    for page in sorted((SRC / "pages").glob("*.html")):
        meta, body = parse(page.read_text(encoding="utf-8"), page.name)
        path = meta["path"].strip("/")
        out = ROOT / path / "index.html" if path else ROOT / "index.html"
        if meta.get("file"):
            out = ROOT / meta["file"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(meta, body), encoding="utf-8")
        built.append(str(out.relative_to(ROOT)))
    print("\n".join(built))


if __name__ == "__main__":
    main()
