#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert bilingual Chinese-English Bible EPUB to SQL format.
EPUB structure: Each verse has Chinese text in one <p> then English text in next <p>.
Example: 
  <p>1:1    Chinese text here。</p>
  <p>In the beginning English text here.</p>
"""

import zipfile
import re
from xml.etree import ElementTree as ET
from pathlib import Path

# Book name mapping (simplified names → full canonical names)
BOOK_NAMES = {
    # OT Old Testament
    '创': '创世记',
    '创世': '创世记',
    '出': '出埃及记',
    '利': '利未记',
    '民': '民数记',
    '申': '申命记',
    '书': '约书亚记',
    '士': '士师记',
    '得': '路得记',
    '撒上': '撒母耳记上',
    '撒下': '撒母耳记下',
    '王上': '列王纪上',
    '王下': '列王纪下',
    '代上': '历代志上',
    '代下': '历代志下',
    '拉': '以斯拉记',
    '尼': '尼希米记',
    '斯': '以斯帖记',
    '伯': '约伯记',
    '诗': '诗篇',
    '箴': '箴言',
    '传': '传道书',
    '歌': '雅歌',
    '赛': '以赛亚书',
    '耶': '耶利米书',
    '哀': '耶利米哀歌',
    '结': '以西结书',
    '但': '但以理书',
    '何': '何西阿书',
    '珥': '约珥书',
    '摩': '阿摩司书',
    '俄': '俄巴底亚书',
    '拿': '约拿书',
    '弥': '弥迦书',
    '鸿': '那鸿书',
    '哈': '哈巴谷书',
    '番': '西番雅书',
    '该': '哈该书',
    '亚': '撒迦利亚书',
    '玛': '玛拉基书',
    # NT New Testament
    '太': '马太福音',
    '可': '马可福音',
    '路': '路加福音',
    '约': '约翰福音',
    '徒': '使徒行传',
    '罗': '罗马书',
    '林前': '哥林多前书',
    '林后': '哥林多后书',
    '加': '加拉太书',
    '弗': '以弗所书',
    '腓': '腓立比书',
    '西': '歌罗西书',
    '帖前': '帖撒罗尼迦前书',
    '帖后': '帖撒罗尼迦后书',
    '提前': '提摩太前书',
    '提后': '提摩太后书',
    '多': '提多书',
    '门': '腓利门书',
    '来': '希伯来书',
    '雅': '雅各书',
    '彼前': '彼得前书',
    '彼后': '彼得后书',
    '约一': '约翰一书',
    '约二': '约翰二书',
    '约三': '约翰三书',
    '犹': '犹大书',
    '启': '启示录',
}

# Volume numbers (旧约 OT 1-39, 新约 NT 40-66)
VOLUME_MAP = {
    # OT 1-39
    '创世记': 1, '出埃及记': 2, '利未记': 3, '民数记': 4, '申命记': 5,
    '约书亚记': 6, '士师记': 7, '路得记': 8, '撒母耳记上': 9, '撒母耳记下': 10,
    '列王纪上': 11, '列王纪下': 12, '历代志上': 13, '历代志下': 14, '以斯拉记': 15,
    '尼希米记': 16, '以斯帖记': 17, '约伯记': 18, '诗篇': 19, '箴言': 20,
    '传道书': 21, '雅歌': 22, '以赛亚书': 23, '耶利米书': 24, '耶利米哀歌': 25,
    '以西结书': 26, '但以理书': 27, '何西阿书': 28, '约珥书': 29, '阿摩司书': 30,
    '俄巴底亚书': 31, '约拿书': 32, '弥迦书': 33, '那鸿书': 34, '哈巴谷书': 35,
    '西番雅书': 36, '哈该书': 37, '撒迦利亚书': 38, '玛拉基书': 39,
    # NT 40-66
    '马太福音': 40, '马可福音': 41, '路加福音': 42, '约翰福音': 43, '使徒行传': 44,
    '罗马书': 45, '哥林多前书': 46, '哥林多后书': 47, '加拉太书': 48, '以弗所书': 49,
    '腓立比书': 50, '歌罗西书': 51, '帖撒罗尼迦前书': 52, '帖撒罗尼迦后书': 53,
    '提摩太前书': 54, '提摩太后书': 55, '提多书': 56, '腓利门书': 57, '希伯来书': 58,
    '雅各书': 59, '彼得前书': 60, '彼得后书': 61, '约翰一书': 62, '约翰二书': 63,
    '约翰三书': 64, '犹大书': 65, '启示录': 66,
}

CHAPTER_REGEX = re.compile(r'^第([一二三四五六七八九十百〇零]+)[章篇]')
VERSE_REGEX = re.compile(r'^(\d+):(\d+)\s*[\u3000 ]*(.+)')  # Format: 1:1 text

def chinese_to_int(s):
    """Convert Chinese numerals to integer."""
    cn_num = {'零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
              '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100}
    
    if not s:
        return 0
    
    result = 0
    for char in s:
        if char == '十':
            if result == 0:
                result = 10
            else:
                result *= 10
        elif char == '百':
            if result == 0:
                result = 100
            else:
                result *= 100
        else:
            result += cn_num.get(char, 0)
    
    return result

def local_name(tag):
    """Remove XML namespace."""
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag

def parse_epub_records(epub_path):
    """Extract records from bilingual EPUB.
    Each verse: Chinese <p>verse_num text</p> followed by English <p>text</p>
    """
    records = []
    
    with zipfile.ZipFile(epub_path, 'r') as z:
        # Read all chapter files in order
        all_paragraphs = []
        current_book = None
        current_chapter = 0
        current_volume_sn = 0
        
        # List all chapter files
        chapter_files = sorted([f for f in z.namelist() if 'OPS/chapter' in f and f.endswith('.html')])
        
        for chapter_file in chapter_files:
            html_content = z.read(chapter_file).decode('utf-8')
            
            # Parse HTML
            try:
                root = ET.fromstring(html_content)
            except:
                # Try wrapping in root tag if invalid XML
                try:
                    root = ET.fromstring(f'<root>{html_content}</root>')
                except:
                    continue
            
            # Extract h3 (title) and paragraphs
            for elem in root.iter():
                tag = local_name(elem.tag)
                
                if tag == 'h3':
                    # Extract book name from h3 like "旧约-- 创世记(Genesis) -- 第1 章"
                    title_text = (elem.text or '').strip()
                    
                    # Match pattern: "书名(English Name)"
                    book_match = re.search(r'(旧约|新约)?[-\s]*(.+?)\(', title_text)
                    if book_match:
                        book_text = book_match.group(2).strip()
                        
                        # Try exact match first
                        if book_text in VOLUME_MAP:
                            current_book = book_text
                            current_volume_sn = VOLUME_MAP[book_text]
                        else:
                            # Try substring match
                            for full_name in VOLUME_MAP.keys():
                                if book_text in full_name or full_name in book_text:
                                    current_book = full_name
                                    current_volume_sn = VOLUME_MAP[full_name]
                                    break
                    
                    # Extract chapter number from title
                    ch_match = re.search(r'第([一二三四五六七八九十百〇零]+)[章篇]', title_text)
                    if ch_match:
                        current_chapter = chinese_to_int(ch_match.group(1))
                
                elif tag == 'p':
                    text = (elem.text or '').strip()
                    if text:
                        all_paragraphs.append({
                            'text': text,
                            'book': current_book,
                            'chapter': current_chapter,
                            'volume_sn': current_volume_sn
                        })
        
        # Now pair Chinese and English paragraphs
        i = 0
        while i < len(all_paragraphs):
            para = all_paragraphs[i]
            text = para['text']
            
            # Check if this is a Chinese verse (starts with digit after optional spaces)
            verse_match = VERSE_REGEX.match(text)
            if verse_match:
                verse_chapter = int(verse_match.group(1))
                verse_num = int(verse_match.group(2))
                verse_text_cn = verse_match.group(3)
                
                # Look ahead for English text (next paragraph)
                verse_text_en = ''
                if i + 1 < len(all_paragraphs):
                    next_para = all_paragraphs[i + 1]
                    next_text = next_para['text']
                    
                    # English text doesn't start with verse number
                    if not VERSE_REGEX.match(next_text):
                        verse_text_en = next_text
                        i += 2  # Skip the English paragraph
                    else:
                        i += 1
                else:
                    i += 1
                
                if para['volume_sn'] > 0 and verse_chapter > 0:
                    records.append((
                        para['volume_sn'],
                        verse_chapter,
                        verse_num,
                        verse_text_cn,
                        verse_text_en
                    ))
            else:
                i += 1
    
    return records

def generate_sql(records, version='bilingual'):
    """Generate SQL INSERT statements."""
    sql_lines = [
        'DELETE FROM Bible WHERE Version = \'{};\';'.format(version),
        ''
    ]
    
    for vol_sn, chap_sn, verse_sn, text_cn, text_en in records:
        # Store bilingual as: "Chinese text | English text"
        combined_text = f"{text_cn} | {text_en}" if text_en else text_cn
        combined_text = combined_text.replace("'", "''")
        
        sql_lines.append(
            f"INSERT INTO Bible (VolumeSN, ChapterSN, VerseSN, Lection, Version) "
            f"VALUES ({vol_sn}, {chap_sn}, {verse_sn}, '{combined_text}', '{version}');"
        )
    
    return '\n'.join(sql_lines)

if __name__ == '__main__':
    epub_path = Path('public/《圣经》中英对照豪华版.epub')
    
    print(f"Parsing {epub_path}...")
    records = parse_epub_records(str(epub_path))
    
    print(f"Extracted {len(records)} records")
    
    # Show sample
    if records:
        for i, r in enumerate(records[:5]):
            print(f"{i}: {r}")
    
    # Generate SQL
    sql = generate_sql(records, version='bilingual')
    
    output_path = Path('backend/bible_data_bilingual.sql')
    output_path.write_text(sql, encoding='utf-8')
    print(f"\nGenerated {output_path}")
