# 双语圣经显示优化

## 更新内容

为了提高双语圣经的可读性和对照效果，已将显示格式从**混合显示**改为**分行显示**。

### 变化前
```
创世记 1:1
起初神创造天地。 | In the beginning God created the heaven and the earth.
```

### 变化后
```
创世记 1:1
起初神创造天地。
In the beginning God created the heaven and the earth.
```

## 技术实现

### 1. 后端数据服务 (`mobile/services/BibleDatabase.ts`)
- 添加 `ParsedVerse` 接口定义
- 添加 `parseVerseLection()` 辅助函数
  - 自动分离中英文本（使用 `|` 作为分隔符）
  - 返回 `{ chinese, english, hasBilingual }` 对象

### 2. 主圣经页面 (`mobile/app/(tabs)/bible.tsx`)
- 导入 `parseVerseLection` 函数
- 修改经文列表渲染逻辑
  - 中文正常显示（baseFontSize）
  - 英文以斜体显示，字体略小（baseFontSize - 2）
  - 自动识别是否为双语版本
- 修改复制经文逻辑
  - 双语经文复制时：中英分行
  - 单语经文复制时：保持原样

### 3. 经文详情模态框 (`mobile/components/BibleVerseModal.tsx`)
- 修改经文显示
  - 中文 18px，行高 28px
  - 英文 16px（斜体），行高 26px，顶部间距 6px
- 修改复制功能
  - 双语格式：`【书名 章:节】\n中文\n英文`
  - 单语格式：`【书名 章:节】中文`
  - 多个经文间用 `\n\n` 分隔

### 4. 搜索结果显示 (`mobile/app/(tabs)/bible.tsx`)
- 搜索结果列表中也显示分行格式
- 中文主显示，英文灰色较小字体

## 视觉效果

### 深色主题
- 中文：亮色（#d1d5db）
- 英文：较暗灰色（#9ca3af），斜体

### 浅色主题
- 中文：深灰色（#374151）
- 英文：中灰色（#6b7280），斜体

## 兼容性

- ✅ 自动识别双语版本（通过 `|` 分隔符）
- ✅ 单语版本（cuv, ncv）显示不变
- ✅ 复制功能自动调整格式
- ✅ 搜索功能不受影响

## 数据格式

在数据库中保持不变：
```sql
Lection: '中文文本 | 英文文本'
```

显示时通过 `parseVerseLection()` 自动分割和格式化。

## 已修改文件
1. `mobile/services/BibleDatabase.ts` - 添加解析函数
2. `mobile/app/(tabs)/bible.tsx` - 主圣经页面显示
3. `mobile/components/BibleVerseModal.tsx` - 详情模态框显示
