import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

type VersionConfig = {
  dbName: string;
  asset?: number;
  useApi?: boolean;
  booksQuery: string;
  versesQuery: string;
  searchQuery?: string;
  bookParams?: () => any[];
  verseParams?: (bookId: number, chapter: number) => any[];
  searchParams?: (query: string) => any[];
};

const API_BASE_URL = 'https://api.ancientpath.dpdns.org';

const VERSION_CONFIG = {
  cuv: {
    dbName: 'bible_cuv.db',
    asset: require('../assets/bible_cuv.db'),
    booksQuery:
      'SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN ASC',
    versesQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE VolumeSN = ? AND ChapterSN = ? ORDER BY VerseSN ASC',
    searchQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE Lection LIKE ? ORDER BY VolumeSN, ChapterSN, VerseSN ASC',
    bookParams: () => [],
    verseParams: (bookId: number, chapter: number) => [bookId, chapter],
    searchParams: (query: string) => [`%${query}%`],
  },
  asv: {
    dbName: 'ASV.db',
    asset: require('../assets/ASV.db'),
    booksQuery:
      'SELECT b.id AS SN, b.name AS FullName, b.name AS ShortName, CASE WHEN b.id <= 39 THEN 0 ELSE 1 END AS NewOrOld, MAX(v.chapter) AS ChapterNumber FROM ASV_books b JOIN ASV_verses v ON v.book_id = b.id GROUP BY b.id ORDER BY b.id ASC',
    versesQuery:
      'SELECT id AS ID, book_id AS VolumeSN, chapter AS ChapterSN, verse AS VerseSN, TRIM(text) AS Lection FROM ASV_verses WHERE book_id = ? AND chapter = ? ORDER BY verse ASC',
    searchQuery:
      'SELECT id AS ID, book_id AS VolumeSN, chapter AS ChapterSN, verse AS VerseSN, TRIM(text) AS Lection FROM ASV_verses WHERE text LIKE ? ORDER BY book_id, chapter, verse ASC',
    bookParams: () => [],
    verseParams: (bookId: number, chapter: number) => [bookId, chapter],
    searchParams: (query: string) => [`%${query}%`],
  },
  ncv: {
    dbName: 'bible_ncv.db',
    useApi: true,
    booksQuery:
      'SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN ASC',
    versesQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE VolumeSN = ? AND ChapterSN = ? AND Version = "ncv" ORDER BY VerseSN ASC',
    searchQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE Lection LIKE ? AND Version = "ncv" ORDER BY VolumeSN, ChapterSN, VerseSN ASC',
    bookParams: () => [],
    verseParams: (bookId: number, chapter: number) => [bookId, chapter],
    searchParams: (query: string) => [`%${query}%`],
  },
} as const as Record<string, VersionConfig>;


export type BibleVersionKey = keyof typeof VERSION_CONFIG;

let activeVersion: BibleVersionKey = 'cuv';

export interface BibleBook {
  SN: number;
  FullName: string;
  ShortName: string;
  NewOrOld: number; // 0: Old, 1: New
  ChapterNumber: number;
}

export interface BibleVerse {
  ID: number;
  VolumeSN: number;
  ChapterSN: number;
  VerseSN: number;
  Lection: string;
}

let db: SQLite.SQLiteDatabase | null = null;

const ensureDatabaseReady = async (version: BibleVersionKey) => {
  const config = VERSION_CONFIG[version];
  
  // 如果使用API，不需要本地数据库
  if (config.useApi) {
    return null;
  }
  
  const { dbName, asset } = config;
  if (!asset) {
    throw new Error(`No asset defined for version: ${version}`);
  }
  
  const dbDir = FileSystem.documentDirectory + 'SQLite';
  const dbPath = dbDir + '/' + dbName;

  const fileInfo = await FileSystem.getInfoAsync(dbPath);

  if (!fileInfo.exists) {
    console.log(`Database ${dbName} does not exist, copying from assets...`);
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const dbAsset = Asset.fromModule(asset);
    await dbAsset.downloadAsync();

    if (dbAsset.localUri) {
      await FileSystem.copyAsync({
        from: dbAsset.localUri,
        to: dbPath,
      });
      console.log(`Database ${dbName} copied successfully.`);
    } else {
      throw new Error(`Failed to get local URI for database asset: ${dbName}`);
    }
  }

  return dbPath;
};

export const initDatabase = async () => {
  const config = VERSION_CONFIG[activeVersion];
  
  // 如果使用API，不需要初始化数据库
  if (config.useApi) {
    return null;
  }
  
  if (db) return db;

  const { dbName } = config;
  await ensureDatabaseReady(activeVersion);
  db = await SQLite.openDatabaseAsync(dbName);
  return db;
};

export const setActiveBibleVersion = async (version: BibleVersionKey) => {
  if (version === activeVersion) return;

  // 关闭旧数据库（如果有）
  if (db) {
    try {
      await db.closeAsync();
    } catch (error) {
      console.warn('Failed to close existing database', error);
    }
    db = null;
  }

  activeVersion = version;
  
  // 如果不是API模式，初始化数据库
  const config = VERSION_CONFIG[activeVersion];
  if (!config.useApi) {
    await initDatabase();
  }
};

export const getActiveBibleVersion = () => activeVersion;

export const getBooks = async (): Promise<BibleBook[]> => {
  const config = VERSION_CONFIG[activeVersion];
  
  if (config.useApi) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bible/books?version=${activeVersion}`);
      if (!response.ok) throw new Error('Failed to fetch books from API');
      const data = await response.json();
      return data as BibleBook[];
    } catch (error) {
      console.error('Failed to fetch books from API:', error);
      throw error;
    }
  }
  
  const database = await initDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  const rows = await database.getAllAsync<any>(
    config.booksQuery,
    config.bookParams ? config.bookParams() : []
  );
  return rows as BibleBook[];
};

export const getVerses = async (bookId: number, chapter: number): Promise<BibleVerse[]> => {
  const config = VERSION_CONFIG[activeVersion];
  
  if (config.useApi) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bible/verses?version=${activeVersion}&book=${bookId}&chapter=${chapter}`);
      if (!response.ok) throw new Error('Failed to fetch verses from API');
      const data = await response.json();
      return data as BibleVerse[];
    } catch (error) {
      console.error('Failed to fetch verses from API:', error);
      throw error;
    }
  }
  
  const database = await initDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  const rows = await database.getAllAsync<any>(
    config.versesQuery,
    config.verseParams ? config.verseParams(bookId, chapter) : [bookId, chapter]
  );
  return rows as BibleVerse[];
};

export const getBook = async (bookId: number): Promise<BibleBook | null> => {
  const books = await getBooks();
  return books.find(b => b.SN === bookId) ?? null;
};

export const searchVerses = async (query: string): Promise<BibleVerse[]> => {
  const config = VERSION_CONFIG[activeVersion];
  
  if (!config.searchQuery) return [];
  
  if (config.useApi) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bible/search?version=${activeVersion}&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search verses from API');
      const data = await response.json();
      return data as BibleVerse[];
    } catch (error) {
      console.error('Failed to search verses from API:', error);
      throw error;
    }
  }

  const database = await initDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  const rows = await database.getAllAsync<any>(
    config.searchQuery,
    config.searchParams ? config.searchParams(query) : []
  );
  return rows as BibleVerse[];
};
