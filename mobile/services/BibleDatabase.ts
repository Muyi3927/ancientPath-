import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

type VersionConfig = {
  dbName: string;
  asset: number;
  booksQuery: string;
  versesQuery: string;
  bookParams?: () => any[];
  verseParams?: (bookId: number, chapter: number) => any[];
};

const VERSION_CONFIG = {
  cuv: {
    dbName: 'bible_cuv.db',
    asset: require('../assets/bible_cuv.db'),
    booksQuery:
      'SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN ASC',
    versesQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE VolumeSN = ? AND ChapterSN = ? ORDER BY VerseSN ASC',
    bookParams: () => [],
    verseParams: (bookId, chapter) => [bookId, chapter],
  },
  cnv: {
    dbName: 'bible_cnv.db',
    asset: require('../assets/bible_cnv.db'),
    booksQuery:
      'SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN ASC',
    versesQuery:
      'SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE VolumeSN = ? AND ChapterSN = ? ORDER BY VerseSN ASC',
    bookParams: () => [],
    verseParams: (bookId, chapter) => [bookId, chapter],
  },
  asv: {
    dbName: 'ASV.db',
    asset: require('../assets/ASV.db'),
    booksQuery:
      'SELECT b.id AS SN, b.name AS FullName, b.name AS ShortName, CASE WHEN b.id <= 39 THEN 0 ELSE 1 END AS NewOrOld, MAX(v.chapter) AS ChapterNumber FROM ASV_books b JOIN ASV_verses v ON v.book_id = b.id GROUP BY b.id ORDER BY b.id ASC',
    versesQuery:
      'SELECT id AS ID, book_id AS VolumeSN, chapter AS ChapterSN, verse AS VerseSN, TRIM(text) AS Lection FROM ASV_verses WHERE book_id = ? AND chapter = ? ORDER BY verse ASC',
    bookParams: () => [],
    verseParams: (bookId, chapter) => [bookId, chapter],
  },
} as const satisfies Record<string, VersionConfig>;

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
  const { dbName, asset } = VERSION_CONFIG[version];
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
  if (db) return db;

  const { dbName } = VERSION_CONFIG[activeVersion];
  await ensureDatabaseReady(activeVersion);
  db = await SQLite.openDatabaseAsync(dbName);
  return db;
};

export const setActiveBibleVersion = async (version: BibleVersionKey) => {
  if (version === activeVersion) return;

  if (db) {
    try {
      await db.closeAsync();
    } catch (error) {
      console.warn('Failed to close existing database', error);
    }
    db = null;
  }

  activeVersion = version;
  await initDatabase();
};

export const getActiveBibleVersion = () => activeVersion;

export const getBooks = async (): Promise<BibleBook[]> => {
  const database = await initDatabase();
  const config = VERSION_CONFIG[activeVersion];
  const rows = await database.getAllAsync<any>(
    config.booksQuery,
    config.bookParams ? config.bookParams() : []
  );
  return rows as BibleBook[];
};

export const getVerses = async (bookId: number, chapter: number): Promise<BibleVerse[]> => {
  const database = await initDatabase();
  const config = VERSION_CONFIG[activeVersion];
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
