# APK构建与热更新完整指南

## 📱 APK构建

### 当前构建状态
- ✅ 项目已配置EAS构建
- ✅ 热更新已设置
- 🚀 正在构建APK...

### 构建命令
```bash
# 切换到mobile目录
cd /home/jh/research/projects/blogs_for_path/mobile

# 构建preview版APK（测试用）
eas build -p android --profile preview

# 构建生产版APK
eas build -p android --profile production

# 如遇问题，清除缓存重建
eas build -p android --profile preview --clear-cache
```

### 构建配置文件说明

**eas.json**:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview", 
      "android": {
        "buildType": "apk"  // 输出APK文件
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true  // 自动递增版本号
    }
  }
}
```

## 🔄 热更新系统

### 自动化脚本使用

运行热更新脚本：
```bash
./hot_update.sh
```

脚本功能：
1. 🔍 检查未提交的代码并自动提交
2. 📡 选择发布渠道（preview/production）
3. 📝 输入更新描述
4. 🚀 自动发布热更新
5. 📋 可选查看更新列表

### 手动热更新命令

```bash
# 发布到测试渠道
eas update --channel preview --message "修复了XX功能"

# 发布到生产渠道  
eas update --channel production --message "正式版本更新"

# 查看更新历史
eas update:list --channel preview
eas update:list --channel production
```

## 📋 开发流程

### 1. 日常开发更新（热更新）
```bash
# 1. 修改代码
# 2. 运行自动化脚本
./hot_update.sh

# 或手动执行
git add . && git commit -m "更新说明"
eas update --channel preview --message "更新说明"
```

### 2. 重大版本发布（需要新APK）
```bash
# 1. 更新版本号
# 编辑 app.json 中的 "version": "1.0.1"

# 2. 构建新APK
eas build -p android --profile production

# 3. 发布热更新
eas update --channel production --message "版本 1.0.1 发布"
```

## 🔧 常见问题解决

### 构建失败
1. **依赖问题**：
   ```bash
   npm install
   npx expo install --fix
   ```

2. **缓存问题**：
   ```bash
   eas build -p android --profile preview --clear-cache
   ```

3. **原生代码问题**：
   ```bash
   npx expo prebuild --clean
   ```

### 热更新不生效
1. **检查版本兼容性**：
   - 确保APK和更新的runtimeVersion一致
   - 查看app.json中的runtimeVersion配置

2. **检查渠道配置**：
   ```bash
   eas channel:list
   eas update:list --channel preview
   ```

3. **强制重启应用**：
   - 完全关闭应用再重新打开
   - 或等待应用自动检查更新

## 📊 监控与管理

### 查看构建状态
```bash
eas build:list
```

### 查看更新统计
```bash
eas update:list --json
```

### 回滚更新
如果发现问题，发布一个修复版本：
```bash
eas update --channel production --message "回滚：修复关键问题"
```

## 🚀 发布检查清单

### 发布热更新前：
- [ ] 代码已测试无误
- [ ] 已提交到git
- [ ] 先发布到preview渠道测试
- [ ] 确认更新描述清晰

### 发布新APK前：
- [ ] 更新版本号
- [ ] 测试所有新功能
- [ ] 检查原生权限和配置
- [ ] 清理构建缓存

## 📱 用户体验

### 热更新策略
- **时机**：应用启动时检查（ON_LOAD）
- **超时**：5秒后使用缓存版本
- **生效**：下次启动应用时应用更新
- **提示**：建议在重大更新时提示用户重启

### 版本管理策略
- 小功能更新：热更新
- 新功能/修复：增加小版本号 + 热更新  
- 重大更改：增加主版本号 + 新APK

---

## 🎯 当前项目状态

- **包名**：com.jianhuang3927.luminablog
- **项目ID**：d0933ab4-c0f9-4bb6-b86d-91621bf8a91f  
- **更新URL**：https://u.expo.dev/d0933ab4-c0f9-4bb6-b86d-91621bf8a91f
- **构建地址**：https://expo.dev/accounts/jianhuang3927/projects/lumina-blog