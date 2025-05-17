# src/lib/supabase_client.py

import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("環境変数 SUPABASE_URL または SUPABASE_KEY が未設定です")

supabase = create_client(url, key)
