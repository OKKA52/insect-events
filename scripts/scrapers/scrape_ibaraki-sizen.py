import os
import re
import json
import unicodedata
from datetime import datetime
import requests
from bs4 import BeautifulSoup, Tag
from supabase import create_client, Client
from dotenv import load_dotenv

# ── 設定読み込み ──
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)
load_dotenv(os.path.join(BASE_DIR, ".env.test"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

MUSEUM_ID = "5a213ea6-704d-4401-b300-a4ecf5c9aab6"
LIST_URL   = "https://www.nat.museum.ibk.ed.jp/eventpage/daily.html"

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s or "")).strip()

def fetch_html(url: str) -> str:
    r = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, timeout=10)
    r.raise_for_status()
    return r.text

def parse_date(raw: str) -> str:
    # YYYY年M月D日
    m = re.search(r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日", raw)
    if m:
        y,mo,d = map(int, m.groups())
    else:
        # M/D or YYYY/M/D
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

    # <article onclick="location.href='...'" >
    for art in soup.find_all("article", onclick=True):
        # 詳細 URL を onclick から取り出し
        m = re.search(r"location\.href=['\"](.+?)['\"]", art["onclick"])
        if not m:
            continue
        detail_url = requests.compat.urljoin(LIST_URL, m.group(1))

        # タイトル
        h4 = art.find("h4")
        if not h4:
            continue
        title = clean_text(h4.get_text())
        if any(kw in title for kw in EXCLUDE_KEYWORDS) or title.startswith("定期開催"):
            continue

        # div.more 内の li から「イベント開催日」
        date_li = art.select_one("div.more ul li:-soup-contains('イベント開催日')")
        if not date_li:
            print(f"⚠️ 日付 li が見つからずスキップ: {title}")
            continue
        # <strong>タグ内に日付が書かれているのでそこを取得
        strong = date_li.find("strong")
        raw = clean_text(strong.get_text()) if strong else clean_text(date_li.get_text())
        date = parse_date(raw)
        if not date:
            print(f"⚠️ 日付パース失敗: {title} raw={raw}")
            continue

        # 説明文：<p> をまとめる
        desc = [ clean_text(p.get_text()) for p in art.find_all("p") ]

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
        res = supabase.from_("events")\
            .select("id")\
            .eq("museum_id", ev["museum_id"])\
            .eq("title", ev["title"])\
            .eq("start_date", ev["start_date"])\
            .limit(1).execute()
        if res.data:
            supabase.from_("events").update(ev).eq("id", res.data[0]["id"]).execute()
            print(f"🔄 更新完了: {ev['title']}")
        else:
            supabase.from_("events").insert(ev).execute()
            print(f"🆕 新規登録: {ev['title']}")

if __name__ == "__main__":
    evs = fetch_events()
    save_to_supabase(evs)
