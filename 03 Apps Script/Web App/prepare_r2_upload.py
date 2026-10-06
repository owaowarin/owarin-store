#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OWARIN STORE — สร้าง "สำเนาสำหรับอัปขึ้น Cloudflare R2"

สร้างโฟลเดอร์ _r2_upload/ ขึ้นมาใหม่ ต้นฉบับในเครื่องไม่ถูกแตะต้องเลย

  _r2_upload/
    library/pocket-book/<ชื่อสินค้า>/<ชื่อสินค้า> (N).jpg   ← ชื่อเดิมเป๊ะ ทุกรูป (ไว้หาปกส่งลูกค้า)
    catalog/<Product ID>.jpg                                ← รูปหลัก 1 รูป/สินค้า (ให้ Meta ใช้)

catalog สร้างได้เมื่อมีไฟล์ CSV ที่ export จากชีต (ต้องมีคอลัมน์ Item name + Product ID)
ถ้ายังไม่มี CSV สคริปต์จะทำเฉพาะ library แล้วข้าม catalog ไป

วิธีรัน (ที่โฟลเดอร์ OWARIN STORE):
    pip install pillow
    python prepare_r2_upload.py --limit 20     ← ลองก่อน 20 ไฟล์
    python prepare_r2_upload.py                ← ทำจริงทั้งหมด
"""

import argparse
import csv
import os
import re
import shutil
import sys
from collections import defaultdict

# ──────────────── ตั้งค่า ────────────────
SOURCE_DIR   = os.path.join("GGB All", "GGB - POCKET BOOK")
LIBRARY_NS   = os.path.join("library", "pocket-book")   # โครงบน R2
CATALOG_NS   = "catalog"
OUT_ROOT     = "_r2_upload"

LIBRARY_MAX  = 1600     # ด้านยาวสุดของรูปใน library (ดูปกหน้า/หลังชัดพอ ประหยัดพื้นที่)
LIBRARY_Q    = 85
CATALOG_MAX  = 1024     # Meta แนะนำ ≥500 · 1024 กำลังดี
CATALOG_Q    = 82

# ไล่หาไฟล์ตามลำดับ ใช้ไฟล์แรกที่เจอ (ตัวใหม่สุดไว้บนสุด)
INVENTORY_CSV = ["_r2_upload/Update.csv", "GAME GUIDE BOOKS.csv", "GAME GUIDE BOOKS.csv.csv"]

# เอาเข้า catalog เฉพาะ Instock เท่านั้น
# (Auction = ขายโล๊ะผ่านโพสต์ประมูล · Sold/Retake/Hold = ไม่พร้อมขาย → ไม่เข้าแค็ตตาล็อก)
# library ยังเก็บรูปครบทุกใบไม่ว่าสถานะไหน
READY_STATUS  = {"instock"}

VALID_EXT  = (".jpg", ".jpeg", ".png", ".webp")
NUM_SUFFIX = re.compile(r"^(.*?)\s*\((\d+)\)$")


def norm(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().casefold()


def convert(src, dst, max_side, quality, resume=True):
    """ย่อ + แปลงเป็น JPEG · คืนขนาดไฟล์ผลลัพธ์ (bytes) · resume=ข้ามไฟล์ที่ทำแล้ว"""
    from PIL import Image
    if resume and os.path.exists(dst) and os.path.getsize(dst) > 0:
        return -1                      # -1 = ข้าม (ทำไว้แล้ว)
    im = Image.open(src)
    try:
        im.draft("RGB", (max_side, max_side))   # decode JPEG แบบย่อ = เร็วขึ้นมาก
    except Exception:
        pass
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "JPEG", quality=quality, optimize=True)
    return os.path.getsize(dst)


def load_inventory():
    """คืน (mapping ชื่อ→Product ID เฉพาะที่ยังไม่ขาย, ชุดชื่อที่ขายแล้ว, ไม่พบไฟล์ใดเลย?)"""
    mapping, sold, found_any = {}, set(), False
    for path in INVENTORY_CSV:
        if not os.path.exists(path) or found_any:
            continue                    # ใช้ไฟล์แรกที่เจอไฟล์เดียว
        found_any = True
        print("ใช้ข้อมูลจาก: %s" % path)
        with open(path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                keys = {norm(k): k for k in row}
                kn, kp, ks = keys.get("item name"), keys.get("product id"), keys.get("status")
                if not kn or not kp:
                    continue
                name = (row[kn] or "").strip()
                pid = (row[kp] or "").strip()
                if not name or not pid:
                    continue
                if ks and norm(row[ks]) not in READY_STATUS:
                    sold.add(norm(name))      # ยังไม่พร้อม (Sold / Retake / Hold)
                    continue
                mapping.setdefault(norm(name), pid)
    return mapping, sold, (not found_any)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="จำกัดจำนวนรูป (ไว้ทดสอบ)")
    ap.add_argument("--clean", action="store_true", help="ลบ _r2_upload เดิมทิ้งก่อนเริ่มใหม่")
    ap.add_argument("--only", choices=["library", "catalog", "both"], default="both",
                    help="ทำเฉพาะส่วนไหน (ดีฟอลต์ both)")
    args = ap.parse_args()

    if not os.path.isdir(SOURCE_DIR):
        sys.exit("❌ ไม่พบโฟลเดอร์ต้นทาง: %s\n   (ต้องรันสคริปต์ที่โฟลเดอร์ OWARIN STORE)" % SOURCE_DIR)

    if args.clean and os.path.isdir(OUT_ROOT):
        shutil.rmtree(OUT_ROOT)

    # ── รวบรวมรูป: โฟลเดอร์ = ชื่อสินค้า ────────────────
    items = defaultdict(list)          # ชื่อสินค้า → [(ลำดับรูป, path)]
    for dirpath, _, filenames in os.walk(SOURCE_DIR):
        for fn in filenames:
            stem, ext = os.path.splitext(fn)
            if ext.lower() not in VALID_EXT:
                continue
            rel = os.path.relpath(dirpath, SOURCE_DIR)
            item = os.path.basename(dirpath) if rel != "." else os.path.splitext(fn)[0]
            m = NUM_SUFFIX.match(stem)
            idx = int(m.group(2)) if m else 1
            items[item].append((idx, os.path.join(dirpath, fn)))

    total_imgs = sum(len(v) for v in items.values())
    print("สินค้า (โฟลเดอร์): %d | รูปทั้งหมด: %d" % (len(items), total_imgs))

    inv, sold_names, no_csv = load_inventory()
    if no_csv:
        print("⚠️  ไม่พบไฟล์ CSV (%s) → ข้ามส่วน catalog" % " หรือ ".join(INVENTORY_CSV))
    else:
        print("อ่านชีตได้ %d รายการ (ยังไม่ขาย) · ขายแล้ว %d" % (len(inv), len(sold_names)))

    # ── 1) library: ทุกรูป ชื่อเดิม ──────────────────────
    lib_bytes = lib_n = lib_skip = 0
    done = 0
    stop = args.only == "catalog"
    for item in sorted(items):
        if stop:
            break
        for idx, src in sorted(items[item]):
            if args.limit and done >= args.limit:
                stop = True
                break
            dst = os.path.join(OUT_ROOT, LIBRARY_NS, item,
                               os.path.splitext(os.path.basename(src))[0] + ".jpg")
            try:
                sz = convert(src, dst, LIBRARY_MAX, LIBRARY_Q)
                if sz >= 0:
                    lib_bytes += sz
                    lib_n += 1
                    done += 1          # นับเฉพาะไฟล์ที่แปลงจริง → รันซ้ำแล้วคืบต่อ
                else:
                    lib_skip += 1
            except Exception as e:
                print("  ✗ library: %s — %s" % (os.path.basename(src), e))
            if lib_n and lib_n % 200 == 0:
                print("  library ... %d" % lib_n)
        if stop:
            break

    # ── 2) catalog: รูปหลัก 1 รูป/สินค้า ตั้งชื่อ Product ID ──
    cat_bytes = cat_n = cat_skip = 0
    no_pid, sold_skipped = [], []
    if inv and args.only != "library":
        for item in sorted(items):
            pid = inv.get(norm(item))
            if not pid:
                (sold_skipped if norm(item) in sold_names else no_pid).append(item)
                continue
            src = sorted(items[item])[0][1]        # เลข (N) น้อยสุด = รูปหลัก
            dst = os.path.join(OUT_ROOT, CATALOG_NS, pid + ".jpg")
            try:
                sz = convert(src, dst, CATALOG_MAX, CATALOG_Q)
                if sz >= 0:
                    cat_bytes += sz
                    cat_n += 1
                else:
                    cat_skip += 1
            except Exception as e:
                print("  ✗ catalog: %s — %s" % (item, e))

        # แผนที่ Product ID → URL (เอาไปวางในชีตได้)
        with open(os.path.join(OUT_ROOT, "catalog_index.csv"), "w",
                  encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["Product ID", "object_path"])
            for item in sorted(items):
                pid = inv.get(norm(item))
                if pid:
                    w.writerow([pid, "%s/%s.jpg" % (CATALOG_NS, pid)])

    mb = lambda b: b / 1024 / 1024
    print("\n────────── สรุป ──────────")
    print("library : %d รูป  %.0f MB  (ข้ามที่ทำแล้ว %d)" % (lib_n, mb(lib_bytes), lib_skip))
    print("catalog : %d รูป  %.0f MB  (ข้ามที่ทำแล้ว %d)" % (cat_n, mb(cat_bytes), cat_skip))
    if sold_skipped:
        print("          ไม่เอาเข้า catalog เพราะขายแล้ว: %d รายการ" % len(sold_skipped))
    print("รวม     : %.0f MB   (โควตาฟรี R2 = 10,240 MB)" % mb(lib_bytes + cat_bytes))
    print("โฟลเดอร์ผลลัพธ์: %s" % os.path.abspath(OUT_ROOT))
    if no_pid:
        print("\n⚠️  หา Product ID ไม่เจอ %d รายการ (ไม่ได้เข้า catalog) เช่น:" % len(no_pid))
        for n in no_pid[:8]:
            print("   - " + n)


if __name__ == "__main__":
    main()
