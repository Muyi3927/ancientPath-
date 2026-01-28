import os

INPUT_FILE = 'backend/bible_data_asv.sql'
OUTPUT_DIR = 'backend/split_asv'
LINES_PER_FILE = 500  # 每次导入 500 行 INSERT 语句

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def split_file():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    total_lines = len(lines)
    file_count = 0
    current_lines = []
    
    print(f"Total lines to process: {total_lines}")

    for i, line in enumerate(lines):
        current_lines.append(line)
        
        if len(current_lines) >= LINES_PER_FILE:
            file_count += 1
            output_path = os.path.join(OUTPUT_DIR, f'part_{file_count:03d}.sql')
            with open(output_path, 'w', encoding='utf-8') as out_f:
                out_f.writelines(current_lines)
            print(f"Created {output_path}")
            current_lines = []
    
    # Write remaining lines
    if current_lines:
        file_count += 1
        output_path = os.path.join(OUTPUT_DIR, f'part_{file_count:03d}.sql')
        with open(output_path, 'w', encoding='utf-8') as out_f:
            out_f.writelines(current_lines)
        print(f"Created {output_path}")

    print(f"Done! Split into {file_count} files in {OUTPUT_DIR}")

split_file()
