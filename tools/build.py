#!/usr/bin/env python3
"""Build the site, check every page against its zone, and write PAGES.md.

THE THREE ZONES (see PAGES.md for what is in each)
  brand     /...       People researching Gaurang. Built from src/pages/ with
                       src/layout.html. Follows DESIGN.md. In the menu.
  ads       /go/...    Ad and funnel pages. Hand-written. Follows LANDING.md.
                       noindex, no menu, never linked from brand pages except
                       the entry points listed in tools/site.json.
  unlisted  /u/<code>-<name>/
                       Pages for Gaurang, members and clients. Open to anyone
                       with the link, invisible otherwise: noindex header,
                       random code in the address, never linked from any
                       brand or ads page, not in the sitemap.

PAGE HEADERS
  src/pages/*.html start with a comment:
      <!--
      title: About Gaurang Misra
      description: One sentence for Google and link previews.
      path: /gaurang-misra/
      nav: about          (optional: work, seminars, results, about)
      zone: brand         (optional, brand is the default; or unlisted)
      status: live        (optional, shown in PAGES.md)
      reached: Instagram bio   (optional, overrides "Where it's reached")
      theme: off          (optional, no dark-mode toggle)
      -->
  Hand-written pages under go/ carry meta tags in <head>:
      <meta name="zone" content="ads">
      <meta name="purpose" content="One line: what this page is for.">
      <meta name="status" content="live">

COMMANDS
  python3 tools/build.py              build + check + PAGES.md
  python3 tools/build.py new "name"   create an unlisted page and print its link

The build stops with a list of problems if any page breaks its zone's rules.
"""
import json
import pathlib
import re
import secrets
import string
import sys
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CONFIG_FILE = ROOT / "tools" / "site.json"
CONFIG = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
LIVE = bool(CONFIG.get("live"))
BASE = CONFIG["base"].rstrip("/")
LAYOUT = (SRC / "layout.html").read_text(encoding="utf-8")
NAV = ["work", "seminars", "results", "about"]
SKIP_DIRS = {".git", "src", "tools", "functions", "assets", "img", "node_modules"}
UNLISTED_RE = re.compile(r"^/u/[a-z0-9]{6}-[a-z0-9-]+/$")

# Dark mode. Pages with "theme: off" in their header (conversion pages such as
# /request-diagnosis/) get neither, so they always render in the light design.
THEME_HEAD = """<script>try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}</script>
"""
THEME_TOGGLE = (
    '<button class="theme" type="button" aria-pressed="false" aria-label="Dark mode">'
    '<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
    '<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/>'
    '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    '</button>\n    '
)

HEADERS_START = "# --- zones (written by tools/build.py) ---"
HEADERS_END = "# --- end zones ---"
HEADERS_BLOCK = f"""{HEADERS_START}
/go/*
  X-Robots-Tag: noindex, nofollow
/u/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Referrer-Policy: no-referrer
{HEADERS_END}"""


# ---------------------------------------------------------------- src pages

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
    meta.setdefault("zone", "brand")
    return meta, text[m.end():]


def robots(meta):
    if meta["zone"] == "brand" and LIVE and meta["path"] != "/404/":
        return (f'<meta name="robots" content="index, follow">\n'
                f'<link rel="canonical" href="{BASE}{meta["path"]}">\n'
                f'<meta property="og:url" content="{BASE}{meta["path"]}">')
    if meta["zone"] == "unlisted":
        return '<meta name="robots" content="noindex, nofollow, noarchive">\n<meta name="referrer" content="no-referrer">'
    return '<meta name="robots" content="noindex, nofollow">'


def render(meta, body):
    html = LAYOUT
    for key in NAV:
        html = html.replace("{{active_" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    html = html.replace("{{title}}", meta["title"])
    html = html.replace("{{description}}", meta["description"])
    html = html.replace("{{path}}", meta["path"])
    html = html.replace("{{robots}}", robots(meta))
    themed = meta.get("theme", "on") != "off"
    html = html.replace("{{theme_head}}", THEME_HEAD if themed else "")
    html = html.replace("{{theme_toggle}}", THEME_TOGGLE if themed else "")
    html = html.replace("{{head_extra}}", meta.get("head", ""))
    html = html.replace("{{body}}", body.rstrip() + "\n")
    return html


def out_file(meta):
    if meta.get("file"):
        return ROOT / meta["file"]
    path = meta["path"].strip("/")
    return ROOT / path / "index.html" if path else ROOT / "index.html"


def build_src():
    built = {}
    for page in sorted((SRC / "pages").glob("*.html")):
        meta, body = parse(page.read_text(encoding="utf-8"), page.name)
        out = out_file(meta)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(meta, body), encoding="utf-8")
        meta["source"] = f"src/pages/{page.name}"
        built[out.resolve()] = meta
    return built


# ---------------------------------------------------------------- scanning

def meta_tag(html, name):
    m = re.search(r'<meta\s+name="' + name + r'"\s+content="([^"]*)"', html)
    return m.group(1).strip() if m else ""


def detect_data(html):
    found = []
    for f in sorted(set(re.findall(r'data-form="([a-z-]+)"', html))):
        found.append(f"enquiry: {f}")
    for f in sorted(set(re.findall(r"""form\s*:\s*['"]([a-z-]+)['"]""", html))):
        found.append(f"enquiry: {f}" if f != "profile" else "/api/profile")
    if "checkout.razorpay.com" in html or "/api/order" in html:
        found.append("Razorpay")
    if "cal.id" in html:
        found.append("Cal.id")
    return ", ".join(dict.fromkeys(found))


def page_files():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT)
        if rel.parts[0] in SKIP_DIRS:
            continue
        if p.name == "index.html" or rel == pathlib.Path("404.html"):
            yield p


def url_of(p):
    rel = p.relative_to(ROOT)
    if rel == pathlib.Path("404.html"):
        return "/404/"
    parent = rel.parent.as_posix()
    return "/" if parent == "." else f"/{parent}/"


def scan(built):
    pages = []
    for p in page_files():
        html = p.read_text(encoding="utf-8")
        src = built.get(p.resolve())
        title = re.search(r"<title>(.*?)</title>", html, re.S)
        rec = {
            "path": url_of(p),
            "file": p.relative_to(ROOT).as_posix(),
            "title": re.sub(r"\s*\|\s*(Gaurang Misra|ISFCM LLP|ISFCM)$", "", title.group(1).strip() if title else ""),
            "html": html,
        }
        if src:
            rec.update(zone=src["zone"], purpose=src.get("purpose") or src["description"],
                       status=src.get("status", "live"), source=src["source"], nav=src.get("nav", ""),
                       reached=src.get("reached", ""))
        else:
            rec.update(zone=meta_tag(html, "zone"), purpose=meta_tag(html, "purpose"),
                       status=meta_tag(html, "status") or "live", source=rec["file"], nav="")
        rec["data"] = meta_tag(html, "form") or detect_data(html)
        rec["links"] = sorted(set(re.findall(r'href="(/[^"#?]*)', html)) |
                              set(re.findall(r"""['"](/(?:go|u)/[a-z0-9/-]*)""", html)))
        pages.append(rec)
    return pages


def redirect_sources():
    out = set()
    f = ROOT / "_redirects"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                out.add(line.split()[0])
    return out


# ---------------------------------------------------------------- rules

def check(pages):
    problems = []
    paths = {p["path"] for p in pages}
    redirects = redirect_sources()
    allowed_into_go = set(CONFIG.get("brand_may_link_to", []))

    def exists(link):
        if link in paths or link.rstrip("/") + "/" in paths:
            return True
        if (ROOT / link.lstrip("/")).is_file():
            return True
        if link.startswith("/api/") or link in redirects:
            return True
        return any(r.endswith("/*") and link.startswith(r[:-1]) for r in redirects)

    for p in pages:
        where = f'{p["path"]} ({p["source"]})'
        z, path, html = p["zone"], p["path"], p["html"]
        if z not in ("brand", "ads", "unlisted"):
            problems.append(f"{where}: no zone. Add zone to its header (src page) or a <meta name=\"zone\"> tag.")
            continue
        if z == "ads" and not path.startswith("/go/"):
            problems.append(f"{where}: ads pages must live under /go/.")
        if z == "unlisted" and not UNLISTED_RE.match(path):
            problems.append(f"{where}: unlisted pages must be /u/<6-char code>-<name>/. Use: python3 tools/build.py new \"name\"")
        if z == "brand" and (path.startswith("/go/") or path.startswith("/u/")):
            problems.append(f"{where}: brand pages cannot live under /go/ or /u/.")
        if z == "brand" and p["source"] == p["file"] and path != "/404/":
            problems.append(f"{where}: hand-written brand page. Brand pages must come from src/pages/.")
        if z in ("ads", "unlisted") and "noindex" not in html:
            problems.append(f"{where}: missing <meta name=\"robots\" content=\"noindex, nofollow\">.")
        if z == "ads" and not p["purpose"]:
            problems.append(f"{where}: missing <meta name=\"purpose\">, so PAGES.md can't say what it is.")
        for link in p["links"]:
            if link.startswith("/u/") and z != "unlisted":
                problems.append(f"{where}: links to unlisted page {link}. Brand and ads pages must never link to /u/.")
            if z == "brand" and link.startswith("/go/") and link not in allowed_into_go:
                problems.append(f"{where}: brand page links into the ads zone ({link}). Add it to brand_may_link_to in tools/site.json if intended.")
            if not exists(link):
                problems.append(f"{where}: broken link {link}")
    return problems


# ---------------------------------------------------------------- outputs

def write_headers():
    f = ROOT / "_headers"
    text = f.read_text(encoding="utf-8") if f.exists() else ""
    text = re.sub(re.escape(HEADERS_START) + r".*?" + re.escape(HEADERS_END) + r"\n?", "", text, flags=re.S).rstrip()
    f.write_text((text + "\n\n" if text else "") + HEADERS_BLOCK + "\n", encoding="utf-8")


def write_robots_and_sitemap(pages):
    robots_f, sitemap_f = ROOT / "robots.txt", ROOT / "sitemap.xml"
    if not LIVE:
        robots_f.write_text("# Not launched yet (tools/site.json: live=false). Nothing is indexed.\nUser-agent: *\nDisallow: /\n", encoding="utf-8")
        if sitemap_f.exists():
            sitemap_f.unlink()
        return
    robots_f.write_text(f"User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n", encoding="utf-8")
    urls = [p["path"] for p in pages if p["zone"] == "brand" and p["path"] != "/404/"]
    body = "\n".join(f"  <url><loc>{BASE}{u}</loc></url>" for u in sorted(urls))
    sitemap_f.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n', encoding="utf-8")


def md(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def table(rows, cols):
    head = "| " + " | ".join(c for c, _ in cols) + " |\n|" + "|".join("---" for _ in cols) + "|\n"
    return head + "".join("| " + " | ".join(md(r.get(k, "")) for _, k in cols) + " |\n" for r in rows)


def write_pages_md(pages):
    by = {z: [p for p in pages if p["zone"] == z] for z in ("brand", "ads", "unlisted")}
    nav_html, _, foot_html = LAYOUT.partition("<footer")
    in_nav = set(re.findall(r'href="(/[^"#?]*)"', nav_html))
    in_foot = set(re.findall(r'href="(/[^"#?]*)"', foot_html))
    linked = {l for q in pages if q["zone"] == "brand" for l in q["links"]}
    for p in by["brand"]:
        path = p["path"]
        p["where"] = ("Home" if path == "/" else "Menu" if path in in_nav else "Footer" if path in in_foot
                      else "System page" if path == "/404/" else "Linked from pages" if path in linked
                      else "NOT LINKED")
        if p.get("reached"):
            p["where"] = p["reached"]
    def order(q):
        m = re.search(r"step (\d+)", q.get("purpose", ""), re.I)
        return (q["path"] != "/", q["path"].split("/")[:3], int(m.group(1)) if m else 0, q["path"])
    for z in by:
        by[z].sort(key=order)
    cols_b = [("Address", "path"), ("Page", "title"), ("Where it's reached", "where"), ("Takes", "data"), ("Status", "status"), ("Edit", "source")]
    cols_a = [("Address", "path"), ("What it does", "purpose"), ("Takes", "data"), ("Status", "status"), ("Edit", "source")]
    cols_u = [("Address", "path"), ("Page", "title"), ("What it does", "purpose"), ("Status", "status"), ("Edit", "source")]

    funnels = {}
    for p in by["ads"]:
        funnels.setdefault(p["path"].split("/")[2], []).append(p)

    out = [
        "# Pages register",
        "",
        f"_Written by `python3 tools/build.py` on {date.today().isoformat()}. Do not edit by hand; change the page headers instead._",
        "",
        f"**{len(by['brand'])} brand · {len(by['ads'])} ads · {len(by['unlisted'])} unlisted** · "
        f"site {'LIVE, brand pages indexed' if LIVE else 'not launched (nothing indexed)'} · base {BASE}",
        "",
        "| Zone | Address | For | Rules |",
        "|---|---|---|---|",
        "| Brand | `/…` | People searching or researching Gaurang | DESIGN.md · in menu · indexed once live |",
        "| Ads | `/go/…` | Cold traffic from ads, and the funnel steps after | LANDING.md · noindex · no menu |",
        "| Unlisted | `/u/<code>-<name>/` | Gaurang, members, clients | Anyone with the link · noindex · never linked |",
        "",
        "## Brand",
        "",
        table(by["brand"], cols_b),
        "## Ads",
        "",
    ]
    for name in sorted(funnels):
        out += [f"### {name}", "", table(funnels[name], cols_a)]
    out += ["## Unlisted", ""]
    if by["unlisted"]:
        if CONFIG.get("unlisted_index"):
            out += [f"Index of all unlisted pages: `{CONFIG['unlisted_index']}`", ""]
        out += [table(by["unlisted"], cols_u)]
    else:
        out += ["None yet. Create one with `python3 tools/build.py new \"name\"`.", ""]
    out += ["## Old addresses (redirect to the pages above)", "", "```", (ROOT / "_redirects").read_text(encoding="utf-8").strip(), "```", ""]
    (ROOT / "PAGES.md").write_text("\n".join(out), encoding="utf-8")


def write_unlisted_index(pages):
    idx = CONFIG.get("unlisted_index")
    items = [p for p in pages if p["zone"] == "unlisted" and p["path"] != idx]
    if not idx:
        return None, None
    rows = "".join(
        f'<li><a href="{p["path"]}">{p["title"]}</a><span>{p["purpose"]}</span></li>' for p in items
    ) or "<li>No unlisted pages yet.</li>"
    meta = {"title": "Unlisted pages | Gaurang Misra", "description": "Index of unlisted pages.",
            "path": idx, "zone": "unlisted", "theme": "off"}
    body = f"""  <section class="wrap page-head">
    <h1>Unlisted pages</h1>
    <p class="lede">Open to anyone with the link. Not in search, not linked from the site.</p>
  </section>
  <section class="wrap"><ul class="u-index">{rows}</ul></section>
  <style>.u-index{{list-style:none;padding:0;display:grid;gap:18px}}.u-index li{{display:grid;gap:4px}}.u-index span{{opacity:.7;font-size:.95em}}</style>
"""
    f = ROOT / idx.strip("/") / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(render(meta, body), encoding="utf-8")
    meta.update(source="generated by tools/build.py", purpose="Index of every unlisted page. Bookmark this one.", status="live")
    return f.resolve(), meta


# ---------------------------------------------------------------- new page

def code6():
    return "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))


def new_unlisted(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        sys.exit("Give the page a name, for example: python3 tools/build.py new \"member questionnaire\"")
    if not CONFIG.get("unlisted_index"):
        CONFIG["unlisted_index"] = f"/u/{code6()}-index/"
        CONFIG_FILE.write_text(json.dumps(CONFIG, indent=2) + "\n", encoding="utf-8")
    path = f"/u/{code6()}-{slug}/"
    src = SRC / "pages" / f"u-{slug}.html"
    if src.exists():
        sys.exit(f"{src.relative_to(ROOT)} already exists.")
    src.write_text(f"""<!--
title: {name.strip().title()} | Gaurang Misra
description: {name.strip()}
purpose: {name.strip()}
path: {path}
zone: unlisted
status: draft
theme: off
-->
  <section class="wrap page-head">
    <h1>{name.strip().title()}</h1>
  </section>
""", encoding="utf-8")
    print(f"Created {src.relative_to(ROOT)}\nLink: {BASE}{path}\nIndex of unlisted pages: {BASE}{CONFIG['unlisted_index']}")


# ---------------------------------------------------------------- main

def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "new" and len(sys.argv) > 2:
            new_unlisted(" ".join(sys.argv[2:]))
        else:
            sys.exit(__doc__)
    built = build_src()
    pages = scan(built)
    f, meta = write_unlisted_index(pages)
    if f:
        built[f] = meta
        pages = scan(built)
    problems = check(pages)
    write_headers()
    write_robots_and_sitemap(pages)
    write_pages_md(pages)
    counts = {z: sum(p["zone"] == z for p in pages) for z in ("brand", "ads", "unlisted")}
    print(f"Built {len(built)} pages from src/. Register: {counts['brand']} brand, {counts['ads']} ads, {counts['unlisted']} unlisted. PAGES.md written.")
    if problems:
        print("\nZONE CHECK FAILED:\n  - " + "\n  - ".join(problems))
        sys.exit(1)
    print("Zone check passed.")


if __name__ == "__main__":
    main()
