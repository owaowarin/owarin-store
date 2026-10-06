# -*- coding: utf-8 -*-
"""
OWARIN STORE - build the Shopee Mass Upload file from the Google Sheet exports.
Reads : ../_exports/{GAME GUIDE BOOKS,MAGAZINE,R2 IMAGES}.csv
Writes: out/mass_upload_<date>.xlsx, out/listing_index.csv,
        out/held_back.csv, out/missing_images.csv
See PLAN-shopee-relisting.md for the rules this implements.
"""
import csv, re, collections, zipfile, shutil, os, datetime, html, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXP  = os.path.join(HERE, '..', '_exports')
OUT  = os.path.join(HERE, 'out')
TPL  = os.path.join(HERE, 'Shopee_mass_upload_2026-08-30_basic_template.xlsx')
R2   = 'https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev'
MP   = 'Market Place\nPrice'
TODAY = datetime.date.today().isoformat()

CATEGORY = '101573'          # หนังสือและนิตยสาร > หนังสือ > หนังสืออื่นๆ
WEIGHT   = '0.5'
SUFFIX   = ' | หนังสือบทสรุปเกม เฉลยเกม คู่มือเกม'
NAME_MAX = 120               # Shopee: 20-120 chars
DESC_MAX = 5000              # Shopee: 60-5000 chars
OPT_MAX  = 20                # option value
VAR_MAX  = 14                # variation name
MAX_OPTS = 100
PRICE_RATIO = 5.0
SPX_MAX_PRICE = 2000         # Shopee: SPX Express pickup unavailable for items priced over 2,000 THB (blocked publish 2026-10-02)
SPECIAL_CUT = 500            # GAMEMAG SPECIAL: >= this MP price -> its own listing

COND_TH = {'S':'สภาพสวยมาก','A':'สภาพดี','B':'มีร่องรอยการใช้งาน',
           'C':'มีร่องรอยการใช้งานค่อนข้างมาก','D':'สภาพเก่ามาก'}
WORST = {'D':0,'C':1,'B':2,'A':3,'S':4,'':5}
GRADE_WORD = {'S':'NEW','A':'GOOD','B':'USED','C':'WORN','D':'DAMAGED'}

VOL_SERIES = {'MEGA⨯GAME','HOBBY TOY AND MODEL','HOBBY MODEL','GAMEMAG MAGAZINE',
              'MEGA MAGAZINE','A・Club','Other','TONBO MAGAZINE','TV MAGAZINE','PLAY',
              'HOBBY JAPAN','GAMEMAG CHEATS & CODE'}
TITLE_SERIES = {'GAMEMAG TOP SECRET','GAMEMAG SPECIAL'}
INDIVIDUAL   = {'GAME GUIDE BOOKS','MEGA MONTH'}

# ---------- helpers ----------
def base(s):
    s = s or ''
    s = re.sub(r'[\u30fb\uff65]\s*RESTOCK[^)]*(?=\))', '', s, flags=re.I)   # (Incl. 1 Map・RESTOCK-03) -> (Incl. 1 Map)
    s = re.sub(r'\s*\(\s*RESTOCK[^)]*\)', '', s, flags=re.I)                # (RESTOCK-01) -> gone
    s = re.sub(r'\s*\(\s*\)', '', s)
    return s.strip()
def nrm(s):    return re.sub(r'[^a-z0-9]+', '', base(s).lower())
def num(s):
    s = (s or '').replace(',', '').strip()
    return int(float(s)) if re.fullmatch(r'\d+(\.\d+)?', s) else 0
def volno(x):
    m = re.search(r'\b(?:vol|issue|no)\.?\s*(\d+)', x['Item name'], re.I)
    return m.group(1) if m else None
def year(x):
    m = re.search(r'\b(19|20)\d{2}\b', x['Item name'])
    return m.group(0) if m else None

def load_index():
    # R2 IMAGES.csv cols: A-D sheet-side ARRAYFORMULA junk, E=pid, F=n, G=ext (added 2026-09-13,
    # see 04 Design Tools/build-r2-images-index.ps1). G is "jpg"/"png" (same ext at every
    # position) or pipe-joined per position ("png|jpg") when a PID's photos are mixed formats.
    idx = {}
    idx_ext = {}
    with open(os.path.join(EXP, 'R2 IMAGES.csv'), encoding='utf-8-sig') as f:
        for row in csv.reader(f):
            if len(row) > 5 and row[4] and row[4] not in ('pid', 'Product ID'):
                try: idx[row[4]] = int(row[5])
                except ValueError: continue
                ext_field = row[6].strip() if len(row) > 6 and row[6] else ''
                if not ext_field:
                    print(f'WARNING: no ext column for {row[4]} in R2 IMAGES.csv - assuming jpg')
                    ext_field = 'jpg'
                idx_ext[row[4]] = ext_field.split('|')
    return idx, idx_ext

def images(pid, idx, idx_ext, cap=9):
    n = min(idx.get(pid, 0), cap)
    parts = idx_ext.get(pid, ['jpg'])
    return [f'{R2}/library/{pid}/{i}.{parts[i - 1] if i - 1 < len(parts) else parts[-1]}'
            for i in range(1, n + 1)]

CONDITION_GRADE_BLOCK = (
    "── CONDITION GRADE ──\n"
    "S NEW　A GOOD　B USED　C WORN　D DAMAGED")

FOOTER_BLOCK = (
    "หนังสือบทสรุปเกม・เฉลยเกม・คู่มือเกม\n"
    "OWARIN STORE — ส่งภายใน 2 วันทำการ")

TAIL_BLOCK = f"\n\n{CONDITION_GRADE_BLOCK}\n\n{FOOTER_BLOCK}"

def spec_block(x):
    """House format, single item: 「Title」 then ■ Label：Value"""
    lines = []
    if x.get('Platform'):  lines.append(f"■ Platform：{x['Platform']}")
    if x.get('Publisher'): lines.append(f"■ Publisher：{x['Publisher']}")
    if x.get('Genre'):     lines.append(f"■ Genre：{x['Genre']}")
    g = (x.get('Condition') or '').strip()
    if g:
        word = GRADE_WORD.get(g, '')
        lines.append(f"■ Condition：{g} — {word}" if word else f"■ Condition：{g}")
    head = f"「{base(x['Item name'])}」"
    return head + ("\n\n" + "\n".join(lines) if lines else "")

def description(x):
    return spec_block(x) + TAIL_BLOCK

def group_description(title, members):
    same = len({base(x['Item name']) for x, _ in members}) == 1
    first = members[0][0]
    mid = []
    if first.get('Platform'): mid.append(f"■ Platform：{first['Platform']}")
    if first.get('Genre'):    mid.append(f"■ Genre：{first['Genre']}")
    head = f"「{title}」"
    if mid: head += "\n\n" + "\n".join(mid)
    head += "\n\n── EDITIONS ──\n"
    if same:
        # publisher-tier group: one title, the options are the publisher editions
        lines = []
        for x, _ in members:
            pub = (x.get('Publisher') or 'อื่นๆ').strip()
            g = (x.get('Condition') or '').strip()
            lines.append(f"■ {pub}　Condition {g}" if g else f"■ {pub}")
    else:
        def tail(x, opt):
            n = base(x['Item name'])
            n = re.sub(r'^.*?\b(?:vol|issue|no)\.?\s*\d+\s*[-–:：]?\s*', '', n, flags=re.I).strip()
            cond = x.get('Condition', '')
            o = opt.lower()
            if n and n.lower() not in o and o.split()[0].lower() not in n.lower():
                return f"{n}　Condition {cond}" if cond else n
            return f"Condition {cond}" if cond else ''
        lines = []
        for x, opt in members:
            t = tail(x, opt)
            lines.append(f"■ {opt}：{t}" if t else f"■ {opt}")
    room = DESC_MAX - len(head) - len(TAIL_BLOCK)
    kept, used = [], 0
    for ln in lines:
        if used + len(ln) + 1 > room - 40: break
        kept.append(ln); used += len(ln) + 1
    if len(kept) < len(lines):
        kept.append(f"■ …และอีก {len(lines)-len(kept)} เล่ม (ดูในตัวเลือกสินค้า)")
    return head + "\n".join(kept) + TAIL_BLOCK

def parent_sku(title, kind, members, integ):
    if kind == 'single':
        return members[0][0]['Product ID']
    slug = re.sub(r'[^A-Za-z0-9]+', '-', title).strip('-').upper()[:60]
    return f'OWA-GRP-{slug}' if slug else f'OWA-GRP-{integ}'

def fit_name(title):
    room = NAME_MAX - len(SUFFIX)
    t = title if len(title) <= room else title[:room - 1].rstrip() + '…'
    return t + SUFFIX

def title_option(x):
    n = base(x['Item name'])
    n = re.sub(r'^(GAMEMAG TOP SECRET|GAMEMAG SPECIAL)\s*[-–:]?\s*', '', n, flags=re.I)
    n = re.sub(r'^Graphical Series vol\s*', '', n, flags=re.I)
    return n.strip()

def common_prefix_words(names):
    if len(names) < 2: return ''
    parts = [n.split() for n in names]
    out = []
    for i in range(min(len(p) for p in parts)):
        w = parts[0][i]
        if all(p[i] == w for p in parts): out.append(w)
        else: break
    return ' '.join(out)

def strip_prefix(name, pref):
    return name[len(pref):].strip(' -–:：') if pref and name.startswith(pref) else name

def series_labels(members):
    """members: [row]. Returns [(row, label)] with unique labels <= OPT_MAX."""
    names = [base(x['Item name']) for x in members]
    pref = common_prefix_words(names)
    raw = []
    for x, n in zip(members, names):
        m = re.search(r'\b(?:vol|issue|no)\.?\s*(\d+)', n, re.I)
        raw.append(f'vol {m.group(1)}' if m else strip_prefix(n, pref))
    # a label only falls back to the full name when the colliding rows are
    # genuinely different books; two copies of the same book keep `vol N`
    bylabel = collections.defaultdict(set)
    for n, l in zip(names, raw): bylabel[l].add(n)
    out = []
    for x, n, l in zip(members, names, raw):
        out.append((x, strip_prefix(n, pref) if len(bylabel[l]) > 1 else l))
    return uniquify(out)

def uniquify(pairs):
    counts = collections.Counter(l for _, l in pairs)
    used, out = set(), []
    for x, lab in pairs:
        cand = lab
        if counts[lab] > 1 and x.get('Condition'):
            cand = f"{lab} {x['Condition']}"
        cand = cand[:OPT_MAX].strip()
        if cand in used:
            k = 2
            while True:
                sfx = f' #{k}'
                c2 = (cand[:OPT_MAX - len(sfx)].strip() + sfx)
                if c2 not in used: cand = c2; break
                k += 1
        used.add(cand); out.append((x, cand))
    return out

CIRCLED_DIGITS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
def circled(n):
    return CIRCLED_DIGITS[n - 1] if 1 <= n <= len(CIRCLED_DIGITS) else f'({n})'

def fit_pub(pub, budget):
    """Drop trailing whole words until pub fits budget chars. Never cuts inside a word
    (the final [:budget] only fires if a single remaining word alone still overflows)."""
    words = pub.split(' ')
    while len(' '.join(words)) > budget and len(words) > 1:
        words.pop()
    return ' '.join(words)[:budget]

def pub_grade_options(rows):
    """rows: [row]. Variation option name = "{Publisher} · {Grade}" (<=OPT_MAX chars).
    Publisher is shortened by dropping trailing whole words when it doesn't fit
    (see fit_pub) -- no abbreviation table exists yet in 00 Docs, so this is a
    mechanical fallback, not a curated abbreviation list. Duplicate labels (e.g.
    two RESTOCK copies from the same publisher/condition) get a circled-digit
    suffix ①②③ in order of appearance."""
    parsed = []
    for x in rows:
        pub = (x.get('Publisher') or 'อื่นๆ').strip()
        g = (x.get('Condition') or '').strip()
        suffix = f' · {g}' if g else ''
        budget = OPT_MAX - len(suffix)
        if len(pub) > budget:
            pub = fit_pub(pub, budget)
        parsed.append((x, pub, suffix))
    labels = [pub + suffix for _, pub, suffix in parsed]
    counts = collections.Counter(labels)
    seen = collections.defaultdict(int)
    out = []
    for (x, pub, suffix), lab in zip(parsed, labels):
        if counts[lab] > 1:
            seen[lab] += 1
            mark = circled(seen[lab])
            budget = OPT_MAX - len(suffix) - len(mark)
            p = fit_pub(pub, budget) if len(pub) > budget else pub
            cand = f'{p}{suffix}{mark}'
        else:
            cand = lab
        out.append((x, cand))
    return out

def ok_group(members):
    if not members or len(members) > MAX_OPTS: return False
    pr = [num(x[MP]) for x, _ in members if num(x[MP])]
    return bool(pr) and max(pr) / max(min(pr), 1) <= PRICE_RATIO

# ---------- load + dedup ----------
def read(fn):
    with open(os.path.join(EXP, fn), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def dedup_key(x):
    """D-S1 (2026-10-02): same rule as Meta _metaDupKey. Identical copies = one row."""
    flags = '+'.join(sorted((x.get('Copy Flags') or '').upper().split()))
    return (base(x['Item name']).lower(), (x.get('Publisher') or '').strip().upper(),
            re.sub(r'[^\d.]', '', x.get('Original') or ''),
            (x.get('Condition') or '').strip().upper(), flags)

def dedup(rows):
    ins = [x for x in rows if (x.get('Status') or '').strip() == 'Instock']
    g = collections.defaultdict(list)
    for x in ins: g[dedup_key(x)].append(x)
    keep, held = [], []
    for v in g.values():
        v = sorted(v, key=lambda x: num(x[MP]))        # keep the cheapest identical copy
        keep.append(v[0]); held.extend(v[1:])
    return keep, held

def main():
    os.makedirs(OUT, exist_ok=True)
    idx, idx_ext = load_index()
    ggb, held1 = dedup(read('GAME GUIDE BOOKS.csv'))
    mag, held2 = dedup(read('MAGAZINE.csv'))
    held = held1 + held2
    items = ggb + mag

    missing = [x for x in items if idx.get(x['Product ID'], 0) == 0]
    items   = [x for x in items if idx.get(x['Product ID'], 0) > 0]

    by_type = collections.defaultdict(list)
    for x in items: by_type[(x.get('Type') or '').strip()].append(x)

    listings = []          # (title, kind, variation_name, [(row, option_label)])
    def add_individual(x):
        listings.append((base(x['Item name']), 'single', None, [(x, None)]))
    def add_titled(rows):
        # D-S3: copies of one individually-listed title (other condition/publisher) become one
        # group of options instead of duplicate listings of the same title
        t2 = collections.defaultdict(list)
        for z in rows: t2[nrm(z['Item name'])].append(z)
        for v2 in t2.values():
            m2 = pub_grade_options(v2)
            if len(v2) > 1 and ok_group(m2):
                listings.append((base(v2[0]['Item name']), 'group', 'Publisher', m2))
            else:
                for z in v2: add_individual(z)

    # --- GAME GUIDE BOOKS: multi-publisher titles become one listing ---
    gg = by_type.pop('GAME GUIDE BOOKS', [])
    t = collections.defaultdict(list)
    for x in gg: t[nrm(x['Item name'])].append(x)
    for k, v in t.items():
        members = pub_grade_options(v)
        if len(v) > 1 and ok_group(members):     # D-S3: same title, other publisher OR condition = options of one group
            listings.append((base(v[0]['Item name']), 'group', 'Publisher', members))
        else:
            for z in v: add_individual(z)

    add_titled(by_type.pop('MEGA MONTH', []))

    # --- game-titled series ---
    for tp in ['GAMEMAG SPECIAL', 'GAMEMAG TOP SECRET']:
        v = by_type.pop(tp, [])
        if not v: continue
        rest, solo = [], []
        for x in v:
            if tp == 'GAMEMAG SPECIAL' and num(x[MP]) >= SPECIAL_CUT: solo.append(x); continue
            if len(title_option(x)) > OPT_MAX: solo.append(x); continue
            rest.append(x)
        add_titled(solo)
        uniq = uniquify([(x, title_option(x)) for x in rest])
        if len(uniq) > 1 and ok_group(uniq):
            listings.append((tp, 'group', 'เล่ม', uniq))
        else:
            for x, _ in uniq: add_individual(x)

    # --- issue-numbered series: everything of a Type stays in its group ---
    for tp in list(by_type.keys()):
        v = by_type.pop(tp)
        buckets = {}
        if tp == 'MEGA⨯GAME':
            for x in v:
                y = year(x)
                buckets.setdefault(y if y in ('2010', '2011', '2012') else 'อื่นๆ', []).append(x)
        elif tp == 'TV MAGAZINE':
            for x in v:
                buckets.setdefault('set' if num(x[MP]) >= 1000 else 'main', []).append(x)
        else:
            buckets['all'] = v
        for key, mem in buckets.items():
            if not mem: continue
            if len(mem) == 1: add_individual(mem[0]); continue
            uniq = series_labels(mem)
            label = tp if key in ('all', 'main') else f'{tp} {key}'
            if ok_group(uniq): listings.append((label, 'group', 'เล่ม', uniq))
            else:
                for x, _ in uniq: add_individual(x)

    # Skip listings whose Parent SKU is already on Shopee (live or draft). One SKU per line in
    # skip_skus.txt (same folder); '#' comments allowed. Written 2026-10-02 from Seller Centre.
    skip_fn = os.path.join(HERE, 'skip_skus.txt')
    if os.path.exists(skip_fn):
        with open(skip_fn, encoding='utf-8') as f:
            skip = {l.split('#')[0].strip() for l in f if l.split('#')[0].strip()}
        kept, skipped = [], []
        for gi, l in enumerate(listings, 1):
            (skipped if parent_sku(l[0], l[1], l[3], f'G{gi:04d}') in skip else kept).append(l)
        with open(os.path.join(OUT, 'skipped_already_on_shopee.csv'), 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.writer(f); w.writerow(['parent_sku', 'listing_title', 'kind', 'options', 'MP prices'])
            for l in skipped:
                w.writerow([parent_sku(l[0], l[1], l[3], ''), l[0], l[1], len(l[3]), '/'.join(str(num(x[MP])) for x, _ in l[3])])
        print(f'SKIP-FILE: {len(skipped)} listing(s) already on Shopee skipped (see out/skipped_already_on_shopee.csv)')
        listings = kept

    limit = 0
    pids = None
    for a in sys.argv[1:]:
        if a.startswith('--limit='): limit = int(a.split('=')[1])
        elif a.startswith('--pids='): pids = [p.strip() for p in a.split('=', 1)[1].split(',') if p.strip()]
    if limit and pids:
        sys.exit('build_shopee_upload.py: --pids and --limit cannot be used together — pick one test mode.')
    if limit:
        singles = [l for l in listings if l[1] == 'single'][:max(limit - 2, 1)]
        groups  = [l for l in listings if l[1] == 'group'][:2]
        listings = singles + groups
        print(f'TEST MODE: {len(listings)} listings')
    if pids:
        wanted = set(pids)
        listings = [l for l in listings if any(x['Product ID'] in wanted for x, _ in l[3])]
        found = {x['Product ID'] for l in listings for x, _ in l[3]}
        missing_pids = wanted - found
        if missing_pids:
            print(f'WARNING: --pids not found in any buildable listing '
                  f'(held back, missing image, or wrong ID?): {sorted(missing_pids)}')
        print(f'PID-FILTER MODE: {len(listings)} listing(s) for {len(wanted)} requested PID(s)'
              ' (a matched group keeps every sibling row, not just the requested PID)')
    suffix = '_TEST' if (limit or pids) else ''
    write_xlsx(listings, idx, idx_ext, suffix=suffix)
    write_reports(listings, held, missing, suffix=suffix)
    print(f'listings={len(listings)}  single={sum(1 for l in listings if l[1]=="single")}'
          f'  group={sum(1 for l in listings if l[1]=="group")}'
          f'  rows={sum(len(l[3]) for l in listings)}'
          f'  held_back={len(held)}  missing_images={len(missing)}')

# ---------- xlsx writing (raw XML injection, template preserved) ----------
COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V',
        'W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL']
def esc(s): return html.escape(str(s), quote=False)

def build_rows(listings, idx, idx_ext):
    out = []
    for gi, (title, kind, varname, members) in enumerate(listings, 1):
        integ = f'G{gi:04d}'
        top = max(num(m[MP]) for m, _ in members)
        for x, opt in members:
            im = images(x['Product ID'], idx, idx_ext)
            c = {}
            c['A'] = CATEGORY
            c['B'] = fit_name(title)
            c['C'] = description(x) if kind == 'single' else group_description(title, members)
            c['H'] = '1'
            c['I'] = parent_sku(title, kind, members, integ)
            c['P'] = str(num(x[MP]))
            c['Q'] = '1'
            c['R'] = x['Product ID']
            c['V'] = im[0] if im else ''
            for i, u in enumerate(im[1:8], 0): c[COLS[22 + i]] = u
            c['AE'] = WEIGHT
            c['AI'] = 'เปิด'
            c['AJ'] = 'ปิด' if top > SPX_MAX_PRICE else 'เปิด'   # SPX pickup (channel 70036) not allowed above 2,000 THB; listing-level, so use the dearest option
            if kind == 'group':
                c['J'] = integ
                c['K'] = (varname or 'เล่ม')[:VAR_MAX]
                c['L'] = opt
                c['M'] = im[0] if im else ''
            out.append(c)
    return out

def write_xlsx(listings, idx, idx_ext, suffix=''):
    rows = build_rows(listings, idx, idx_ext)
    dst = os.path.join(OUT, f'mass_upload_{TODAY}{suffix}.xlsx')
    zin = zipfile.ZipFile(TPL)
    x = zin.read('xl/worksheets/sheet2.xml').decode('utf-8')
    x = x.replace('activePane="bottom_left"', 'activePane="bottomLeft"')
    chunks = []
    for n, c in enumerate(rows, 7):
        cells = ''.join(
            f'<c r="{col}{n}" t="inlineStr"><is><t xml:space="preserve">{esc(c[col])}</t></is></c>'
            for col in COLS if c.get(col) not in (None, ''))
        chunks.append(f'<row r="{n}">{cells}</row>')
    x = x.replace('</sheetData>', ''.join(chunks) + '</sheetData>')
    x = x.replace('<dimension ref="A1">', f'<dimension ref="A1:AL{6+len(rows)}">')
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for it in zin.infolist():
            data = zin.read(it.filename)
            if it.filename == 'xl/worksheets/sheet2.xml': data = x.encode('utf-8')
            elif it.filename.startswith('xl/worksheets/'):
                data = data.decode('utf-8').replace('activePane="bottom_left"',
                                                    'activePane="bottomLeft"').encode('utf-8')
            zout.writestr(it, data)
    zin.close()
    print('wrote', dst, f'({len(rows)} data rows)')

def write_reports(listings, held, missing, suffix=''):
    with open(os.path.join(OUT, f'listing_index{suffix}.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); w.writerow(['listing_no','listing_title','kind','variation_name',
                                       'option','Product ID','Item name','MP price'])
        for i, (title, kind, vn, mem) in enumerate(listings, 1):
            for x, opt in mem:
                w.writerow([i, title, kind, vn or '', opt or '', x['Product ID'],
                            x['Item name'], num(x[MP])])
    for name, data in ((f'held_back{suffix}.csv', held), (f'missing_images{suffix}.csv', missing)):
        with open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.writer(f); w.writerow(['Product ID','Item name','Type','Publisher',
                                           'Condition','Original','MP price'])
            for x in data:
                w.writerow([x['Product ID'], x['Item name'], x.get('Type',''),
                            x.get('Publisher',''), x.get('Condition',''),
                            x.get('Original',''), num(x[MP])])

if __name__ == '__main__':
    main()
