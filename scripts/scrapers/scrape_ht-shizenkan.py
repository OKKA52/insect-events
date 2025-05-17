import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright
import os
import json
import sys

# ✅ supabase_client を使うためのパス追加と import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.lib.supabase_client import supabase

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

MUSEUM_ID = "c77afa0d-e000-4f05-b25d-e4c0be741d85"

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

def parse_date_range_ht(text: str):
    parts = re.findall(r"(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    if not parts:
        return None, None
    y1, m1, d1 = map(int, parts[0])
    start = f"{y1}/{m1:02d}/{d1:02d}"
    if len(parts) > 1:
        y2, m2, d2 = map(int, parts[1])
        end = f"{y2}/{m2:02d}/{d2:02d}"
    else:
        end = start
    return start, end

def fetch_events():
    events = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.ht-shizenkan.com/s/event/")
        page.wait_for_selector("h4")

        soup = BeautifulSoup(page.content(), "html.parser")
        for title_el in soup.find_all("h4"):
            title = clean_text(title_el.get_text())

            if any(kw in title for kw in EXCLUDE_KEYWORDS):
                print(f"⚠️ 除外ワード検出 → スキップ: {title}")
                continue

            date_text_node = title_el.find_next(text=re.compile(r"\d{4}年"))
            date_text = clean_text(date_text_node) if date_text_node else ""
            start_date, end_date = parse_date_range_ht(date_text)

            desc_parts = []
            for sib in title_el.next_siblings:
                if getattr(sib, "name", None) == "h4":
                    break
                txt = ""
                if hasattr(sib, "get_text"):
                    txt = clean_text(sib.get_text())
                elif isinstance(sib, str):
                    txt = clean_text(sib)
                if txt and not txt.startswith("〖"):
                    desc_parts.append(txt)
            description = remove_duplicate_sentences(" ".join(desc_parts))

            if title and start_date:
                events.append({
                    "title": title,
                    "museum_id": MUSEUM_ID,
                    "start_date": start_date,
                    "end_date": end_date,
                    "event_description": description,
                    "event_url": "https://www.ht-shizenkan.com/s/event/",
                })

        browser.close()

    print(f"📦 全イベント数: {len(events)}")
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
