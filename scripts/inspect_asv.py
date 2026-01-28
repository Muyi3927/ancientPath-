import sqlite3
import os

def inspect_asv(db_path):
    print(f"Inspecting {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        for table in tables:
            print(f"\n--- {table[0]} structure ---")
            cursor.execute(f"PRAGMA table_info({table[0]})")
            print(cursor.fetchall())
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

inspect_asv('public/ASV.db')
