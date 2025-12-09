import os
from PIL import Image
from pathlib import Path

# --- 配置区域 ---
# 输入文件夹路径 (您的原始图片目录)
INPUT_DIR = './lumina-blog-media' 

# 输出文件夹路径 (优化后的图片存放处，建议与输入分开，确认无误后再替换)
OUTPUT_DIR = './lumina-blog-media-optimized'

# 压缩质量 (1-100, 80 是很好的平衡点)
QUALITY = 80

# 最大宽度 (如果图片太宽，自动缩小，0 表示不改变尺寸)
MAX_WIDTH = 1200 
# ----------------

def optimize_images():
    # 创建输出目录
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 支持的格式
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    
    count = 0
    saved_space = 0

    for root, dirs, files in os.walk(INPUT_DIR):
        # 保持子目录结构
        relative_path = os.path.relpath(root, INPUT_DIR)
        target_dir = os.path.join(OUTPUT_DIR, relative_path)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        for file in files:
            if file.lower().endswith(supported_formats):
                input_path = os.path.join(root, file)
                # 输出文件名改为 .webp
                file_name_without_ext = os.path.splitext(file)[0]
                output_path = os.path.join(target_dir, file_name_without_ext + ".webp")

                try:
                    with Image.open(input_path) as img:
                        # 1. 转换颜色模式 (PNG 如果有透明度需保留 RGBA，JPG 转 RGB)
                        if img.mode in ("RGBA", "P"):
                            img = img.convert("RGBA")
                        else:
                            img = img.convert("RGB")

                        # 2. 调整尺寸 (如果设置了 MAX_WIDTH)
                        if MAX_WIDTH > 0 and img.width > MAX_WIDTH:
                            ratio = MAX_WIDTH / img.width
                            new_height = int(img.height * ratio)
                            img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)

                        # 3. 保存为 WebP
                        img.save(output_path, 'webp', quality=QUALITY, optimize=True)

                        # 统计
                        original_size = os.path.getsize(input_path)
                        new_size = os.path.getsize(output_path)
                        saved = original_size - new_size
                        saved_space += saved
                        
                        print(f"[成功] {file} -> {os.path.basename(output_path)}")
                        print(f"       大小: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB (减少 {saved/original_size*100:.1f}%)")
                        count += 1

                except Exception as e:
                    print(f"[失败] {file}: {e}")

    print("-" * 30)
    print(f"处理完成！共转换 {count} 张图片。")
    print(f"总共节省空间: {saved_space / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    print("开始优化图片...")
    optimize_images()