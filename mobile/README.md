# 访问古道 - 移动端

基于 Expo SDK 54 的 React Native 移动应用。

## 开发环境

```bash
cd mobile
npm install
npx expo start
```

扫描二维码即可在 Expo Go 中预览，修改代码后自动热更新。

## 生产环境热更新 (OTA)

项目已配置 EAS Update，支持 Over-The-Air 热更新。

### 首次配置

```bash
npm install -g eas-cli
eas login
```

### 发布更新

```bash
# 发布到生产环境
eas update --branch production --message "更新描述"

# 发布到预览分支
eas update --branch preview --message "测试更新"

# 查看更新历史
eas update:list
```

用户打开 App 时会自动检查并下载更新（已配置 `checkAutomatically: "ON_LOAD"`）。

### 注意事项

- JS 代码变更可以通过 OTA 更新
- 原生模块变更（如新增原生依赖）需要重新构建 App
- `runtimeVersion` 配置为 `appVersion`，用户更新 App 版本后自动获取最新 OTA 更新
