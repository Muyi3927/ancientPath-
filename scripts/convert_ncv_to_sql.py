#!/usr/bin/env python3
"""
将 public/圣经新译本.epub（圣经新译本）转换为 SQL 插入语句。
输出文件：backend/bible_data_ncv.sql
用法：python3 scripts/convert_ncv_to_sql.py
"""

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from typing import Iterable

INPUT_FILE = 'public/圣经新译本.epub'
OUTPUT_FILE = 'backend/bible_data_ncv.sql'
VERSION = 'ncv'

# ── 书卷名 → VolumeSN (1-66) ─────────────────────────────────────────
BOOK_SN: dict[str, int] = {
    '创世记': 1, '出埃及记': 2, '利未记': 3, '民数记': 4, '申命记': 5,
    '约书亚记': 6, '士师记': 7, '路得记': 8, '撒母耳记上': 9, '撒母耳记下': 10,
    '列王纪上': 11, '列王纪下': 12, '历代志上': 13, '历代志下': 14, '以斯拉记': 15,
    '尼希米记': 16, '以斯帖记': 17, '约伯记': 18, '诗篇': 19, '箴言': 20,
    '传道书': 21, '雅歌': 22, '以赛亚书': 23, '耶利米书': 24, '耶利米哀歌': 25,
    '以西结书': 26, '但以理书': 27, '何西阿书': 28, '约珥书': 29, '阿摩司书': 30,
    '俄巴底亚书': 31, '约拿书': 32, '弥迦书': 33, '那鸿书': 34, '哈巴谷书': 35,
    '西番雅书': 36, '哈该书': 37, '撒迦利亚书': 38, '玛拉基书': 39,
    '马太福音': 40, '马可福音': 41, '路加福音': 42, '约翰福音': 43, '使徒行传': 44,
    '罗马书': 45, '哥林多前书': 46, '哥林多后书': 47, '加拉太书': 48, '以弗所书': 49,
    '腓立比书': 50, '歌罗西书': 51, '帖撒罗尼迦前书': 52, '帖撒罗尼迦后书': 53,
    '提摩太前书': 54, '提摩太后书': 55, '提多书': 56, '腓利门书': 57, '希伯来书': 58,
    '雅各书': 59, '彼得前书': 60, '彼得后书': 61, '约翰一书': 62, '约翰二书': 63,
    '约翰三书': 64, '犹大书': 65, '启示录': 66,
}

BOOK_ALIASES = {
    '创世纪': '创世记',
    '撒加利亚书': '撒迦利亚书',
    '约翰壹书': '约翰一书',
    '约翰贰书': '约翰二书',
    '约翰叁书': '约翰三书',
}

# ── 中文数字 → int ────────────────────────────────────────────────────
CN_DIGIT = {'〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
            '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}


def chinese_to_int(s: str) -> int:
    s = s.strip()
    if not s:
        return 0
    result = 0
    if '百' in s:
        left, right = s.split('百', 1)
        result += (CN_DIGIT.get(left, 1) if left else 1) * 100
        s = right
    if s.startswith(('零', '〇')):
        s = s[1:]
    if '十' in s:
        left, right = s.split('十', 1)
        result += (CN_DIGIT.get(left, 1) if left else 1) * 10
        s = right
    if s:
        result += CN_DIGIT.get(s, 0)
    return result


def local_name(tag: str) -> str:
    return tag.split('}', 1)[-1]


CHAPTER_HEADER_RE = re.compile(r'^第([一二三四五六七八九十百〇零]+)[章篇]$')
VERSE_HEAD_RE = re.compile(r'^(\d{1,3})\s*[\u3000 ]+(.+)$')
INLINE_VERSE_MARK_RE = re.compile(r'(\d{1,3})\s*[\u3000 ]+')
CROSS_REF_HEADING_RE = re.compile(r'（[^）]*\d+[:：][^）]*）')


def normalize_text(text: str) -> str:
    text = text.replace('\r', '\n')
    text = text.replace('\u3000', ' ')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def split_inline_verses(text: str) -> list[tuple[int, str]]:
    """Split a paragraph that may contain multiple verse markers.

    Example: "1 ... 2 ..." -> [(1, "..."), (2, "...")]
    """
    chunks: list[tuple[int, str]] = []
    matches = list(INLINE_VERSE_MARK_RE.finditer(text))
    if not matches:
        return chunks

    # Require first verse marker to be at paragraph start (or after one space)
    first = matches[0]
    if first.start() > 1:
        return chunks

    for idx, m in enumerate(matches):
        verse_sn = int(m.group(1))
        content_start = m.end()
        content_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        content = normalize_text(text[content_start:content_end])
        if content:
            chunks.append((verse_sn, content))
    return chunks


def should_accept_next_verse(current_verse: int | None, candidate: int) -> bool:
    if candidate < 1 or candidate > 176:
        return False
    if current_verse is None:
        return True
    if candidate == current_verse + 1:
        return True
    # 允许少量跳节（译本偶尔有节号差异），避免把括号里的数字误识别为回退节号。
    if candidate > current_verse + 1 and candidate - current_verse <= 5:
        return True
    return False


def is_section_heading(text: str) -> bool:
    """Heuristic for pericope/section headings between verses."""
    if CROSS_REF_HEADING_RE.search(text):
        return True
    if len(text) <= 24 and not re.search(r'[。！？；]$', text):
        # 短句且无句末标点，通常是小标题。
        return True
    return False


def parse_chapter_paragraphs(paragraphs: Iterable[str]) -> list[tuple[int, str]]:
    verses: list[tuple[int, str]] = []
    current_verse: int | None = None

    for raw in paragraphs:
        text = normalize_text(raw)
        if not text:
            continue

        # 常见的小标题（含括号交叉引用）直接跳过。
        if current_verse is None and not text[:1].isdigit():
            continue

        split_chunks = split_inline_verses(text)
        if split_chunks:
            for verse_sn, content in split_chunks:
                if should_accept_next_verse(current_verse, verse_sn):
                    verses.append((verse_sn, content))
                    current_verse = verse_sn
                elif verses:
                    # 不是合理的新节号，视为上一节续文。
                    last_sn, last_text = verses[-1]
                    verses[-1] = (last_sn, normalize_text(f"{last_text} {verse_sn} {content}"))
            continue

        if is_section_heading(text):
            continue

        # 没有节号时，若已有上一节，则视作续文（可覆盖括号注释独立成段的情况）。
        if verses:
            last_sn, last_text = verses[-1]
            verses[-1] = (last_sn, normalize_text(f"{last_text} {text}"))

    return verses


def parse_epub_records(epub_path: str) -> list[tuple[int, int, int, str]]:
    records: list[tuple[int, int, int, str]] = []

    with zipfile.ZipFile(epub_path, 'r') as zf:
        opf_root = ET.fromstring(zf.read('content.opf'))
        ns = {'opf': 'http://www.idpf.org/2007/opf'}

        manifest = {
            item.attrib['id']: item.attrib['href']
            for item in opf_root.findall('.//opf:manifest/opf:item', ns)
            if 'id' in item.attrib and 'href' in item.attrib
        }
        spine = [
            itemref.attrib['idref']
            for itemref in opf_root.findall('.//opf:spine/opf:itemref', ns)
            if 'idref' in itemref.attrib
        ]

        for idref in spine:
            href = manifest.get(idref, '')
            if not href.endswith(('.html', '.xhtml')):
                continue

            try:
                root = ET.fromstring(zf.read(href))
            except Exception:
                continue

            lines: list[tuple[str, str]] = []
            h3_candidates: list[str] = []

            for elem in root.iter():
                tag = local_name(elem.tag)
                if tag in ('h3', 'p'):
                    text = ''.join(elem.itertext()).strip()
                    if not text:
                        continue
                    lines.append((tag, text))
                    if tag == 'h3':
                        h3_candidates.append(text)

            # 书卷名：优先取 h3 中命中的书卷
            book_name: str | None = None
            for candidate in h3_candidates:
                normalized = BOOK_ALIASES.get(candidate, candidate)
                if normalized in BOOK_SN:
                    book_name = normalized
                    break

            if not book_name:
                continue

            # 章节号：取第一个“第X章/篇”
            chapter_number: int | None = None
            start_idx = -1
            for idx, (_, text) in enumerate(lines):
                m = CHAPTER_HEADER_RE.match(text)
                if m:
                    chapter_number = chinese_to_int(m.group(1))
                    start_idx = idx + 1
                    break

            if chapter_number is None or start_idx < 0:
                continue

            volume_sn = BOOK_SN[book_name]
            chapter_paragraphs = [text for _, text in lines[start_idx:]]
            chapter_verses = parse_chapter_paragraphs(chapter_paragraphs)
            for verse_sn, lection in chapter_verses:
                records.append((volume_sn, chapter_number, verse_sn, lection))

    return records


def esc(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main():
    input_file = INPUT_FILE
    output_file = OUTPUT_FILE
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]

    records = parse_epub_records(input_file)

    print(f'解析完成，共 {len(records)} 节经文。', file=sys.stderr)

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write('-- Bible data: 圣经新译本 (NCV)\n')
        out.write('-- Auto-generated by convert_ncv_to_sql.py (EPUB parser)\n')
        out.write(f'-- Total verses: {len(records)}\n\n')
        for vol, chap, verse, lection in records:
            out.write(
                f"INSERT INTO Bible (VolumeSN, ChapterSN, VerseSN, Lection, Version) "
                f"VALUES ({vol}, {chap}, {verse}, {esc(lection)}, {esc(VERSION)});\n"
            )

    print(f'SQL 已输出到 {output_file}', file=sys.stderr)

    # ── 章节数校验 ───────────────────────────────────────────────────
    book_chap_count: dict[int, set[int]] = defaultdict(set)
    for vol, chap, _, __ in records:
        book_chap_count[vol].add(chap)

    expected_chapters = {
        1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
        11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
        21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
        31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
        40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6,
        50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5,
        60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22,
    }

    print('\n── 章节数校验 ──', file=sys.stderr)
    errors = 0
    for sn in range(1, 67):
        got = len(book_chap_count.get(sn, set()))
        exp = expected_chapters[sn]
        if got != exp:
            errors += 1
            print(f'  SN{sn:2d}: {got} 章  (期望 {exp})', file=sys.stderr)

    if errors == 0:
        print('  ✓ 全部 66 卷章节数正确！', file=sys.stderr)
    else:
        print(f'\n  共 {errors} 卷章节数有误。', file=sys.stderr)

    # ── 节数抽查 ─────────────────────────────────────────────────────
    spot_checks = [
        (1, 1, 31, '创世记第1章'),
        (19, 119, 176, '诗篇第119篇'),
        (19, 1, 6, '诗篇第1篇'),
        (66, 22, 21, '启示录第22章'),
        (40, 5, 48, '马太福音第5章'),
    ]
    print('\n── 节数抽查 ──', file=sys.stderr)
    for vol, chap, exp_v, label in spot_checks:
        count = sum(1 for r in records if r[0] == vol and r[1] == chap)
        status = '✓' if count == exp_v else f'✗ 期望{exp_v}'
        print(f'  {label}: {count} 节  {status}', file=sys.stderr)


if __name__ == '__main__':
    main()
