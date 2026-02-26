export type BibleVersion = 'cuv' | 'asv' | 'ncv';

export interface BibleBook {
  SN: number;
  FullName: string;
  ShortName: string;
  NewOrOld: number; // 0 for Old, 1 for New
  ChapterNumber: number;
}

export interface BibleVerse {
  ID: number;
  VolumeSN: number;
  ChapterSN: number;
  VerseSN: number;
  Lection: string;
}

// 自动切换 API 基础地址 (本地开发 vs 生产环境)
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:8787' 
  : 'https://api.ancientpath.dpdns.org';

export const getBooks = async (version: BibleVersion = 'cuv'): Promise<BibleBook[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/bible/books?version=${version}`);
    if (!response.ok) throw new Error('Failed to fetch books');
    return await response.json();
  } catch (e) {
    console.error('Failed to get Bible books:', e);
    return [];
  }
};

export const getVerses = async (bookId: number, chapter: number, version: BibleVersion = 'cuv'): Promise<BibleVerse[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/bible/verses?book=${bookId}&chapter=${chapter}&version=${version}`);
    if (!response.ok) throw new Error('Failed to fetch verses');
    return await response.json();
  } catch (e) {
    console.error('Failed to get Bible verses:', e);
    return [];
  }
};

export const searchVerses = async (query: string, version: BibleVersion = 'cuv'): Promise<BibleVerse[]> => {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch(`${API_BASE}/api/bible/search?q=${encodeURIComponent(query)}&version=${version}`);
    if (!response.ok) throw new Error('Failed to search verses');
    return await response.json();
  } catch (e) {
    console.error('Bible search failed:', e);
    return [];
  }
};