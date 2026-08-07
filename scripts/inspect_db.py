import sqlite3
import os

def inspect_db(db_path):
    print(f"Inspecting {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 获取所有表名
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            table_name = table[0]
            print(f"\n--- Structure of table '{table_name}' ---")
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            for col in columns:
                print(col)
            
            # 打印前几行数据看看
            print(f"\n--- First 3 rows of '{table_name}' ---")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                print(row)
                
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

inspect_db('public/bible_cuv.db')
