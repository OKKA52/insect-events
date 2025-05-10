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

# スクリプト位置からルートの .env.test を参照
dotenv_path = os.path.join(BASE_DIR, ".env.test")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("✅ URL =", SUPABASE_URL)
print("✅ KEY =", '[OK]' if SUPABASE_KEY else '[MISSING]')

MUSEUM_ID = "850c696f-c867-453a-9bf5-b4b9ceec9bed"  # 必要なIDに変更

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_text(text):
    if not text:
        return ""
    text = text.strip()
    return text

def convert_japanese_date_to_standard(text):
    # 月の名前を番号に変換
    month_map = {
        '1月': '01', '2月': '02', '3月': '03', '4月': '04', '5月': '05', '6月': '06',
        '7月': '07', '8月': '08', '9月': '09', '10月': '10', '11月': '11', '12月': '12'
    }

    # "年", "月", "日" を削除して年月日を抽出
    date_pattern = re.compile(r'(\d{4})年(\d{1,2})月(\d{1,2})日')
    match = date_pattern.search(text)
    
    if match:
        year = match.group(1)
        month = match.group(2).zfill(2)  # 月が1桁でも2桁に変換
        day = match.group(3).zfill(2)   # 日付を2桁にフォーマット
        result = f"{year}-{month}-{day}"  # 例: 2025-07-22
        print(f"デバッグ: {text} → {result}")  # デバッグ: 実際の変換を確認
        return result
    return None

# 期間を取得して日付範囲を変換する関数
def parse_date_range(text):
    # 日付範囲が「 - 」で分割されている場合、日付の前後の空白を取り除いて分割
    dates = [date.strip() for date in text.split(' - ')]
    if len(dates) == 2:
        # 日付の順番が逆転していないか確認
        start_date = convert_japanese_date_to_standard(dates[0])
        end_date = convert_japanese_date_to_standard(dates[1])

        # デバッグ: 取得した日付を確認
        print(f"デバッグ: 取得した日付範囲: {start_date} ～ {end_date}")

        if start_date and end_date:
            # 日付の逆転を検出
            if start_date > end_date:
                print(f"⚠️ 日付順番が逆転しました: {start_date} > {end_date}")
                start_date, end_date = end_date, start_date  # 日付を交換

            return start_date, end_date
        
    return None, None

def fetch_events():
    events = []
    url = "https://kameimuseum.or.jp/schedule/"  # 亀井博物館のイベントページURL
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    # イベント情報が入っている<div>を取得
    items = soup.find_all("div", class_="list_wrap")  # イベント情報が含まれる div を変更
    if not items:
        print("📭 イベントが見つかりませんでした。ページ終了。")
        return []

    for item in items:
        # "蝶"が含まれるか確認
        category_el = item.select_one("span.cat_nenkan")
        if category_el and "蝶" not in category_el.text:
            continue  # "蝶"が含まれていない場合、スキップ

        # タイトルを取得
        title_el = item.select_one("h4")
        title = clean_text(title_el.text if title_el else "")

        # 期間を取得 (日付範囲)
        duration_el = item.select_one("span.date_nenkan")
        if duration_el:
            duration = clean_text(duration_el.text)
            start_date, end_date = parse_date_range(duration)  # 日付範囲の変換

        # 詳細を取得
        description_el = item.select_one("p")
        description = clean_text(description_el.text if description_el else "")

        # 除外ワードがタイトルに含まれているかチェック
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
        normalized_title = clean_text(event["title"])  # 正規化をここでも確実に適用
        event["title"] = normalized_title

        existing = supabase.table("events") \
            .select("id") \
            .eq("museum_id", event["museum_id"]) \
            .eq("title", event["title"]) \
            .eq("start_date", event["start_date"]) \
            .limit(1) \
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
