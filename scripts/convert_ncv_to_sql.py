#!/usr/bin/env python3
"""
将 public/新译本.txt（GBK编码，圣经新译本）转换为 SQL 插入语句。
输出文件：backend/bible_data_ncv.sql
用法：python3 scripts/convert_ncv_to_sql.py
"""

import re
import sys
from collections import defaultdict

INPUT_FILE  = 'public/新译本.txt'
OUTPUT_FILE = 'backend/bible_data_ncv.sql'
VERSION     = 'ncv'

# ── 书卷名 → VolumeSN (1-66) ─────────────────────────────────────────
BOOK_SN: dict[str, int] = {
    '创世记': 1,   '出埃及记': 2,  '利未记': 3,   '民数记': 4,   '申命记': 5,
    '约书亚记': 6, '士师记': 7,   '路得记': 8,   '撒母耳记上': 9,  '撒母耳记下': 10,
    '列王纪上': 11, '列王纪下': 12, '历代志上': 13, '历代志下': 14, '以斯拉记': 15,
    '尼希米记': 16, '以斯帖记': 17, '约伯记': 18, '诗篇': 19,   '箴言': 20,
    '传道书': 21,  '雅歌': 22,   '以赛亚书': 23, '耶利米书': 24, '耶利米哀歌': 25,
    '以西结书': 26, '但以理书': 27, '何西阿书': 28, '约珥书': 29, '阿摩司书': 30,
    '俄巴底亚书': 31, '约拿书': 32, '弥迦书': 33, '那鸿书': 34, '哈巴谷书': 35,
    '西番雅书': 36, '哈该书': 37,
    '撒迦利亚书': 38, '撒加利亚书': 38,
    '玛拉基书': 39,
    '马太福音': 40, '马可福音': 41, '路加福音': 42, '约翰福音': 43, '使徒行传': 44,
    '罗马书': 45,  '哥林多前书': 46, '哥林多后书': 47, '加拉太书': 48, '以弗所书': 49,
    '腓立比书': 50, '歌罗西书': 51, '帖撒罗尼迦前书': 52, '帖撒罗尼迦后书': 53,
    '提摩太前书': 54, '提摩太后书': 55, '提多书': 56, '腓利门书': 57, '希伯来书': 58,
    '雅各书': 59, '彼得前书': 60, '彼得后书': 61,
    '约翰一书': 62, '约翰壹书': 62,
    '约翰二书': 63, '约翰贰书': 63,
    '约翰三书': 64, '约翰叁书': 64,
    '犹大书': 65, '启示录': 66,
}

# ── 中文数字 → int ────────────────────────────────────────────────────
CN_DIGIT = {'〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
            '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}

def chinese_to_int(s: str) -> int:
    s = s.strip()
    if not s:
        return 0
    result = 0
    if '百' in s:
        parts = s.split('百', 1)
        hundreds = CN_DIGIT.get(parts[0], 1) if parts[0] else 1
        result += hundreds * 100
        s = parts[1]
    # Strip 〇/零 zero-placeholder (e.g. 一百零一 = 101)
    if s.startswith('〇') or s.startswith('零'):
        s = s[1:]
    if '十' in s:
        parts = s.split('十', 1)
        tens = CN_DIGIT.get(parts[0], 1) if parts[0] else 1
        result += tens * 10
        s = parts[1]
    if s:
        result += CN_DIGIT.get(s, 0)
    return result

# ── 章节标题正则 ─────────────────────────────────────────────────────
CHAPTER_HEADER_RE = re.compile(r'^第([一二三四五六七八九十百〇零]+)[章篇]')

def extract_chapter_number(line: str) -> int | None:
    m = CHAPTER_HEADER_RE.match(line)
    return chinese_to_int(m.group(1)) if m else None

# ── 节号正则：阿拉伯数字后紧跟中文字符/全角标点 ──────────────────────
VERSE_MARKER_RE = re.compile(
    r'(?<!第)'
    r'(\d+)'
    r'(?=[\u3000\u4e00-\u9fff'
    r'\uff0c\uff01\uff1f\u3002\u300c\u300e\u201c\u2018\u2019\u201d\u300f\u300d'
    r'\u3008\u3009\uff08\u2026\u3010])'
)

# ── 段落小标题剥离 ─────────────────────────────────────────────────
# 小标题出现在上一节经文（。！？"」』）结束后、下一节节号前，自身无标点。
_ENDERS = '。！？\u201d\u300d\u300f'  # 。！？ " 」 』

def strip_trailing_heading(text: str) -> str:
    """删除经文末尾紧跟的段落小标题（含括注参考）。"""
    last = max((text.rfind(c) for c in _ENDERS), default=-1)
    if 0 <= last < len(text) - 1:
        return text[:last + 1]
    return text


def parse_chapter_content(raw: str) -> list[tuple[int, str]]:
    content = CHAPTER_HEADER_RE.sub('', raw).strip()
    all_matches = list(VERSE_MARKER_RE.finditer(content))
    if not all_matches:
        return []

    verses: list[tuple[int, str]] = []
    current_expected = 1
    i = 0
    while i < len(all_matches):
        m = all_matches[i]
        num = int(m.group(1))
        # >= current_expected: 处理因合并节导致节号跳跃（如4-5合并成4，下一节直接是6）
        if num >= current_expected:
            text_start = m.end()
            text_end = len(content)
            # 找下一个比当前节号大的节号作为文本终止位置
            for j in range(i + 1, len(all_matches)):
                if int(all_matches[j].group(1)) > num:
                    text_end = all_matches[j].start()
                    break
            # 保留内部敬语空格（\u3000），只去掉首尾空白和普通空格/换行
            raw_text = content[text_start:text_end]
            vtext = re.sub(r'[ \t\n\r]+', '', raw_text).strip('\u3000').strip()
            # 剥除末尾小标题（节经文后、下一节号前的段落标题）
            vtext = strip_trailing_heading(vtext)
            if vtext:
                verses.append((num, vtext))
            current_expected = num + 1
        i += 1
    return verses

def esc(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"

def main():
    with open(INPUT_FILE, 'rb') as f:
        raw = f.read()
    text = raw.decode('gbk', errors='replace')
    lines = text.split('\n')

    known_books = set(BOOK_SN.keys())
    records: list[tuple[int, int, int, str]] = []

    current_book_sn: int | None = None
    current_chapter: int | None = None
    current_content: str = ''

    def flush() -> None:
        nonlocal current_content, current_chapter
        if current_book_sn is not None and current_chapter is not None and current_content.strip():
            for vnum, vtext in parse_chapter_content(current_content):
                records.append((current_book_sn, current_chapter, vnum, vtext))
        current_content = ''
        current_chapter = None

    for line in lines:
        stripped = line.strip()

        # 跳过水印行和分隔符行
        if 'Trial' in stripped or '@@@' in stripped:
            continue

        # 空行：flush 当前章节
        if not stripped:
            flush()
            continue

        # 已知书卷名
        if stripped in known_books:
            current_book_sn = BOOK_SN[stripped]
            continue

        # 章节标题行
        chap_num = extract_chapter_number(stripped)
        if chap_num is not None:
            flush()
            current_chapter = chap_num
            current_content = stripped
            continue

        # 章节续行（段落小标题 + 经文）
        if current_chapter is not None:
            current_content += stripped
            continue

        # 其余行（序言、附录）：忽略

    flush()  # 文件末尾

    # ── 写 SQL ───────────────────────────────────────────────────────
    print(f'解析完成，共 {len(records)} 节经文。', file=sys.stderr)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write('-- Bible data: 圣经新译本 (NCV)\n')
        out.write('-- Auto-generated by convert_ncv_to_sql.py\n')
        out.write(f'-- Total verses: {len(records)}\n\n')
        for vol, chap, verse, lection in records:
            out.write(
                f"INSERT INTO Bible (VolumeSN, ChapterSN, VerseSN, Lection, Version) "
                f"VALUES ({vol}, {chap}, {verse}, {esc(lection)}, {esc(VERSION)});\n"
            )

    print(f'SQL 已输出到 {OUTPUT_FILE}', file=sys.stderr)

    # ── 章节数校验 ───────────────────────────────────────────────────
    book_chap_count: dict[int, set] = defaultdict(set)
    for vol, chap, _, __ in records:
        book_chap_count[vol].add(chap)

    expected_chapters = {
        1:50,  2:40,  3:27,  4:36,  5:34,  6:24,  7:21,  8:4,   9:31,  10:24,
        11:22, 12:25, 13:29, 14:36, 15:10, 16:13, 17:10, 18:42, 19:150, 20:31,
        21:12, 22:8,  23:66, 24:52, 25:5,  26:48, 27:12, 28:14, 29:3,  30:9,
        31:1,  32:4,  33:7,  34:3,  35:3,  36:3,  37:2,  38:14, 39:4,
        40:28, 41:16, 42:24, 43:21, 44:28, 45:16, 46:16, 47:13, 48:6,  49:6,
        50:4,  51:4,  52:5,  53:3,  54:6,  55:4,  56:3,  57:1,  58:13, 59:5,
        60:5,  61:3,  62:5,  63:1,  64:1,  65:1,  66:22,
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
        (1,  1,   31, '创世记第1章'),
        (19, 119, 176, '诗篇第119章'),
        (19, 1,   6,   '诗篇第1章'),
        (66, 22,  21,  '启示录第22章'),
        (40, 5,   48,  '马太福音第5章'),
    ]
    print('\n── 节数抽查 ──', file=sys.stderr)
    for vol, chap, exp_v, label in spot_checks:
        count = sum(1 for r in records if r[0] == vol and r[1] == chap)
        status = '✓' if count == exp_v else f'✗ 期望{exp_v}'
        print(f'  {label}: {count} 节  {status}', file=sys.stderr)

if __name__ == '__main__':
    main()
