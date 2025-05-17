import os
import re
import json
import unicodedata
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# ✅ supabase_client を使うためのパス追加と import
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.lib.supabase_client import supabase

# ── 設定読み込み ──
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

MUSEUM_ID = "5a213ea6-704d-4401-b300-a4ecf5c9aab6"
LIST_URL   = "https://www.nat.museum.ibk.ed.jp/eventpage/daily.html"

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s or "")).strip()

def fetch_html(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    r.raise_for_status()
    return r.text

def parse_date(raw: str) -> str:
    m = re.search(r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日", raw)
    if m:
        y, mo, d = map(int, m.groups())
    else:
        m = re.search(r"(?:(\d{4})[\/／])?(\d{1,2})[\/／](\d{1,2})", raw)
        if not m:
            return None
        ys, ms, ds = m.groups()
        y = int(ys) if ys else datetime.now().year
        mo, d = int(ms), int(ds)
    return f"{y}/{mo:02d}/{d:02d}"

def fetch_events():
    print(f"🌐 一覧ページ取得: {LIST_URL}")
    soup = BeautifulSoup(fetch_html(LIST_URL), "html.parser")
    events = []

    for art in soup.find_all("article", onclick=True):
        m = re.search(r"location\.href=['\"](.+?)['\"]", art["onclick"])
        if not m:
            continue
        detail_url = requests.compat.urljoin(LIST_URL, m.group(1))

        h4 = art.find("h4")
        if not h4:
            continue
        title = clean_text(h4.get_text())
        if any(kw in title for kw in EXCLUDE_KEYWORDS) or title.startswith("定期開催"):
            continue

        date_li = art.select_one("div.more ul li:-soup-contains('イベント開催日')")
        if not date_li:
            print(f"⚠️ 日付 li が見つからずスキップ: {title}")
            continue
        strong = date_li.find("strong")
        raw = clean_text(strong.get_text()) if strong else clean_text(date_li.get_text())
        date = parse_date(raw)
        if not date:
            print(f"⚠️ 日付パース失敗: {title} raw={raw}")
            continue

        desc = [clean_text(p.get_text()) for p in art.find_all("p")]

        print(f"📝 {title} → {date} ～ {date}")
        events.append({
            "title": title,
            "museum_id": MUSEUM_ID,
            "start_date": date,
            "end_date": date,
            "event_description": "\n".join(desc),
            "event_url": detail_url,
        })

    print(f"📦 取得イベント数: {len(events)}")
    return events

def save_to_supabase(events):
    for ev in events:
        ev["title"] = clean_text(ev["title"])
        res = supabase.table("events")\
            .select("id")\
            .eq("museum_id", ev["museum_id"])\
            .eq("title", ev["title"])\
            .eq("start_date", ev["start_date"])\
            .limit(1).execute()

        if res.data:
            supabase.table("events").update(ev).eq("id", res.data[0]["id"]).execute()
            print(f"🔄 更新完了: {ev['title']}")
        else:
            supabase.table("events").insert(ev).execute()
            print(f"🆕 新規登録: {ev['title']}")

if __name__ == "__main__":
    evs = fetch_events()
    save_to_supabase(evs)
