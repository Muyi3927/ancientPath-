# 网页版Bilingual实现 - 快速参考

## 修改的3个核心位置

### 1. services/BibleService.ts
添加了文本解析能力：

```typescript
// 新接口（第19-22行）
export interface ParsedVerse {
  chinese: string;
  english: string;
  hasBilingual: boolean;
}

// 新函数（第64-78行）
export const parseVerseLection = (lection: string): ParsedVerse => {
  const separator = ' | ';
  if (lection.includes(separator)) {
    const parts = lection.split(separator);
    return {
      chinese: parts[0].trim(),
      english: parts[1].trim(),
      hasBilingual: true
    };
  }
  return { chinese: lection, english: '', hasBilingual: false };
};
```

### 2. pages/Bible.tsx - 导入
```typescript
// 第2行：添加parseVerseLection导入
import { ..., parseVerseLection } from '../services/BibleService';
```

### 3. pages/Bible.tsx - 版本选择下拉菜单
```tsx
// 第557行：添加bilingual选项
<option value="bilingual">中英对照</option>
```

### 4. pages/Bible.tsx - 主经文显示
```tsx
// 第675-697行：使用parseVerseLection处理显示
{(() => {
  const parsed = parseVerseLection(verse.Lection);
  return parsed.hasBilingual ? (
    <>
      <p>{parsed.chinese}</p>
      <p style={{ fontSize: '..rem', fontStyle: 'italic', color: 'rgb(107, 114, 128)' }}>
        {parsed.english}
      </p>
    </>
  ) : (
    <p>{parsed.chinese}</p>
  );
})()}
```

### 5. pages/Bible.tsx - 复制功能
```typescript
// 第122-130行：支持bilingual换行复制
.map(v => {
  const parsed = parseVerseLection(v.Lection);
  const verseHeader = `【${shortName} ${currentChapter}:${v.VerseSN}】`;
  if (parsed.hasBilingual) {
    return `${verseHeader}\n${parsed.chinese}\n${parsed.english}`;
  }
  return `${verseHeader}${parsed.chinese}`;
})
```

### 6. pages/Bible.tsx - 搜索结果显示
```tsx
// 第426行、1049行：搜索结果只显示中文
{parseVerseLection(verse.Lection).chinese}
```

## 验证清单 ✅
- ✅ parseVerseLection导出自BibleService
- ✅ bilingual选项在版本下拉菜单中
- ✅ 主verse显示支持中英分离
- ✅ 复制功能支持换行
- ✅ 搜索结果显示中文预览
- ✅ TypeScript编译无错误
- ✅ 编译成功（build passed）

## 特性说明

### 显示效果
| 元素 | 样式 |
|------|------|
| 中文文本 | 正常大小、正常颜色、衬线字体 |
| 英文文本 | 略小字体、斜体、灰色(#6b7280)、margin-top:0.25rem |
| 深色模式 | 英文变为gray-400 |

### 数据格式
```
数据库Lection字段: "中文内容 | 英文内容"
       ↓ parseVerseLection()
ParsedVerse: { chinese, english, hasBilingual }
       ↓
UI显示: 中文和英文分离显示
```

## 与移动版本的同步
- 使用相同的 `parseVerseLection()` 逻辑
- 使用相同的数据格式（` | `分隔符）
- 版本顺序一致：cuv → bilingual → asv → ncv
- 显示样式一致：中文正常、英文斜体灰色

## 部署前检查
- [ ] 确认后端API支持 `?version=bilingual` 参数
- [ ] 确认D1数据库有version='bilingual'的数据
- [ ] 测试版本切换是否正确加载数据
- [ ] 验证搜索功能在bilingual版本中工作正常
