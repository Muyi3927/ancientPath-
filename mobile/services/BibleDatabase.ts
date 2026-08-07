import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

type VersionConfig = {
  dbName: string;
  asset?: number;
  assetVersion?: number;
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
    assetVersion: 1,
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
    assetVersion: 1,
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
    asset: require('../assets/bible_ncv.db'),
    assetVersion: 2,
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
  bilingual: {
    dbName: 'bible_bilingual.db',
    asset: require('../assets/bible_bilingual.db'),
    assetVersion: 1,
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

// 解析经文文本，分离中英文
export interface ParsedVerse {
  chinese: string;
  english: string;
  hasBilingual: boolean;
}

export const parseVerseLection = (lection: string): ParsedVerse => {
  const parts = lection.split(' | ');
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return {
      chinese: parts[0].trim(),
      english: parts[1].trim(),
      hasBilingual: true,
    };
  }
  return {
    chinese: lection,
    english: '',
    hasBilingual: false,
  };
};

// 每个版本维护独立的数据库实例，避免频繁开关
const dbInstances: Partial<Record<string, SQLite.SQLiteDatabase>> = {};

const DB_ASSET_VERSION_META = 'db_asset_versions.json';

const readDbAssetVersions = async (dbDir: string): Promise<Record<string, number>> => {
  const metaPath = `${dbDir}/${DB_ASSET_VERSION_META}`;
  const metaInfo = await FileSystem.getInfoAsync(metaPath);
  if (!metaInfo.exists) return {};

  try {
    const raw = await FileSystem.readAsStringAsync(metaPath);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number') result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
};

const writeDbAssetVersions = async (dbDir: string, versions: Record<string, number>) => {
  const metaPath = `${dbDir}/${DB_ASSET_VERSION_META}`;
  await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(versions));
};

const ensureDatabaseCopied = async (version: BibleVersionKey): Promise<string> => {
  const config = VERSION_CONFIG[version];
  if (!config.asset) {
    throw new Error(`No asset defined for version: ${version}`);
  }

  const dbDir = FileSystem.documentDirectory + 'SQLite';
  const dbPath = dbDir + '/' + config.dbName;
  const targetAssetVersion = config.assetVersion ?? 1;

  const dirInfo = await FileSystem.getInfoAsync(dbDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
  }

  const versions = await readDbAssetVersions(dbDir);

  const fileInfo = await FileSystem.getInfoAsync(dbPath);
  const existingVersion = versions[config.dbName] ?? 0;
  if (fileInfo.exists && existingVersion >= targetAssetVersion) {
    return dbPath;
  }

  // 数据库文件不存在，需要从 asset 复制
  console.log(
    `Refreshing database ${config.dbName} from assets (local v${existingVersion} -> asset v${targetAssetVersion})...`
  );

  const dbAsset = Asset.fromModule(config.asset);
  // 如果 asset 已有本地 URI（原生构建内嵌），不需要网络下载
  if (!dbAsset.localUri) {
    await dbAsset.downloadAsync();
  }

  if (!dbAsset.localUri) {
    throw new Error(`Failed to get local URI for database asset: ${config.dbName}`);
  }

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(dbPath, { idempotent: true });
  }

  await FileSystem.copyAsync({
    from: dbAsset.localUri,
    to: dbPath,
  });

  versions[config.dbName] = targetAssetVersion;
  await writeDbAssetVersions(dbDir, versions);
  console.log(`Database ${config.dbName} copied successfully.`);
  return dbPath;
};

const getDatabase = async (version: BibleVersionKey): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstances[version]) {
    return dbInstances[version]!;
  }

  await ensureDatabaseCopied(version);
  const database = await SQLite.openDatabaseAsync(VERSION_CONFIG[version].dbName);
  dbInstances[version] = database;
  return database;
};

export const initDatabase = async () => {
  const config = VERSION_CONFIG[activeVersion];
  if (config.useApi) return null;
  return getDatabase(activeVersion);
};

export const setActiveBibleVersion = async (version: BibleVersionKey) => {
  if (version === activeVersion) return;
  activeVersion = version;
  
  // 如果不是API模式，预加载数据库
  const config = VERSION_CONFIG[activeVersion];
  if (!config.useApi) {
    await getDatabase(activeVersion);
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
  
  const database = await getDatabase(activeVersion);
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
  
  const database = await getDatabase(activeVersion);
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

  const database = await getDatabase(activeVersion);
  const rows = await database.getAllAsync<any>(
    config.searchQuery,
    config.searchParams ? config.searchParams(query) : []
  );
  return rows as BibleVerse[];
};
