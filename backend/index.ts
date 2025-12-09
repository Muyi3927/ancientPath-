import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Placeholder types to fix "Cannot find name" errors when @cloudflare/workers-types is not globally available
type D1Database = any;
type R2Bucket = any;

// Define the structure of our environment variables (bindings)
type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  // This variable should be set in Cloudflare Dashboard or wrangler.toml
  // For now we default to a hardcoded string in code for simplicity if var is missing
  AUTH_SECRET?: string;
  // The public domain for your R2 bucket (e.g. https://media.yourdomain.com)
  // If not set, we will try to construct a default R2.dev URL, but Custom Domain is recommended.
  R2_PUBLIC_DOMAIN?: string;
  // Custom/Local LLM Configuration (OpenAI Compatible)
  CUSTOM_LLM_API_KEY?: string;
  CUSTOM_LLM_API_BASE?: string; // e.g. https://your-tunnel-url.com/v1
  CUSTOM_LLM_MODEL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all routes
app.use('/*', cors());

// --- Auth Helper ---
const checkAuth = (c: any) => {
  const authHeader = c.req.header('Authorization');
  const secret = c.env.AUTH_SECRET;
  
  if (!secret) {
    console.error("AUTH_SECRET is not configured");
    return false;
  }
  
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return false;
  }
  return true;
};

// --- 路由 ---

// Login Endpoint
app.post('/api/login', async (c) => {
  try {
    const { password } = await c.req.json();
    const secret = c.env.AUTH_SECRET;
    
    if (!secret) {
      return c.json({ error: 'Server configuration error' }, 500);
    }
    
    if (password === secret) {
      return c.json({ success: true, token: secret });
    } else {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
  } catch (e) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

// 0. 代理 R2 图片/音频 (解决 404 问题)
app.get('/api/media/:folder/:filename', async (c) => {
  const folder = c.req.param('folder');
  const filename = c.req.param('filename');
  const key = `${folder}/${filename}`;

  // 优先使用 R2 公开域名重定向 (支持 Range 请求，支持 CDN 缓存)
  if (c.env.R2_PUBLIC_DOMAIN) {
    return c.redirect(`${c.env.R2_PUBLIC_DOMAIN}/${key}`);
  }

  try {
    const object = await c.env.BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      headers,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// 1. 获取所有文章
app.get('/api/posts', async (c) => {
  try {
    const categoryId = c.req.query('categoryId');
    const search = c.req.query('search');
    let query = `SELECT * FROM posts`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Ensure categoryId is valid and not "undefined" string
    if (categoryId && categoryId !== 'undefined' && categoryId !== 'null') {
      conditions.push(`categoryId = ?`);
      params.push(categoryId);
    }

    if (search) {
      conditions.push(`(title LIKE ? OR content LIKE ?)`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY createdAt DESC`;

    // D1: 查询 posts 表，按创建时间倒序排序
    const stmt = c.env.DB.prepare(query);
    const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
    
    // 格式化从数据库取出的数据，以匹配前端 BlogPost 接口
    const posts = results.map((p: any) => ({
      ...p,
      // --- 修复: 确保 categoryId 是字符串，避免前端类型不匹配 ---
      categoryId: p.categoryId ? String(p.categoryId) : null,
      tags: p.tags ? JSON.parse(p.tags) : [],
      isFeatured: Boolean(p.isFeatured),
      author: { username: p.authorName || 'Admin', role: 'ADMIN' } 
    }));
    
    return c.json(posts);
  } catch (e: any) {
    console.error("DB Error:", e);
    return c.json({ error: e.message || "Database error" }, 500);
  }
});

// 2. 获取单篇文章
app.get('/api/posts/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    
    if (!post) return c.json({ error: 'Not found' }, 404);
    
    const formatted = {
      ...post,
      tags: post.tags ? JSON.parse(post.tags as string) : [],
      isFeatured: Boolean(post.isFeatured),
      author: { username: post.authorName || 'Admin', role: 'ADMIN' }
    };
    
    return c.json(formatted);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// 3. 创建或更新文章 (受保护的路由)
app.post('/api/posts', async (c: any) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    // 前端传来的 ID 可能是新文章的 UUID (如果前端生成) 或旧文章的数字 ID
    const { id, title, excerpt, content, coverImage, categoryId, tags, isFeatured, audioUrl, author } = body;
    
    const now = Date.now();
    // --- 检查文章是否存在 ---
    // Change SELECT id to SELECT * to support partial updates
    const existing = id ? await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first() : null;

    if (existing) {
        // --- 更新现有文章 ---
        // Merge existing data with new data to handle partial updates
        const newTitle = title ?? existing.title;
        const newExcerpt = excerpt ?? existing.excerpt;
        const newContent = content ?? existing.content;
        const newCoverImage = coverImage ?? existing.coverImage;
        const newCategoryId = categoryId ?? existing.categoryId;
        // tags comes as array from body, but stored as string in DB. existing.tags is string.
        const newTags = tags !== undefined ? JSON.stringify(tags) : existing.tags;
        const newIsFeatured = isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.isFeatured;
        const newAudioUrl = audioUrl ?? existing.audioUrl;

        await c.env.DB.prepare(`
            UPDATE posts SET title=?, excerpt=?, content=?, coverImage=?, updatedAt=?, categoryId=?, tags=?, isFeatured=?, audioUrl=?
            WHERE id=?
        `).bind(newTitle, newExcerpt, newContent, newCoverImage, now, newCategoryId, newTags, newIsFeatured, newAudioUrl, id).run();
        
        return c.json({ success: true, id: id });

    } else {
        // --- 插入新文章 (让数据库自动生成自增 ID) ---
        const tagString = JSON.stringify(tags || []);
        const result = await c.env.DB.prepare(`
            INSERT INTO posts (title, excerpt, content, coverImage, createdAt, updatedAt, categoryId, tags, isFeatured, audioUrl, authorName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(title, excerpt, content, coverImage, now, now, categoryId, tagString, isFeatured ? 1 : 0, audioUrl, author?.username || 'Admin').run();

        const newId = result.meta.last_row_id;
        
        return c.json({ success: true, id: newId });
    }

  } catch (e: any) {
    console.error("Save Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 4. 上传文件到 R2 (受保护的路由) - 自动分文件夹
app.put('/api/upload', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const formData = await c.req.parseBody();
    const file = formData['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // === 根据文件类型自动决定文件夹 ===
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

    let folder = 'others/'; // 默认
    if (imageExts.includes(ext)) {
      folder = 'images/';
    } else if (audioExts.includes(ext)) {
      folder = 'audios/';
    }

    // 生成文件名（时间戳 + 原文件名）
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `${folder}${safeName}`;  // 关键：这里拼接文件夹

    // 上传到 R2（key 包含文件夹）
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 使用 Worker 代理作为公开 URL (解决自定义域名配置困难的问题)
    // 格式: https://api.ancientpath.dpdns.org/api/media/images/xxx.png
    const requestUrl = new URL(c.req.url);
    const publicUrl = `${requestUrl.origin}/api/media/${key}`;

    return c.json({ url: publicUrl });
  } catch (e: any) {
    console.error("Upload Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 5. 获取所有分类
app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM categories').all();
    // --- 修复: 确保所有分类 ID 都是字符串 ---
    const stringifiedResults = results.map((cat: any) => ({
        ...cat,
        id: String(cat.id),
        parentId: cat.parentId ? String(cat.parentId) : null
    }));
    return c.json(stringifiedResults);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// 6. 创建分类 (受保护的路由)
app.post('/api/categories', async (c: any) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const name = body.name;
    const parentId = body.parentId ?? null;

    if (!name) return c.json({ error: 'Missing name' }, 400);

    // --- 修复: 让 D1 处理自增 ID ---
    // 我们不再在 INSERT 语句中提供 ID。
    const result = await c.env.DB.prepare(
        `INSERT INTO categories (name, parentId) VALUES (?, ?)`
      )
      .bind(name, parentId)
      .run();

    // 获取数据库刚刚生成的 ID。
    const newId = result.meta.last_row_id;

    return c.json({ success: true, category: { id: newId, name, parentId } });
  } catch (e: any) {
    console.error('Create category error:', e);
    return c.json({ error: e.message || String(e) }, 500);
  }
});

// 7. 删除分类 (受保护的路由)
app.delete('/api/categories/:id', async (c: any) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  try {
    // 删除分类
    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    // 如果有文章引用了这个分类，将其设为未分类
    try {
      await c.env.DB.prepare('UPDATE posts SET categoryId = ? WHERE categoryId = ?').bind('', id).run();
    } catch (e) {
      console.warn('Failed to update posts when deleting category:', e);
    }

    // 如果有子分类引用了这个分类，将其设为顶级分类 (parentId = NULL)
    try {
      await c.env.DB.prepare('UPDATE categories SET parentId = NULL WHERE parentId = ?').bind(id).run();
    } catch (e) {
      // ignore if parentId column doesn't exist
    }

    return c.json({ success: true });
  } catch (e: any) {
    console.error('Delete category error:', e);
    return c.json({ error: e.message || String(e) }, 500);
  }
});

// 8. 删除文章 (受保护的路由)
app.delete('/api/posts/:id', async (c: any) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Delete post error:', e);
    return c.json({ error: e.message || String(e) }, 500);
  }
});

// AI Summary Generation (Using Custom/Local LLM)
app.post('/api/generate-summary', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { content } = await c.req.json();
    
    // 1. Get Config
    const apiKey = c.env.CUSTOM_LLM_API_KEY ? c.env.CUSTOM_LLM_API_KEY.trim() : '';
    // API Base URL (Must be public if deployed on Cloudflare, e.g. ngrok)
    // Format: https://your-domain.com/v1
    const apiBase = c.env.CUSTOM_LLM_API_BASE ? c.env.CUSTOM_LLM_API_BASE.trim() : '';
    const model = c.env.CUSTOM_LLM_MODEL || 'gpt-oss:20b';

    if (!apiKey || !apiBase) {
      return c.json({ error: 'Configuration missing: Please set CUSTOM_LLM_API_KEY and CUSTOM_LLM_API_BASE' }, 500);
    }

    // 2. Call API (OpenAI Compatible)
    // Ensure apiBase doesn't end with slash
    const baseUrl = apiBase.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "你将为一篇改革宗讲道文本撰写摘要，发布于博客，用于吸引读者点击阅读全文。请遵守以下要求：\
                                          • 内容长度约为80字\
                                          • 使用中文表达\
                                          • 采用提问式或引人思考的方式，提高吸引力\
                                          • 将“讲道”作为出处称呼，不提及作者、讲员姓名或任何引用来源\
                                          • 不出现经文引用、章节编号、脚注或链接\
                                          • 不过度剧透主要论证与结论，要激发读者好奇心\
                                          • 保持逻辑连贯、严肃庄重（符合改革宗风格），但语气具引导性和呼召性\
                                          • 避免夸张口号和空洞情绪化表达\
                                          输出格式要求：\
                                          只返回最终摘要内容，不添加任何备注、前缀、标题、解释或提示语。" },
                { role: "user", content: content.substring(0, 4000) }
            ],
            stream: false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Custom LLM Error:', errorText);
        throw new Error(`Custom LLM Error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
        throw new Error('Failed to generate summary from AI response');
    }

    return c.json({ summary });

  } catch (e: any) {
    console.error("AI Error:", e);
    return c.json({ error: `AI Generation Failed: ${e.message}` }, 500);
  }
});

export default app;
