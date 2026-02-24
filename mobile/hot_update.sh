#!/bin/bash
# 热更新自动化脚本

echo "🚀 访问古道 - 热更新发布工具"
echo "================================"

# 检查当前目录
if [ ! -f "app.json" ]; then
    echo "❌ 错误：请在mobile目录下运行此脚本"
    exit 1
fi

# 检查是否有未提交的改动
if ! git diff-index --quiet HEAD --; then
    echo "📝 发现未提交的改动，请输入提交信息:"
    read -r commit_message
    
    git add .
    git commit -m "$commit_message"
    echo "✅ 代码已提交到git"
fi

# 选择发布渠道
echo ""
echo "📡 选择发布渠道:"
echo "1. preview (预览/测试)"
echo "2. production (生产/正式)"
read -p "请输入选项 (1/2): " channel_choice

case $channel_choice in
    1)
        channel="preview"
        ;;
    2)
        channel="production"
        ;;
    *)
        echo "❌ 无效选项，退出"
        exit 1
        ;;
esac

# 输入更新描述
echo ""
read -p "📋 请输入更新描述: " update_message

# 确认发布
echo ""
echo "🔍 发布确认:"
echo "渠道: $channel"
echo "描述: $update_message"
echo ""
read -p "确认发布? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ 取消发布"
    exit 0
fi

# 发布更新
echo ""
echo "🚀 正在发布更新..."
if eas update --channel "$channel" --message "$update_message"; then
    echo "✅ 更新发布成功！"
    echo ""
    echo "📱 用户将在下次启动应用时获取更新"
    echo "🔗 查看更新: https://expo.dev/accounts/jianhuang3927/projects/lumina-blog/updates"
else
    echo "❌ 发布失败，请检查错误信息"
    exit 1
fi

# 询问是否查看更新列表
echo ""
read -p "📋 是否查看最新的更新列表? (y/N): " show_list

if [[ $show_list =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 最新更新列表:"
    eas update:list --channel "$channel" --limit 5
fi

echo ""
echo "🎉 热更新发布完成！"