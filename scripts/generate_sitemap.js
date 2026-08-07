import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update this base URL to your production domain
const BASE = process.env.SITE_BASE || 'https://blogs.fangwengudao.us.kg';
const API_URL = 'https://api.ancientpath.dpdns.org/api/posts';

function writeSitemap(entries) {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const e of entries) {
    out.push('<url>');
    out.push(`<loc>${BASE}${e.loc}</loc>`);
    if (e.lastmod) out.push(`<lastmod>${e.lastmod}</lastmod>`);
    out.push(`<changefreq>${e.changefreq || 'monthly'}</changefreq>`);
    out.push(`<priority>${e.priority || '0.7'}</priority>`);
    out.push('</url>');
  }
  out.push('</urlset>');
  
  // Ensure public directory exists
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), out.join('\n'));
  console.log('Wrote public/sitemap.xml');
}

function collectStaticPages() {
  const pagesDir = path.resolve(process.cwd(), 'pages');
  const entries = [];

  // Home
  entries.push({ loc: '/', changefreq: 'daily', priority: '1.0' });

  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir);
    for (const f of files) {
      if (!f.endsWith('.tsx') && !f.endsWith('.js') && !f.endsWith('.jsx') && !f.endsWith('.html')) continue;
      const name = f.replace(/\.(tsx|js|jsx|html)$/, '');
      if (name.toLowerCase() === 'index') continue;
      if (name.toLowerCase() === 'home') continue; // Handled separately
      if (name.toLowerCase() === 'postdetail') continue; // Dynamic route
      if (name.toLowerCase() === 'editor') continue; // Admin only usually
      if (name.toLowerCase() === 'login') continue; // No SEO needed usually
      
      const loc = '/' + name.toLowerCase();
      entries.push({ loc, changefreq: 'weekly', priority: '0.8' });
    }
  }

  return entries;
}

async function fetchPosts() {
    try {
        console.log(`Fetching posts from ${API_URL}...`);
        const response = await fetch(API_URL);
        if (!response.ok) {
            console.error(`Failed to fetch posts: ${response.statusText}`);
            return [];
        }
        const posts = await response.json();
        
        if (Array.isArray(posts)) {
            return posts.map(post => ({
                loc: `/post/${post.id}`,
                lastmod: post.updatedAt ? new Date(Number(post.updatedAt)).toISOString().split('T')[0] : new Date(Number(post.createdAt)).toISOString().split('T')[0],
                changefreq: 'monthly',
                priority: '0.6'
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching posts for sitemap:", error);
        return [];
    }
}

async function generate() {
    const staticPages = collectStaticPages();
    const postPages = await fetchPosts();
    
    const allEntries = [...staticPages, ...postPages];
    console.log(`Generated ${allEntries.length} sitemap entries.`);
    writeSitemap(allEntries);
}

generate();