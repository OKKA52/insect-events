import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
with open(os.path.join(BASE_DIR, "exclude_keywords.json"), "r", encoding="utf-8") as f:
    EXCLUDE_KEYWORDS = json.load(f)

dotenv_path = os.path.join(BASE_DIR, ".env.test")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("✅ URL =", SUPABASE_URL)
print("✅ KEY =", '[OK]' if SUPABASE_KEY else '[MISSING]')

MUSEUM_ID = "5fc0a4d6-2c29-45f7-a9f5-390f943f5270"

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
    # まず曜日（例: "日曜日"）を削除
    text = re.sub(r"\([^\)]*\)", "", text).strip()

    # 日付範囲（例: "5月3日~5日"）を抽出
    match = re.findall(r"(\d{1,2})月(\d{1,2})日\s*~\s*(\d{1,2})月(\d{1,2})日", text)

    if match:
        today = datetime.now()
        current_year = today.year

        # 開始日と終了日を設定
        start_month, start_day = map(int, match[0][0:2])
        end_month, end_day = map(int, match[0][2:4])

        start_year = current_year
        end_year = current_year

        start = f"{start_year}/{start_month:02d}/{start_day:02d}"
        end = f"{end_year}/{end_month:02d}/{end_day:02d}"

        print(f"解析された日付範囲: 開始日 {start}, 終了日 {end}")  # デバッグ用

        return start, end

    # 範囲が見つからない場合（単一日付の解析など）
    match_single = re.findall(r"(\d{1,2})月(\d{1,2})日", text)
    if match_single:
        # 単一日付の場合
        start_month, start_day = map(int, match_single[0])
        today = datetime.now()
        current_year = today.year

        start = f"{current_year}/{start_month:02d}/{start_day:02d}"
        end = start  # 単一の日付として終了日も同じに設定

        print(f"単一日付解析: 開始日 {start}, 終了日 {end}")  # デバッグ用

        return start, end

    # 複数日付の場合、最初と最後の日付を抽出
    match_multiple = re.findall(r"(\d{1,2})月(\d{1,2})日", text)
    if match_multiple:
        start_month, start_day = map(int, match_multiple[0])
        end_month, end_day = map(int, match_multiple[-1])

        today = datetime.now()
        current_year = today.year

        start = f"{current_year}/{start_month:02d}/{start_day:02d}"
        end = f"{current_year}/{end_month:02d}/{end_day:02d}"

        print(f"複数日付解析: 開始日 {start}, 終了日 {end}")  # デバッグ用

        return start, end

    print(f"日付範囲が見つかりませんでした: {text}")
    return None, None

def fetch_events():
    url = "https://www.city.tainai.niigata.jp/kurashi/kyoiku/bunka-sports/insect/kyousitsu/kyousitsu.html"
    res = requests.get(url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")

    events = []

    # イベントリストを取得
    event_elements = soup.find_all("h3")  # h3タグ内にイベントタイトルがある
    print(f"イベントが {len(event_elements)} 件見つかりました")  # デバッグ用

    for event in event_elements:
        title = clean_text(event.text)  # タイトルを抽出
        print(f"イベントタイトル: {title}")  # デバッグ用

        # イベント日付を取得（h3タグ内に日付が含まれている）
        date_text = event.find_next("span", class_="txt_small")
        if date_text:
            date_range = clean_text(date_text.text)
            print(f"日付範囲: {date_range}")  # デバッグ用
            start_date, end_date = parse_date_range(date_range)

            description = ""  # 説明文がない場合もあるので、デフォルトは空文字

            # イベントの詳細情報を取得
            details = event.find_next("p")  # 次のpタグにイベント詳細が含まれる
            if details:
                description = clean_text(details.text)

            # 重複除去
            description = remove_duplicate_sentences(description)

            # ① 別ファイルのリストで除外判定
            if any(kw in title for kw in EXCLUDE_KEYWORDS):
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
        existing = supabase.table("events")\
            .select("id")\
            .eq("museum_id", event["museum_id"])\
            .eq("title", event["title"])\
            .limit(1)\
            .execute()

        event["title"] = normalized_title  

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
