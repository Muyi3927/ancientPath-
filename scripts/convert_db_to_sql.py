import sqlite3
import os

DB_PATH = 'public/bible_cuv.db'
SCHEMA_OUTPUT = 'backend/bible_schema.sql'
DATA_OUTPUT = 'backend/bible_data_cuv.sql'

def escape_string(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def generate_sql():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. 生成 Schema
    with open(SCHEMA_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("-- BibleID Table (Books)\n")
        f.write("CREATE TABLE IF NOT EXISTS BibleID (\n")
        f.write("    SN INTEGER PRIMARY KEY,\n")
        f.write("    KindSN INTEGER,\n")
        f.write("    ChapterNumber INTEGER,\n")
        f.write("    NewOrOld INTEGER,\n")
        f.write("    PinYin TEXT,\n")
        f.write("    ShortName TEXT,\n")
        f.write("    FullName TEXT\n")
        f.write(");\n\n")

        f.write("-- Bible Table (Verses)\n")
        f.write("CREATE TABLE IF NOT EXISTS Bible (\n")
        f.write("    ID INTEGER PRIMARY KEY,\n")
        f.write("    VolumeSN INTEGER,\n")
        f.write("    ChapterSN INTEGER,\n")
        f.write("    VerseSN INTEGER,\n")
        f.write("    Lection TEXT,\n")
        f.write("    SoundBegin REAL,\n")
        f.write("    SoundEnd REAL,\n")
        f.write("    Version TEXT DEFAULT 'cuv'\n") # Added Version column to support multiple versions in one table
        f.write(");\n\n")
        
        f.write("CREATE INDEX IF NOT EXISTS idx_bible_volume_chapter ON Bible(VolumeSN, ChapterSN);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_bible_version ON Bible(Version);\n")

    print(f"Generated schema at {SCHEMA_OUTPUT}")

    # 2. 生成 Data
    with open(DATA_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("-- Insert BibleID Data\n")
        cursor.execute("SELECT * FROM BibleID")
        rows = cursor.fetchall()
        for row in rows:
            # Row: SN, KindSN, ChapterNumber, NewOrOld, PinYin, ShortName, FullName
            values = f"{row[0]}, {row[1]}, {row[2]}, {row[3]}, {escape_string(row[4])}, {escape_string(row[5])}, {escape_string(row[6])}"
            f.write(f"INSERT OR IGNORE INTO BibleID VALUES ({values});\n")

        f.write("\n-- Insert Bible Data (CUV)\n")
        cursor.execute("SELECT * FROM Bible")
        rows = cursor.fetchall()
        
        # 使用批量插入以减小文件体积和提高速度
        batch_size = 500
        buffer = []
        
        for i, row in enumerate(rows):
            # Row: ID, VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd
            # Note: We are not inserting ID manually to avoid conflict if we merge ASV later, 
            # OR we keep ID but ensure they don't overlap?
            # Actually, let's keep original ID for now, but for multiple versions we might need a composite key or new ID.
            # For simplicity let's stick to the structure but add 'cuv' version.
            
            # To allow merging ASV later into the same table, we should probably ignore the original ID or handle it.
            # But wait, if we put ASV in the SAME table, ID will conflict if both start at 1.
            # Let's create a separate table for ASV or generate new IDs. 
            # Strategy: Use original data for now.
            
            lection = escape_string(row[4])
            values = f"({row[0]}, {row[1]}, {row[2]}, {row[3]}, {lection}, {row[5] if row[5] else 'NULL'}, {row[6] if row[6] else 'NULL'}, 'cuv')"
            buffer.append(values)
            
            if len(buffer) >= batch_size:
                f.write(f"INSERT OR IGNORE INTO Bible (ID, VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd, Version) VALUES {','.join(buffer)};\n")
                buffer = []
        
        if buffer:
            f.write(f"INSERT OR IGNORE INTO Bible (ID, VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd, Version) VALUES {','.join(buffer)};\n")

    print(f"Generated data at {DATA_OUTPUT}")
    conn.close()

generate_sql()
