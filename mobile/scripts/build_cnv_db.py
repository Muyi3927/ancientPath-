#!/usr/bin/env python3
"""Generate the 新译本 (CNV) SQLite database for the mobile app."""
from __future__ import annotations

import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "assets"
SOURCE_PATH = ASSETS_DIR / "新译本.txt"
REFERENCE_DB = ASSETS_DIR / "bible_cuv.db"
TARGET_DB = ASSETS_DIR / "bible_cnv.db"

# Precompile regexes once for performance.
CHAPTER_HEADING_RE = re.compile(r"^第([〇○零一二三四五六七八九十百千万两兩\d]+)(章|篇)")
VERSE_SPLIT_RE = re.compile(r"(\d{1,3})")


def chinese_to_int(token: str) -> int:
    """Convert a Chinese numeral string to an integer."""
    token = token.replace("兩", "二").replace("两", "二")
    if any(ch.isdigit() for ch in token):
        digits = "".join(ch for ch in token if ch.isdigit())
        return int(digits)

    numeral_map = {
        "零": 0,
        "〇": 0,
        "○": 0,
        "一": 1,
        "二": 2,
        "三": 3,
        "四": 4,
        "五": 5,
        "六": 6,
        "七": 7,
        "八": 8,
        "九": 9,
    }
    unit_map = {"十": 10, "百": 100, "千": 1000, "万": 10000}

    total = 0
    section = 0
    number = 0
    for ch in token:
        if ch in numeral_map:
            number = numeral_map[ch]
        elif ch in unit_map:
            unit = unit_map[ch]
            if unit == 10000:
                section = (section + (number or 0)) * unit
                total += section
                section = 0
            else:
                if number == 0:
                    if unit == 10 and section == 0:
                        number = 1
                    else:
                        number = 0
                section += number * unit
            number = 0
    return total + section + number


def normalise_text(text: str) -> str:
    """Trim verse text and collapse ideographic spaces."""
    cleaned = text.replace("\u3000", " ").strip()
    return re.sub(r"\s+", " ", cleaned)


def should_accept_verse(current: int, candidate: int) -> bool:
    """Heuristic to decide whether a numeric token is a verse index."""
    if candidate < 1 or candidate > 176:  # longest psalm has 176 verses
        return False
    if candidate == current:
        return True
    if candidate == current + 1:
        return True
    # Allow small backward jumps (common when verse numbers repeat within titles).
    if candidate == current - 1:
        return True
    # Permit larger jumps: some modern translations omit certain verses entirely.
    return candidate > current


def extract_verses(body: str) -> List[Tuple[int, str]]:
    """Extract (verse_number, text) pairs from a chapter body."""
    parts = VERSE_SPLIT_RE.split(body)
    verses: List[Tuple[int, str]] = []

    current_expected = 0
    index = 1
    while index < len(parts):
        token = parts[index]
        if token.isdigit():
            verse_no = int(token)
            previous = parts[index - 1] if index - 1 >= 0 else ""
            following = parts[index + 1] if index + 1 < len(parts) else ""
            prev_last = previous[-1] if previous else ""
            next_first = following[0] if following else ""

            if prev_last.isdigit():
                index += 1
                continue
            if next_first and (next_first.isdigit() or next_first in ":：-—"):
                index += 1
                continue
            if should_accept_verse(current_expected, verse_no):
                verses.append((verse_no, normalise_text(following)))
                current_expected = verse_no
                index += 2
                continue
        index += 1

    return verses


def load_book_metadata() -> Dict[str, sqlite3.Row]:
    """Load BibleID rows from the reference CUV database."""
    conn = sqlite3.connect(REFERENCE_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN"
    )
    rows = cur.fetchall()
    conn.close()

    mapping = {row["FullName"]: row for row in rows}
    # Provide aliases commonly used in 新译本标题。
    aliases = {
        "约翰一书": "约翰壹书",
        "约翰二书": "约翰贰书",
        "约翰三书": "约翰叁书",
        "启示录": "启示录",
    }
    for alias, canonical in aliases.items():
        if canonical in mapping:
            mapping[alias] = mapping[canonical]
    return mapping


def parse_source(book_info: Dict[str, sqlite3.Row]) -> Dict[int, Dict[int, List[Tuple[int, str]]]]:
    """Parse the source text into nested dictionaries keyed by book and chapter."""
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Missing source text: {SOURCE_PATH}")

    text = SOURCE_PATH.read_bytes().decode("gb18030")
    lines = text.splitlines()

    started = False
    current = None
    data: Dict[int, Dict[int, List[Tuple[int, str]]]] = defaultdict(lambda: defaultdict(list))

    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if not started:
            if stripped == "正文":
                started = True
            index += 1
            continue

        if not stripped:
            index += 1
            continue

        if stripped in book_info:
            current = book_info[stripped]
            index += 1
            continue

        if current and stripped.startswith("第"):
            chapter_lines: List[str] = [stripped]
            index += 1
            while index < len(lines):
                candidate = lines[index].strip()
                if not candidate:
                    break
                if candidate in book_info and book_info[candidate]["FullName"] != current["FullName"]:
                    break
                if candidate.startswith("第") and CHAPTER_HEADING_RE.match(candidate):
                    # Reached next chapter within same book.
                    break
                chapter_lines.append(candidate)
                index += 1

            chapter_text = "".join(chapter_lines)
            match = CHAPTER_HEADING_RE.match(chapter_text)
            if not match:
                raise ValueError(f"Chapter heading malformed: {chapter_text[:50]}")
            chapter_no = chinese_to_int(match.group(1))
            body = chapter_text[match.end() :]
            verses = extract_verses(body)
            if not verses:
                raise ValueError(
                    f"No verses found for {current['FullName']} chapter {chapter_no}: {body[:100]}"
                )
            data[current["SN"]][chapter_no] = verses
            continue

        index += 1

    return data


def create_database(metadata: Iterable[sqlite3.Row], verses: Dict[int, Dict[int, List[Tuple[int, str]]]]):
    if TARGET_DB.exists():
        TARGET_DB.unlink()

    conn = sqlite3.connect(TARGET_DB)
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE "BibleID" (
          [SN] INTEGER PRIMARY KEY,
          [KindSN] INTEGER,
          [ChapterNumber] INTEGER,
          [NewOrOld] NUMBER NOT NULL,
          [PinYin] CHAR(10),
          [ShortName] CHAR(10),
          [FullName] CHAR(20)
        );

        CREATE TABLE "Bible" (
          [ID] INTEGER NOT NULL PRIMARY KEY,
          [VolumeSN] INTEGER NOT NULL,
          [ChapterSN] INTEGER NOT NULL,
          [VerseSN] INTEGER NOT NULL,
          [Lection] CHAR(255),
          [SoundBegin] NUMBER,
          [SoundEnd] NUMBER
        );
        """
    )

    cur.executemany(
        "INSERT INTO BibleID (SN, KindSN, ChapterNumber, NewOrOld, PinYin, ShortName, FullName)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            (
                row["SN"],
                row["KindSN"],
                row["ChapterNumber"],
                row["NewOrOld"],
                row["PinYin"],
                row["ShortName"],
                row["FullName"],
            )
            for row in metadata
        ),
    )

    insert_sql = (
        "INSERT INTO Bible (ID, VolumeSN, ChapterSN, VerseSN, Lection, SoundBegin, SoundEnd)"
        " VALUES (?, ?, ?, ?, ?, NULL, NULL)"
    )
    pk = 1
    rows_to_insert: List[Tuple[int, int, int, int, str]] = []
    for book_sn in sorted(verses):
        chapters = verses[book_sn]
        for chapter_sn in sorted(chapters):
            for verse_sn, text in chapters[chapter_sn]:
                rows_to_insert.append((pk, book_sn, chapter_sn, verse_sn, text))
                pk += 1

    cur.executemany(insert_sql, rows_to_insert)
    conn.commit()
    conn.close()


def main():
    book_info = load_book_metadata()
    parsed = parse_source(book_info)

    # Sort metadata rows for deterministic output.
    conn = sqlite3.connect(REFERENCE_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM BibleID ORDER BY SN")
    metadata_rows = cur.fetchall()
    conn.close()

    create_database(metadata_rows, parsed)

    total_verses = sum(len(chapter_verses) for book in parsed.values() for chapter_verses in book.values())
    print(f"Created {TARGET_DB.relative_to(PROJECT_ROOT)} with {total_verses} verses.")


if __name__ == "__main__":
    main()
