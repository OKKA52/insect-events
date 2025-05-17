import os
import re
import unicodedata
from datetime import datetime
from urllib.parse import urljoin

import requests
from dotenv import load_dotenv
from supabase import create_client
from playwright.sync_api import sync_playwright

# ─── Env & Supabase ──────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(BASE_DIR, ".env.test"), override=True)
print("DEBUG SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("DEBUG SUPABASE_KEY:", "[OK]" if os.getenv("SUPABASE_KEY") else "[MISSING]")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

MUSEUM_ID = "e807944e-2b98-4809-a3fb-682a97a859af"
CATEGORIES = [
    "OEandSE",
    "periodic_event",
]

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s or "")).strip()

def parse_date(raw: str):
    m = re.search(r"(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日[～〜\-](\d{1,2})月(\d{1,2})日", raw)
    if not m:
        return None, None
    y, sm, sd, em, ed = m.groups()
    year = int(y) if y else datetime.now().year
    return f"{year}/{int(sm):02d}/{int(sd):02d}", f"{year}/{int(em):02d}/{int(ed):02d}"

def fetch_events():
    events = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/114.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()

        for cat in CATEGORIES:
            idx_url = f"https://www.seibutuen.jp/event/{cat}/index.html"
            print("📥 Fetching index JSON:", idx_url)
            r = requests.get(idx_url)
            r.encoding = r.apparent_encoding
            blob = re.search(r'(\{"articleType"[\s\S]*?\]\})', r.text)
            if not blob:
                print("⚠️ JSON blob not found for", cat)
                continue
            data = blob.group(1)
            json_obj =   __import__('json').loads(data)
            # collect all sids
            sids = [b["sid"] for b in json_obj["blogs"]]

            for sid in sids:
                detail_url = f"https://www.seibutuen.jp/event/{cat}/{sid}.html"
                print("▶ Loading detail page:", detail_url)
                page.goto(detail_url)
                page.wait_for_load_state("networkidle")
                # タイトル
                title = clean_text(page.locator("h2").inner_text())
                # 日付（JS後に .c-list 直下 or 独自クラスに入るはず）
                # まずリスト内の <p>（最初の）を取得
                date_text = page.locator("ul.c-list li p").first.inner_text()
                start, end = parse_date(date_text)
                if not start:
                    print("⚠️ date parse failed:", date_text)
                    continue
                # リード文
                lead = ""
                if page.locator("h4.lead").count():
                    lead = clean_text(page.locator("h4.lead").inner_text())

                events.append({
                    "title":             title,
                    "museum_id":         MUSEUM_ID,
                    "start_date":        start,
                    "end_date":          end or start,
                    "event_description": lead,
                    "event_url":         detail_url,
                })

        browser.close()
    print(f"📦 取得イベント数: {len(events)}")
    return events

def save_to_supabase(events):
    for ev in events:
        ev["title"] = clean_text(ev["title"])
        existing = supabase.table("events")\
            .select("id")\
            .eq("museum_id", ev["museum_id"])\
            .eq("title", ev["title"])\
            .eq("start_date", ev["start_date"])\
            .limit(1).execute()
        if existing.data:
            supabase.table("events").update(ev).eq("id", existing.data[0]["id"]).execute()
            print("🔄 更新:", ev["title"])
        else:
            supabase.table("events").insert(ev).execute()
            print("🆕 登録:", ev["title"])

if __name__ == "__main__":
    evs = fetch_events()
    save_to_supabase(evs)
