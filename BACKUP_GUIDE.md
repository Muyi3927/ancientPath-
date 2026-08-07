# 数据备份指南

本项目使用 Cloudflare D1 数据库和 R2 对象存储，以下是备份到本地的方法。

## 前置准备

### 1. 安装 rclone（用于备份 R2）

```bash
curl -s https://rclone.org/install.sh | sudo bash
```

### 2. 配置 rclone 连接 R2

前往 **Cloudflare Dashboard → R2 Object Storage → 管理 API 令牌** 创建令牌，获取：
- Access Key ID
- Secret Access Key
- Account ID（Dashboard 右侧栏）

然后创建配置文件：

```bash
mkdir -p ~/.config/rclone
cat > ~/.config/rclone/rclone.conf << EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = <你的 Access Key ID>
secret_access_key = <你的 Secret Access Key>
endpoint = https://<你的 Account ID>.r2.cloudflarestorage.com
acl = private
no_check_bucket = true
EOF
```

## 执行备份

### 备份 D1 数据库

```bash
mkdir -p backups
cd backend
npx wrangler d1 export lumina-blog-db --remote --output=../backups/d1_backup_$(date +%Y%m%d).sql
```

导出为完整的 SQL 文件，包含所有表结构和数据。

### 备份 R2 存储桶

```bash
rclone sync r2:lumina-blog-media ./backups/r2/ --progress
```

`rclone sync` 为增量同步，首次会下载全部文件，后续只会同步新增/变更的文件。

### 一键备份（两个一起）

```bash
mkdir -p backups && \
cd backend && npx wrangler d1 export lumina-blog-db --remote --output=../backups/d1_backup_$(date +%Y%m%d).sql && \
cd .. && rclone sync r2:lumina-blog-media ./backups/r2/ --progress
```

## 备份内容说明

| 项目 | 说明 | 备份位置 |
|------|------|----------|
| D1 数据库 | 博客文章、用户数据等 | `backups/d1_backup_YYYYMMDD.sql` |
| R2 存储桶 | 图片、音频、APK 等媒体文件 | `backups/r2/` |

R2 目录结构：
- `app/` — APK 安装包
- `audios/` — 讲道音频
- `images/` — 博客图片

## 恢复数据

### 恢复 D1 数据库

```bash
cd backend
npx wrangler d1 execute lumina-blog-db --remote --file=../backups/d1_backup_YYYYMMDD.sql
```

### 恢复 R2 文件

```bash
rclone sync ./backups/r2/ r2:lumina-blog-media --progress
```

> ⚠️ 恢复操作会覆盖远端数据，请谨慎执行。

## 注意事项

- `backups/` 目录已加入 `.gitignore`，不会被提交到 Git
- 建议定期备份（如每周一次）
- D1 备份文件带日期后缀，可保留多个历史版本
- R2 使用增量同步，重复执行不会重复下载
