# 热更新指南

## 当前配置状态

你的应用已经配置好了热更新功能，主要配置在 `app.json` 中：

```json
{
  "updates": {
    "url": "https://u.expo.dev/d0933ab4-c0f9-4bb6-b86d-91621bf8a91f",
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 5000
  },
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

## 如何进行热更新

### 1. 发布更新到Preview渠道（测试用）

```bash
# 切换到mobile目录
cd /home/jh/research/projects/blogs_for_path/mobile

# 发布到preview渠道
eas update --channel preview --message "描述你的更新内容"
```

### 2. 发布更新到Production渠道（正式版）

```bash
# 发布到生产渠道
eas update --channel production --message "正式版本更新描述"
```

### 3. 检查更新状态

```bash
# 查看所有更新
eas update:list

# 查看特定渠道的更新
eas update:list --channel preview
eas update:list --channel production
```

## 更新流程说明

1. **代码修改完成后**：
   - 提交代码到git：`git add . && git commit -m "更新描述"`
   - 发布热更新：`eas update --channel preview --message "更新描述"`

2. **用户获取更新**：
   - 应用启动时自动检查更新（`checkAutomatically: "ON_LOAD"`）
   - 5秒内无响应则使用缓存版本（`fallbackToCacheTimeout: 5000`）
   - 重启应用后生效

3. **版本兼容性**：
   - 使用 `appVersion` 策略，相同版本号的应用可以接收热更新
   - 如果原生代码有变化（新增依赖、权限等），需要重新构建APK

## 哪些更新可以热更新？

✅ **可以热更新**：
- JavaScript/TypeScript 代码修改
- React 组件更新
- 样式修改
- 图片资源更新
- 配置文件修改（不涉及原生部分）

❌ **需要重新构建APK**：
- 新增或删除原生依赖
- 修改app.json中的原生配置（权限、图标等）
- 更新Expo SDK版本
- 修改原生Android/iOS代码

## 测试流程

1. **本地测试**：
   ```bash
   npx expo start --clear
   ```

2. **发布到preview渠道测试**：
   ```bash
   eas update --channel preview --message "测试更新"
   ```

3. **确认无问题后发布到production**：
   ```bash
   eas update --channel production --message "正式发布"
   ```

## 常用命令

```bash
# 查看项目状态
eas project:info

# 查看构建历史
eas build:list

# 查看更新历史
eas update:list

# 删除特定更新
eas update:delete [update-id]

# 配置新的更新渠道
eas channel:create [channel-name]

# 查看所有渠道
eas channel:list
```

## 注意事项

1. **版本管理**：建议每次重要更新都增加app.json中的version号
2. **测试充分**：在preview渠道充分测试后再发布到production
3. **回滚机制**：如果发现问题，可以发布一个回滚的更新
4. **用户体验**：重大更新建议在应用内提示用户重启应用

## 自动化流程（可选）

你可以创建脚本来自动化热更新流程：

```bash
#!/bin/bash
# update.sh
echo "请输入更新描述:"
read message

echo "选择渠道 (preview/production):"
read channel

git add .
git commit -m "$message"
eas update --channel $channel --message "$message"

echo "更新发布完成！"
```

使用方法：
```bash
chmod +x update.sh
./update.sh
```