import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import os
import json

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

MUSEUM_ID = "a7164302-db2e-486b-837b-d2674e906455"  # 必要なIDに変更

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_text(text):
    if not text:
        return ""
    text = text.strip()
    return text

# 日本語の月日を西暦の形式に変換
def convert_japanese_date_to_standard(text):
    # 日本語の月日を "5月10日(土)" のように書かれた形式を "2025/05/10" へ変換
    month_map = {
        '1月': '01', '2月': '02', '3月': '03', '4月': '04', '5月': '05', '6月': '06',
        '7月': '07', '8月': '08', '9月': '09', '10月': '10', '11月': '11', '12月': '12'
    }

    # "月" や "日" の後に余分な空白を削除
    # 曜日 (例: (土)) やその他の文字を削除するために正規表現を使用
    date_pattern = re.compile(r'(\d{1,2})月(\d{1,2})日.*')
    match = date_pattern.search(text)
    
    if match:
        month = month_map.get(f"{match.group(1)}月", "01")  # 月のマッピング
        day = match.group(2).zfill(2)  # 日付を2桁にフォーマット
        return f"2025/{month}/{day}"  # 例: 2025/05/10
    return None

def parse_date_range(text):
    # 例: "5月10 日(土)" → "2025/05/10"
    date = convert_japanese_date_to_standard(text)
    if date:
        return date, date  # 開始日と終了日が同じ場合は一度の値を返す
    return None, None

def fetch_events():
    events = []
    url = "https://shizen.spec.ed.jp/イベント"  # 埼玉県立自然の博物館のURLに変更
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    # イベント情報が入っている<div>を取得
    items = soup.find_all("div", class_="Box80-20 clear")
    if not items:
        print("📭 イベントが見つかりませんでした。ページ終了。")
        return []

    for item in items:
        # タイトルを取得
        title_el = item.select_one("p.Title")
        title = clean_text(title_el.text if title_el else "")

        # 期間を取得
        duration_el = item.select_one("p.Duration")
        duration = clean_text(duration_el.text if duration_el else "")

        # 詳細を取得
        description_el = item.select_one("p:nth-of-type(3)")  # 最初の詳細部分を取得
        description = clean_text(description_el.text if description_el else "")

        # 除外ワードがタイトルに含まれているかチェック
        if any(keyword in title for keyword in EXCLUDE_KEYWORDS):  # リストに直接アクセス
            print(f"⚠️ 除外ワード検出 → スキップ: {title}")
            continue  # 除外ワードが含まれている場合はスキップ

        # 日本語の日付形式を標準の日付形式に変換
        start_date, end_date = parse_date_range(duration)  # duration を変換

        if title and start_date:
            events.append({
                "title": title,
                "museum_id": MUSEUM_ID,
                "start_date": start_date,  # 正しい日付形式を使用
                "end_date": end_date,  # 同様に終了日も正しい形式
                "event_description": description,
                "event_url": url,
            })

    return events

def save_to_supabase(events):
    for event in events:
        normalized_title = clean_text(event["title"])  # 正規化をここでも確実に適用
        event["title"] = normalized_title

        existing = supabase.table("events")\
            .select("id")\
            .eq("museum_id", event["museum_id"])\
            .eq("title", event["title"])\
            .eq("start_date", event["start_date"])\
            .limit(1)\
            .execute()

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
