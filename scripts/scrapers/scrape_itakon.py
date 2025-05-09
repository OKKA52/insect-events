import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json, os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

# スクリプト位置からルートの .env.test を参照
dotenv_path = os.path.join(BASE_DIR, ".env.test")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("✅ URL =", SUPABASE_URL)
print("✅ KEY =", '[OK]' if SUPABASE_KEY else '[MISSING]')

MUSEUM_ID = "f58d41b3-f940-439c-b7c7-70c73d108cea"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    # 例: 4/19(土)〜6/1(日) → [('4', '19'), ('6', '1')]
    match = re.findall(r"(\d{1,2})[\/月](\d{1,2})[（(]?[^\d)]*[）)]?", text)
    if not match:
        return None, None

    today = datetime.now()
    current_year = today.year

    def infer_year(month: int):
        # 10月以降に1月〜3月などが来た場合は翌年とみなす
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
    url = "https://www.itakon.com/news/events"
    res = requests.get(url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    rows = soup.find_all("tr")
    for i in range(len(rows)):
        row = rows[i]
        columns = row.find_all("td")
        if len(columns) < 2:
            continue

        date_text = clean_text(columns[0].text)
        title_raw = columns[1].find("strong")
        title = clean_text(title_raw.text if title_raw else columns[1].text)
        description = ""

        # 別セルに説明文がある場合
        if len(columns) >= 3:
            description = clean_text(columns[2].get_text(separator=" "))

        # 次の tr に補足がある場合
        if i + 1 < len(rows):
            next_row = rows[i + 1]
            next_columns = next_row.find_all("td")
            if len(next_columns) == 1:
                extra = clean_text(next_columns[0].get_text(separator=" "))
                if extra:
                    description += " " + extra

        # 重複除去
        description = remove_duplicate_sentences(description)

        # ① 別ファイルのリストで除外判定
        if any(kw in title for kw in EXCLUDE_KEYWORDS):
            print(f"⚠️ 除外ワード検出 → スキップ: {title}")
            continue

        start_date, end_date = parse_date_range(date_text)
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
        normalized_title = clean_text(event["title"])  # 正規化をここでも確実に適用
        existing = supabase.table("events")\
            .select("id")\
            .eq("museum_id", event["museum_id"])\
            .eq("title", event["title"])\
            .limit(1)\
            .execute()
        
        # 挿入／更新にも正規化済みタイトルを使う
        event["title"] = normalized_title  

        if existing.data and len(existing.data) > 0:
            # UPDATE
            event_id = existing.data[0]["id"]
            result = supabase.table("events").update(event).eq("id", event_id).execute()
            action = "🔄 更新完了"
        else:
            # INSERT
            result = supabase.table("events").insert(event).execute()
            action = "🆕 新規登録"

        # 結果出力（成功 or エラー内容表示）
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
