#!/usr/bin/env python3
"""Build mobile/assets/bible_ncv.db from bible_data_ncv.sql.

The generated database matches the schema expected by mobile/services/BibleDatabase.ts
for the `ncv` version:
- BibleID table from the reference CUV database
- Bible table with ID, VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "assets"

SOURCE_SQL = ASSETS_DIR / "bible_data_ncv.sql"
REFERENCE_DB = ASSETS_DIR / "bible_cuv.db"
TARGET_DB = ASSETS_DIR / "bible_ncv.db"


def validate_inputs() -> None:
    if not SOURCE_SQL.exists():
        raise FileNotFoundError(f"Missing source sql: {SOURCE_SQL}")
    if not REFERENCE_DB.exists():
        raise FileNotFoundError(f"Missing reference db: {REFERENCE_DB}")


def load_bibleid_rows() -> list[sqlite3.Row]:
    conn = sqlite3.connect(REFERENCE_DB)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT SN, KindSN, ChapterNumber, NewOrOld, PinYin, ShortName, FullName "
            "FROM BibleID ORDER BY SN"
        ).fetchall()
    finally:
        conn.close()
    return rows


def build_database(bibleid_rows: list[sqlite3.Row]) -> int:
    if TARGET_DB.exists():
        TARGET_DB.unlink()

    conn = sqlite3.connect(TARGET_DB)
    try:
        cur = conn.cursor()
        cur.executescript(
            """
            PRAGMA journal_mode = OFF;
            PRAGMA synchronous = OFF;

            CREATE TABLE "BibleID" (
              [SN] INTEGER PRIMARY KEY,
              [KindSN] INTEGER,
              [ChapterNumber] INTEGER,
              [NewOrOld] NUMBER NOT NULL,
              [PinYin] CHAR(10),
              [ShortName] CHAR(10),
              [FullName] CHAR(20)
            );
            CREATE UNIQUE INDEX [PY] ON "BibleID" ([PinYin]);

            CREATE TABLE "Bible" (
              [ID] INTEGER NOT NULL PRIMARY KEY,
              [VolumeSN] INTEGER NOT NULL,
              [ChapterSN] INTEGER NOT NULL,
              [VerseSN] INTEGER NOT NULL,
              [Lection] CHAR(255),
              [SoundBegin] NUMBER,
              [SoundEnd] NUMBER
            );
            CREATE INDEX [F_ChapterNum] ON "Bible" ([ChapterSN]);
            CREATE INDEX [F_SectionNum] ON "Bible" ([VerseSN]);
            CREATE INDEX [F_VolumeSN] ON "Bible" ([VolumeSN]);

            CREATE TABLE "BibleImport" (
              [VolumeSN] INTEGER NOT NULL,
              [ChapterSN] INTEGER NOT NULL,
              [VerseSN] INTEGER NOT NULL,
              [Lection] CHAR(255),
              [Version] CHAR(10)
            );
            """
        )

        cur.executemany(
            "INSERT INTO BibleID (SN, KindSN, ChapterNumber, NewOrOld, PinYin, ShortName, FullName) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    row["SN"],
                    row["KindSN"],
                    row["ChapterNumber"],
                    row["NewOrOld"],
                    row["PinYin"],
                    row["ShortName"],
                    row["FullName"],
                )
                for row in bibleid_rows
            ],
        )

        sql_text = SOURCE_SQL.read_text(encoding="utf-8")
        import_sql = sql_text.replace(
            "INSERT INTO Bible (",
            "INSERT INTO BibleImport (",
        )
        cur.executescript(import_sql)

        cur.execute(
            """
            INSERT INTO Bible (VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd)
            SELECT VolumeSN, ChapterSN, VerseSN, Lection, NULL, NULL
            FROM BibleImport
            ORDER BY VolumeSN, ChapterSN, VerseSN, rowid
            """
        )
        cur.execute("DROP TABLE BibleImport")

        verse_count = cur.execute("SELECT COUNT(*) FROM Bible").fetchone()[0]
        conn.commit()
        return int(verse_count)
    finally:
        conn.close()


def main() -> None:
    validate_inputs()
    bibleid_rows = load_bibleid_rows()
    verse_count = build_database(bibleid_rows)

    print(f"Created {TARGET_DB.relative_to(PROJECT_ROOT)}")
    print(f"BibleID rows: {len(bibleid_rows)}")
    print(f"Bible rows: {verse_count}")


if __name__ == "__main__":
    main()
