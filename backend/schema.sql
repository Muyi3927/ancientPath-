-- ========================
-- Categories Table
-- ========================
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parentId INTEGER,
    FOREIGN KEY (parentId) REFERENCES categories(id)
);

-- Seed categories
INSERT INTO categories (name, parentId) VALUES
  ('Technology', NULL),
  ('Life', NULL),
  ('Faith', NULL),
  ('Programming', 1),
  ('Frontend', 4),
  ('Backend', 4),
  ('DevOps', 4);


-- ========================
-- Articles Table
-- ========================
DROP TABLE IF EXISTS articles;

CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    imageUrl TEXT,
    category INTEGER,
    url TEXT,
    authorName TEXT,
    views INTEGER DEFAULT 0,
    FOREIGN KEY (category) REFERENCES categories(id)
);

-- Seed article data
INSERT INTO articles (
    date, title, description, content, slug, imageUrl, category, url, authorName, views
) VALUES
(
    '2025-01-01',
    'Welcome to the Blog',
    'First seed article to test database.',
    'This is a sample content block for the very first seeded article.',
    'welcome-to-the-blog',
    '/images/sample1.jpg',
    1,
    'https://example.com/welcome',
    'Admin',
    0
),
(
    '2025-01-02',
    'Building a Blog with Cloudflare & D1',
    'A simple guide to launching a modern web project.',
    'Content for the second seeded article goes here.',
    'cloudflare-d1-guide',
    '/images/sample2.jpg',
    4,
    'https://example.com/cf-d1',
    'Admin',
    12
);
