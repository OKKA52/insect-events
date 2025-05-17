import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright
import os
import json
import sys

# ✅ src/lib/supabase_client を使うように修正
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.lib.supabase_client import supabase

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

MUSEUM_ID = "775284cf-d328-429d-b2e7-bbf894158bc9"

def clean_text(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def remove_duplicate_sentences(text):
    seen = set()
    sentences = re.split(r'(?<=[。！？\n])\s*', text)
    unique_sentences = []
    for s in sentences:
        norm = clean_text(s)
        if norm and norm not in seen:
            seen.add(norm)
            unique_sentences.append(s.strip())
    return " ".join(unique_sentences)

def parse_date_range(text):
    match = re.findall(r"(\d{1,2})[\/月](\d{1,2})[（(]?[^\d)]*[）)]?", text)
    if not match:
        return None, None

    today = datetime.now()
    current_year = today.year

    def infer_year(month: int):
        if today.month >= 10 and month <= 3:
            return current_year + 1
        return current_year

    start_month, start_day = map(int, match[0])
    start_year = infer_year(start_month)
    start = f"{start_year}/{start_month:02d}/{start_day:02d}"

    if len(match) > 1:
        end_month, end_day = map(int, match[1])
        end_year = infer_year(end_month)
        end = f"{end_year}/{end_month:02d}/{end_day:02d}"
    else:
        end = start

    return start, end

def fetch_events():
    events = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page_num = 1
        while True:
            url = f"https://ryu-yo.jp/event/page/{page_num}/" if page_num > 1 else "https://ryu-yo.jp/event/"
            print(f"🌐 ページ取得中: {url}")
            page.goto(url)
            try:
                page.wait_for_selector("li.eventArchiveList--item", timeout=5000)
            except:
                print("⛔️ イベントセレクタが見つからなかったため、終了")
                break

            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            items = soup.find_all("li", class_="eventArchiveList--item")
            if not items:
                print("📭 イベントが見つかりませんでした。ページ終了。")
                break

            print(f"🧪 ページ {page_num}: イベント数 = {len(items)}")

            for item in items:
                title_el = item.select_one("h3.title")
                date_el = item.select_one("dl .dl-row:nth-of-type(1) dd")
                description_el = item.select_one("p.mb30")

                title = clean_text(title_el.text if title_el else "")
                date_text = clean_text(date_el.text if date_el else "")
                description = clean_text(description_el.text if description_el else "")
                description = remove_duplicate_sentences(description)

                if any(kw in title for kw in EXCLUDE_KEYWORDS):
                    print(f"⚠️ 除外ワード検出 → スキップ: {title}")
                    continue

                print(f"📝 タイトル: {title}")
                print(f"📅 日付テキスト: {date_text}")

                start_date, end_date = parse_date_range(date_text)
                print(f"➡️ パース結果: start={start_date}, end={end_date}")

                if title and start_date:
                    events.append({
                        "title": title,
                        "museum_id": MUSEUM_ID,
                        "start_date": start_date,
                        "end_date": end_date,
                        "event_description": description,
                        "event_url": url,
                    })

            page_num += 1

        browser.close()

    print(f"📦 全ページ合計イベント数: {len(events)}")
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
