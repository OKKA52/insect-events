import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
import os
import json
import sys

# ✅ supabase_client を使うためのパス追加と import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.lib.supabase_client import supabase

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

MUSEUM_ID = "a7164302-db2e-486b-837b-d2674e906455"

def clean_text(text):
    if not text:
        return ""
    return text.strip()

def convert_japanese_date_to_standard(text):
    month_map = {
        '1月': '01', '2月': '02', '3月': '03', '4月': '04', '5月': '05', '6月': '06',
        '7月': '07', '8月': '08', '9月': '09', '10月': '10', '11月': '11', '12月': '12'
    }
    date_pattern = re.compile(r'(\d{1,2})月(\d{1,2})日.*')
    match = date_pattern.search(text)
    if match:
        month = month_map.get(f"{match.group(1)}月", "01")
        day = match.group(2).zfill(2)
        return f"2025/{month}/{day}"
    return None

def parse_date_range(text):
    date = convert_japanese_date_to_standard(text)
    if date:
        return date, date
    return None, None

def fetch_events():
    events = []
    url = "https://shizen.spec.ed.jp/イベント"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    items = soup.find_all("div", class_="Box80-20 clear")
    if not items:
        print("📭 イベントが見つかりませんでした。ページ終了。")
        return []

    for item in items:
        title_el = item.select_one("p.Title")
        title = clean_text(title_el.text if title_el else "")

        duration_el = item.select_one("p.Duration")
        duration = clean_text(duration_el.text if duration_el else "")

        description_el = item.select_one("p:nth-of-type(3)")
        description = clean_text(description_el.text if description_el else "")

        if any(keyword in title for keyword in EXCLUDE_KEYWORDS):
            print(f"⚠️ 除外ワード検出 → スキップ: {title}")
            continue

        start_date, end_date = parse_date_range(duration)

        if title and start_date:
            events.append({
                "title": title,
                "museum_id": MUSEUM_ID,
                "start_date": start_date,
                "end_date": end_date,
                "event_description": description,
                "event_url": url,
            })

    return events

def save_to_supabase(events):
    for event in events:
        normalized_title = clean_text(event["title"])
        event["title"] = normalized_title

        existing = supabase.table("events")\
            .select("id")\
            .eq("museum_id", event["museum_id"])\
            .eq("title", event["title"])\
            .eq("start_date", event["start_date"])\
            .limit(1)\
            .execute()

        if existing.data and len(existing.data) > 0:
            event_id = existing.data[0]["id"]
            result = supabase.table("events").update(event).eq("id", event_id).execute()
            action = "🔄 更新完了"
        else:
            result = supabase.table("events").insert(event).execute()
            action = "🆕 新規登録"

        if hasattr(result, "data") and result.data:
            print(f"{action}: {event['title']}")
        elif hasattr(result, "status_code") and result.status_code >= 400:
            print(f"❌ エラー: {event['title']} (HTTP {result.status_code})")
        else:
            print(f"⚠️ 不明な状態: {event['title']}")

if __name__ == "__main__":
    events = fetch_events()
    print(f"📦 {len(events)} 件のイベントを取得")
    save_to_supabase(events)
