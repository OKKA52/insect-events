import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
import os
import json
import sys

# パスを通して supabase_client を読み込む
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.lib.supabase_client import supabase

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

MUSEUM_ID = "850c696f-c867-453a-9bf5-b4b9ceec9bed"

def clean_text(text):
    if not text:
        return ""
    return text.strip()

def convert_japanese_date_to_standard(text):
    date_pattern = re.compile(r'(\d{4})年(\d{1,2})月(\d{1,2})日')
    match = date_pattern.search(text)
    if match:
        year = match.group(1)
        month = match.group(2).zfill(2)
        day = match.group(3).zfill(2)
        result = f"{year}-{month}-{day}"
        print(f"デバッグ: {text} → {result}")
        return result
    return None

def parse_date_range(text):
    dates = [date.strip() for date in text.split(' - ')]
    if len(dates) == 2:
        start_date = convert_japanese_date_to_standard(dates[0])
        end_date = convert_japanese_date_to_standard(dates[1])
        print(f"デバッグ: 取得した日付範囲: {start_date} ～ {end_date}")
        if start_date and end_date and start_date > end_date:
            print(f"⚠️ 日付順番が逆転しました: {start_date} > {end_date}")
            start_date, end_date = end_date, start_date
        return start_date, end_date
    return None, None

def fetch_events():
    events = []
    url = "https://kameimuseum.or.jp/schedule/"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    items = soup.find_all("div", class_="list_wrap")
    if not items:
        print("📭 イベントが見つかりませんでした。ページ終了。")
        return []

    for item in items:
        category_el = item.select_one("span.cat_nenkan")
        if category_el and "蝶" not in category_el.text:
            continue

        title_el = item.select_one("h4")
        title = clean_text(title_el.text if title_el else "")

        duration_el = item.select_one("span.date_nenkan")
        start_date, end_date = None, None
        if duration_el:
            duration = clean_text(duration_el.text)
            start_date, end_date = parse_date_range(duration)

        description_el = item.select_one("p")
        description = clean_text(description_el.text if description_el else "")

        if any(keyword in title for keyword in EXCLUDE_KEYWORDS):
            print(f"⚠️ 除外ワード検出 → スキップ: {title}")
            continue

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

        existing = supabase.table("events") \
            .select("id") \
            .eq("museum_id", event["museum_id"]) \
            .eq("title", event["title"]) \
            .eq("start_date", event["start_date"]) \
            .limit(1) \
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
