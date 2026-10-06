#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OWARIN STORE — อัปรูปสินค้าขึ้น Supabase Storage แล้วสร้าง image_link ให้ FB CATALOGUE

ทำอะไร
  1) อ่านรายการสินค้าจากไฟล์ CSV ที่ export จากชีต (ต้องมีคอลัมน์ Item name + Product ID)
  2) ไล่หารูปในโฟลเดอร์รูป จับคู่ด้วย "ชื่อไฟล์ = ชื่อสินค้า (N)"
  3) เลือกรูปหลัก 1 รูปต่อสินค้า (เลข N น้อยสุด) → ย่อเหลือ 1024px + บีบเป็น JPEG
  4) อัปขึ้น Supabase Storage โดยตั้งชื่อไฟล์เป็น <Product ID>.jpg
  5) เขียน image_links.csv (Product ID, image_link) ไว้เอาไปวางในชีต

วิธีรัน
  pip install pillow requests
  set SUPABASE_URL=https://xxxx.supabase.co        (Windows CMD)
  set SUPABASE_KEY=<service_role key>
  python supabase_upload_images.py --dry-run       ← ลองก่อน ไม่อัปจริง
  python supabase_upload_images.py                 ← อัปจริง

⚠️ SUPABASE_KEY เป็นกุญแจระดับผู้ดูแล — ใช้บนเครื่องตัวเองเท่านั้น
   ห้ามใส่ในเว็บแอป ห้ามแชร์ ห้าม commit ขึ้น git
"""

import argparse
import csv
import io
import os
import re
import sys
from collections import defaultdict

# ──────────────── ตั้งค่า ────────────────
BUCKET = "product-images"          # ชื่อ bucket ใน Supabase (ต้องเป็น public)

# โฟลเดอร์รูป (relative กับที่รันสคริปต์ หรือใส่ path เต็มก็ได้)
IMAGE_ROOTS = [
    "GGB All",
    "Magazine",
    "Magazine - Gundam",
]

# ไฟล์ CSV ที่ export มาจากชีต (File → Download → CSV) — ใส่ได้หลายไฟล์
INVENTORY_CSV = [
    "GAME GUIDE BOOKS.csv",
    "MAGAZINE.csv",
]

MAX_SIDE = 1024                    # ด้านยาวสุดหลังย่อ (Meta แนะนำ ≥500, 1024 กำลังดี)
JPEG_QUALITY = 82
SKIP_STATUS = {"sold"}             # ข้ามสินค้าที่ขายไปแล้ว (ตั้งเป็น set() ถ้าอยากอัปทั้งหมด)
OUT_CSV = "image_links.csv"

VALID_EXT = (".jpg", ".jpeg", ".png", ".webp")
NUM_SUFFIX = re.compile(r"^(.*?)\s*\((\d+)\)$")


def norm(s):
    """ทำให้ชื่อเทียบกันได้: ตัดช่องว่างซ้ำ + ตัวพิมพ์เล็ก"""
    return re.sub(r"\s+", " ", str(s or "")).strip().casefold()


def load_inventory():
    """คืน dict: ชื่อสินค้า(normalized) → Product ID"""
    mapping = {}
    missing_files = []
    for path in INVENTORY_CSV:
        if not os.path.exists(path):
            missing_files.append(path)
            continue
        with open(path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                keys = {norm(k): k for k in row}
                k_name = keys.get("item name")
                k_pid = keys.get("product id")
                k_status = keys.get("status")
                if not k_name or not k_pid:
                    continue
                name = (row[k_name] or "").strip()
                pid = (row[k_pid] or "").strip()
                if not name or not pid:
                    continue
                if k_status and norm(row[k_status]) in SKIP_STATUS:
                    continue
                mapping.setdefault(norm(name), pid)
    if missing_files:
        print("⚠️  ไม่พบไฟล์ CSV: " + ", ".join(missing_files))
    return mapping


def scan_images():
    """คืน dict: ชื่อสินค้า(normalized) → path ของรูปหลัก (เลขในวงเล็บน้อยสุด)"""
    groups = defaultdict(list)
    for root in IMAGE_ROOTS:
        if not os.path.isdir(root):
            print("⚠️  ไม่พบโฟลเดอร์รูป: %s" % root)
            continue
        for dirpath, _, filenames in os.walk(root):
            for fn in filenames:
                stem, ext = os.path.splitext(fn)
                if ext.lower() not in VALID_EXT:
                    continue
                m = NUM_SUFFIX.match(stem)
                name, idx = (m.group(1), int(m.group(2))) if m else (stem, 1)
                groups[norm(name)].append((idx, os.path.join(dirpath, fn)))
    return {k: sorted(v)[0][1] for k, v in groups.items()}


def to_jpeg(path):
    """ย่อ + แปลงเป็น JPEG คืน bytes"""
    from PIL import Image
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


def upload(session, base_url, key, object_path, data):
    """อัปไฟล์ขึ้น Supabase Storage (upsert = อัปทับได้)"""
    url = "%s/storage/v1/object/%s/%s" % (base_url.rstrip("/"), BUCKET, object_path)
    r = session.post(url, data=data, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }, timeout=60)
    if r.status_code not in (200, 201):
        raise RuntimeError("HTTP %s — %s" % (r.status_code, r.text[:200]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="ลองรันโดยไม่อัปจริง")
    ap.add_argument("--limit", type=int, default=0, help="จำกัดจำนวนไฟล์ (ไว้ทดสอบ)")
    args = ap.parse_args()

    base_url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not args.dry_run and (not base_url or not key):
        sys.exit("❌ ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_KEY (ดูหัวไฟล์)")

    inv = load_inventory()
    imgs = scan_images()
    print("สินค้าในชีต: %d | ชื่อรูปที่เจอ: %d" % (len(inv), len(imgs)))

    matched, unmatched_img, rows = [], [], []
    for name, pid in inv.items():
        path = imgs.get(name)
        if path:
            matched.append((pid, path))
    have = {norm(n) for n in inv}
    for name in imgs:
        if name not in have:
            unmatched_img.append(name)

    print("จับคู่ได้: %d | สินค้าที่ไม่มีรูป: %d | รูปที่ไม่มีในชีต: %d"
          % (len(matched), len(inv) - len(matched), len(unmatched_img)))

    if args.limit:
        matched = matched[:args.limit]

    session = None
    if not args.dry_run:
        import requests
        session = requests.Session()

    total_bytes = ok = fail = 0
    for i, (pid, path) in enumerate(matched, 1):
        obj = "%s.jpg" % pid
        try:
            data = to_jpeg(path)
            total_bytes += len(data)
            if not args.dry_run:
                upload(session, base_url, key, obj, data)
            rows.append([pid, "%s/storage/v1/object/public/%s/%s"
                         % (base_url.rstrip("/") or "<SUPABASE_URL>", BUCKET, obj)])
            ok += 1
        except Exception as e:
            fail += 1
            print("  ✗ %s — %s" % (pid, e))
        if i % 100 == 0:
            print("  ... %d/%d" % (i, len(matched)))

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Product ID", "image_link"])
        w.writerows(rows)

    print("\n%s สำเร็จ %d ไฟล์ (พลาด %d) รวม %.0f MB"
          % ("[DRY-RUN] " if args.dry_run else "✓", ok, fail, total_bytes / 1024 / 1024))
    print("เขียนไฟล์: %s" % OUT_CSV)
    if unmatched_img[:5]:
        print("\nตัวอย่างรูปที่ไม่มีในชีต (เช็กชื่อให้ตรง):")
        for n in unmatched_img[:5]:
            print("  - " + n)


if __name__ == "__main__":
    main()
