import sqlite3

DB_PATH = 'public/ASV.db'
DATA_OUTPUT = 'backend/bible_data_asv.sql'

def escape_string(s):
    if s is None: return "NULL"
    return "'" + s.replace("'", "''") + "'"

def generate_asv_sql():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    with open(DATA_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("-- Insert Bible Data (ASV)\n")
        cursor.execute("SELECT book_id, chapter, verse, text FROM ASV_verses")
        rows = cursor.fetchall()
        
        for row in rows:
            # Mapping ASV to our Bible table schema
            # VolumeSN, ChapterSN, VerseSN, Lection, Version
            # 使用单行插入，避免一行太长导致 Cloudflare 处理失败
            values = f"({row[0]}, {row[1]}, {row[2]}, {escape_string(row[3])}, 'asv')"
            f.write(f"INSERT INTO Bible (VolumeSN, ChapterSN, VerseSN, Lection, Version) VALUES {values};\n")
            
    print(f"Generated ASV data at {DATA_OUTPUT}")
    conn.close()

generate_asv_sql()
