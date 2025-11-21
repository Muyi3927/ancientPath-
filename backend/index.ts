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
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all routes
app.use('/*', cors());

// --- Auth Helper ---
const checkAuth = (c: any) => {
  const authHeader = c.req.header('Authorization');
  // Default secret if env var is not set. 
  // IMPORTANT: Change this for production!
  const secret = c.env.AUTH_SECRET || "my-secret-password";

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return false;
  }
  return true;
};

// --- Routes ---

// 1. Get All Posts
app.get('/api/posts', async (c) => {
  try {
    // D1: Select all posts
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM posts ORDER BY createdAt DESC`
    ).all();

    // Transform data format to match frontend BlogPost interface
    const posts = results.map((p: any) => ({
      ...p,
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

// 2. Get Single Post
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

// 3. Create/Update Post (Protected)
app.post('/api/posts', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { id, title, excerpt, content, coverImage, categoryId, tags, isFeatured, audioUrl, author } = body;

    const now = Date.now();
    const tagString = JSON.stringify(tags || []);

    // Check if post exists
    const existing = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();

    if (existing) {
      await c.env.DB.prepare(`
            UPDATE posts SET title=?, excerpt=?, content=?, coverImage=?, updatedAt=?, categoryId=?, tags=?, isFeatured=?, audioUrl=?
            WHERE id=?
        `).bind(title, excerpt, content, coverImage, now, categoryId, tagString, isFeatured ? 1 : 0, audioUrl, id).run();
    } else {
      await c.env.DB.prepare(`
            INSERT INTO posts (id, title, excerpt, content, coverImage, createdAt, updatedAt, categoryId, tags, isFeatured, audioUrl, authorName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, title, excerpt, content, coverImage, now, now, categoryId, tagString, isFeatured ? 1 : 0, audioUrl, author?.username || 'Admin').run();
    }

    return c.json({ success: true, id });
  } catch (e: any) {
    console.error("Save Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 4. Upload File to R2 (Protected) - 自动分文件夹
app.put('/api/upload', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const formData = await c.req.parseBody();
    const file = formData['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // === 新增：根据文件类型自动决定文件夹 ===
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

    // 生成公开 URL（自动带文件夹）
    let publicUrl = '';
    if (c.env.R2_PUBLIC_DOMAIN) {
      const base = c.env.R2_PUBLIC_DOMAIN.endsWith('/')
        ? c.env.R2_PUBLIC_DOMAIN.slice(0, -1)
        : c.env.R2_PUBLIC_DOMAIN;
      publicUrl = `${base}/${key}`;  // 自动变成 /images/xxx.png 或 /audios/xxx.mp3
    } else {
      return c.json({ error: 'R2_PUBLIC_DOMAIN 未配置' }, 500);
    }

    return c.json({ url: publicUrl });
  } catch (e: any) {
    console.error("Upload Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 5. Get Categories
app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM categories').all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;


// 6. Create New Category (Protected)
app.post('/api/categories', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { name } = body;

    if (!name?.trim()) return c.json({ error: '分类名称不能为空' }, 400);

    const id = Date.now().toString(); // 简单用时间戳，也可以用 uuid
    const trimmedName = name.trim();

    await c.env.DB.prepare(
      `INSERT INTO categories (id, name) VALUES (?, ?)`
    ).bind(id, trimmedName).run();

    return c.json({ id, name: trimmedName });
  } catch (e: any) {
    console.error("Create Category Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 7. Delete Category (Protected)
app.delete('/api/categories/:id', async (c) => {
  if (!checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');

  try {
    // 可选：检查是否有文章在使用这个分类
    const used = await c.env.DB.prepare('SELECT 1 FROM posts WHERE categoryId = ? LIMIT 1').bind(id).first();
    if (used) {
      return c.json({ error: '该分类下有文章，无法删除' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
