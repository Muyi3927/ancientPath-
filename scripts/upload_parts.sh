#!/bin/bash
# scripts/upload_parts.sh

echo "Starting batch upload..."

for file in backend/split_asv/*.sql; do
    echo "Uploading $file..."
    npx wrangler d1 execute lumina-blog-db --file="$file" --remote --yes
    
    # 检查上一个命令的退出状态
    if [ $? -ne 0 ]; then
        echo "Error uploading $file. Stopping."
        exit 1
    fi
    
    # 稍微休息一下，避免触发限流
    sleep 1
done

echo "All parts uploaded successfully!"
