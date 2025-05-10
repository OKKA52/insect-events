import requests
from bs4 import BeautifulSoup
import re
import unicodedata
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import os
import json, os
from dotenv import load_dotenv
from datetime import datetime
from bs4 import BeautifulSoup, NavigableString, Tag
from bs4 import NavigableString, Tag

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

MUSEUM_ID = "6b5f53e2-23b9-4ad4-9838-374c3beb1a4f"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def wareki_to_seireki(text: str) -> str:
    def repl(m):
        era_year = int(m.group(1))
        month    = int(m.group(2))
        day      = int(m.group(3))
        seireki_year = 2018 + era_year
        return f"{seireki_year}年{month}月{day}日"
    return re.sub(r"令和(\d{1,2})年(\d{1,2})月(\d{1,2})日", repl, text)

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
    # 和暦→西暦
    text = wareki_to_seireki(text)

    # ――― ① 西暦付きパターン ―――
    parts = re.findall(r"(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    if parts:
        # 開始日のみ西暦パターンで取得
        y1, m1, d1 = map(int, parts[0])
        start = f"{y1}/{m1:02d}/{d1:02d}"

        # 終了日：もし同じパターンで２つ以上ヒットすれば西暦付き終了日を使う
        if len(parts) > 1:
            y2, m2, d2 = map(int, parts[1])
            end = f"{y2}/{m2:02d}/{d2:02d}"
        else:
            # ③ 月日だけパターンを探して補完
            md = re.findall(r"(\d{1,2})月(\d{1,2})日", text)
            if len(md) > 1:
                # 2つめを終了日とする
                m2, d2 = map(int, md[1])
                # 年推測ロジックを流用
                today = datetime.now()
                def infer_year(month: int):
                    if today.month >= 10 and month <= 3:
                        return today.year + 1
                    return today.year
                y2 = infer_year(m2)
                end = f"{y2}/{m2:02d}/{d2:02d}"
            else:
                end = start

        return start, end

    # ――― ② 年指定なし（月日だけのパターン） ―――
    md = re.findall(r"(\d{1,2})月(\d{1,2})日", text)
    if md:
        today = datetime.now()
        current_year  = today.year

        def infer_year(month: int):
            # たとえば、10月以降に1～3月なら翌年、それ以外は今年
            if today.month >= 10 and month <= 3:
                return current_year + 1
            return current_year

        # 開始日
        m1, d1 = map(int, md[0])
        y1 = infer_year(m1)
        start = f"{y1}/{m1:02d}/{d1:02d}"

        # 終了日（あれば）
        if len(md) > 1:
            m2, d2 = map(int, md[1])
            y2 = infer_year(m2)
            end = f"{y2}/{m2:02d}/{d2:02d}"
        else:
            end = start

        return start, end

    # ③ どちらにもマッチしなかったら None
    return None, None

def fetch_events():
    events = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://kansatukan.jp/event.html")
        page.wait_for_selector("h2")

        soup = BeautifulSoup(page.content(), "html.parser")

        for title_el in soup.find_all("h2"):
            title = clean_text(title_el.get_text())
            if not title or not any(tok in title for tok in ["企画展", "自然観察会", "スポット展"]):
                continue

            # ── ブロック丸ごと作成 ──
            block_parts = []
            for sib in title_el.next_siblings:
                if isinstance(sib, Tag) and sib.name == "h2":
                    break
                if isinstance(sib, NavigableString):
                    block_parts.append(sib.strip())
                elif isinstance(sib, Tag):
                    block_parts.append(sib.get_text(separator=" ").strip())
            block = " ".join(block_parts)

            # ── 絵手紙教室だけは [ 日時 ] 以降に絞る ──
            if "絵手紙に挑戦2" in title:
                if "[ 日時 ]" in block:
                    block = block.split("[ 日時 ]", 1)[1]
            # ── 申込み以降は常に削除 ──
            block = re.sub(r"\[\s*申込み[^\]]*\].*$", "", block, flags=re.MULTILINE)

            # ── 日付パターン抽出 ──
            # ① 範囲表記
            m = re.search(
                r"(?:令和\d{1,2}年)?\d{1,2}月\d{1,2}日"
                r"[^0-9\n]{0,6}[～~][^0-9\n]{0,6}"
                r"(?:令和\d{1,2}年)?\d{1,2}月\d{1,2}日",
                block
            )
            if not m:
                # ② 単一日付
                m = re.search(r"(?:令和\d{1,2}年)?\d{1,2}月\d{1,2}日", block)
            if not m:
                print(f"⚠️ 日付パース失敗 → スキップ: {title}")
                continue
            raw = m.group(0)

            # ── 3) クリーンアップしてパース ──
            txt = clean_text(raw)
            txt = re.sub(r"[（\(].*?[）\)]", "", txt)
            print(f"[DEBUG final txt] {txt!r}")

            start_date, end_date = parse_date_range_ht(txt)
            if not start_date:
                print(f"⚠️ 日付→西暦変換失敗 → スキップ: {title}")
                continue

            # ── 4) 除外キーワード判定 ──
            if any(kw in title for kw in EXCLUDE_KEYWORDS):
                print(f"⚠️ 除外ワード検出 → スキップ: {title}")
                continue

            # ── 5) 説明文抽出 ──
            desc_parts = []
            for sib in title_el.next_siblings:
                if isinstance(sib, Tag) and sib.name == "h2":
                    break
                text = sib.get_text(separator=" ") if isinstance(sib, Tag) else str(sib)
                desc_parts.append(clean_text(text))
            description = remove_duplicate_sentences(" ".join(desc_parts))

            # ── イベント登録データ作成 ──
            events.append({
                "title": title,
                "museum_id": MUSEUM_ID,
                "start_date": start_date,
                "end_date": end_date,
                "event_description": description,
                "event_url": page.url,
            })

        browser.close()

    print(f"📦 全イベント数: {len(events)}")
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
