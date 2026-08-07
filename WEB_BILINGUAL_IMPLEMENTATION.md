# 网页版中英对照版本实现总结

## 概述
完成网页版圣经页面的中英对照（bilingual）版本集成，包括版本选择和显示格式优化（中文/英文换行显示）。

## 修改的文件

### 1. services/BibleService.ts
**修改内容：**
- 添加了 `ParsedVerse` 接口，包含：
  - `chinese: string` - 中文文本
  - `english: string` - 英文文本
  - `hasBilingual: boolean` - 是否为bilingual版本

- 添加了 `parseVerseLection()` 函数
  - 功能：将圣经经节内容按 ` | ` 分隔符解析
  - 返回 ParsedVerse 对象，包含分离后的中文和英文文本
  - 如果不含分隔符，则 hasBilingual=false

### 2. pages/Bible.tsx
**修改内容：**

#### Import 更新
- 添加 `parseVerseLection` 到导入语句
```tsx
import { getBooks, getVerses, BibleBook, BibleVerse, searchVerses, BibleVersion, parseVerseLection } from '../services/BibleService';
```

#### 版本选择下拉菜单（第 555-560 行）
- 添加bilingual选项：
```tsx
<option value="bilingual">中英对照</option>
```
- 位置顺序：和合本 → 中英对照 → ASV → 新译本（仅管理员）

#### 复制功能（第 117-130 行）
- 更新 `handleCopySelected` 函数以支持bilingual换行显示
- bilingual版本显示格式：
  ```
  【书 章:节】
  中文文本
  英文文本
  ```
- 单语版本显示格式保持不变

#### 搜索结果显示
- **第 427 行**：搜索结果列表中只显示中文部分（使用 `parseVerseLection(verse.Lection).chinese`）
- **第 1049 行**：搜索模态框结果同样只显示中文部分

#### 主要经文显示区域（第 675-697 行）
- 完整重构verse显示逻辑，支持bilingual换行显示
- 当 `hasBilingual=true` 时：
  - 中文：正常大小（`fontSizeScale`）
  - 英文：略小（`fontSizeScale - 0.125`）、斜体、灰色（rgb(107, 114, 128)）
  - 英文与中文之间有 0.25rem 的间距
  - 深色模式下英文颜色为 `gray-400`
- 当 `hasBilingual=false` 时：正常显示单语文本

## 功能特性

### 1. 版本选择
- 用户可以在dropdown中选择「中英对照」版本
- 与移动版本保持一致（cuv → bilingual → asv → ncv）

### 2. 显示格式
- **列表视图（搜索结果）**：显示中文文本预览（truncate）
- **详细视图（main chapter display）**：显示中文和英文，各自独立段落，英文为斜体灰色
- **复制功能**：bilingual版本自动换行，单语版本保持原格式

### 3. 与移动版本的一致性
- 使用相同的 `parseVerseLection()` 逻辑
- 使用相同的数据格式（`Lection: "Chinese | English"`）
- 版本顺序和标签保持一致

## 数据来源
- 云端（D1数据库）：version='bilingual' 的31,080条经节记录
- Lection 字段格式：`"中文文本 | 英文文本"`
- 由 `convert_bilingual_to_sql.py` 脚本生成的SQL导入的数据

## 编译验证
- ✅ TypeScript 编译通过
- ✅ 无类型错误
- ✅ 构建成功（vite build）

## 测试清单
- [ ] 选择「中英对照」版本，验证下拉菜单显示
- [ ] 选择不同章节，验证经文显示格式（中文正常，英文斜体灰色）
- [ ] 搜索功能，验证搜索结果显示中文预览
- [ ] 复制功能，验证bilingual版本换行复制
- [ ] 深色模式，验证英文颜色正确显示
- [ ] 字体缩放，验证中英文大小比例关系正确

## 问题排查
如果bilingual版本不显示：
1. 检查数据库是否有version='bilingual'的数据
2. 检查后端API是否正确处理version参数
3. 查看浏览器控制台的Network标签，确认API调用成功

如果显示格式不正确：
1. 检查Lection字段中是否正确包含` | `分隔符
2. 验证 `parseVerseLection()` 函数是否正确解析
3. 检查CSS样式是否被正确应用
