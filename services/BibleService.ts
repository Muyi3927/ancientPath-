import initSqlJs, { Database } from 'sql.js';

export type BibleVersion = 'cuv' | 'asv';

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

const databases: Record<string, Database | undefined> = {};
const initPromises: Record<string, Promise<void> | undefined> = {};

const DB_CONFIG = {
  cuv: {
    file: '/bible_cuv.db',
    queries: {
      books: "SELECT SN, FullName, ShortName, NewOrOld, ChapterNumber FROM BibleID ORDER BY SN ASC",
      verses: "SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE VolumeSN = :bookId AND ChapterSN = :chapter ORDER BY VerseSN ASC",
      search: "SELECT ID, VolumeSN, ChapterSN, VerseSN, Lection FROM Bible WHERE Lection LIKE :query LIMIT 100"
    }
  },
  asv: {
    file: '/ASV.db',
    queries: {
      books: "SELECT b.id AS SN, b.name AS FullName, b.name AS ShortName, CASE WHEN b.id <= 39 THEN 0 ELSE 1 END AS NewOrOld, MAX(v.chapter) AS ChapterNumber FROM ASV_books b JOIN ASV_verses v ON v.book_id = b.id GROUP BY b.id ORDER BY b.id ASC",
      verses: "SELECT id AS ID, book_id AS VolumeSN, chapter AS ChapterSN, verse AS VerseSN, TRIM(text) AS Lection FROM ASV_verses WHERE book_id = :bookId AND chapter = :chapter ORDER BY verse ASC",
      search: "SELECT id AS ID, book_id AS VolumeSN, chapter AS ChapterSN, verse AS VerseSN, TRIM(text) AS Lection FROM ASV_verses WHERE text LIKE :query LIMIT 100"
    }
  }
};

const initDB = async (version: BibleVersion) => {
  if (databases[version]) return;
  if (initPromises[version]) return initPromises[version];

  initPromises[version] = (async () => {
    try {
      // Load sql.js wasm
      const SQL = await initSqlJs({
        locateFile: (file: any) => `https://sql.js.org/dist/${file}` 
      });

      // Fetch the database file
      const response = await fetch(DB_CONFIG[version].file);
      const buffer = await response.arrayBuffer();
      
      databases[version] = new SQL.Database(new Uint8Array(buffer));
    } catch (e) {
      console.error(`Failed to initialize Bible DB (${version})`, e);
      throw e;
    }
  })();

  return initPromises[version];
};

export const getBooks = async (version: BibleVersion = 'cuv'): Promise<BibleBook[]> => {
  await initDB(version);
  const db = databases[version];
  if (!db) throw new Error("Database not initialized");

  const result = db.exec(DB_CONFIG[version].queries.books);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row: any[]) => {
    const book: any = {};
    columns.forEach((col: string, index: number) => {
      book[col] = row[index];
    });
    return book as BibleBook;
  });
};

export const getVerses = async (bookId: number, chapter: number, version: BibleVersion = 'cuv'): Promise<BibleVerse[]> => {
  await initDB(version);
  const db = databases[version];
  if (!db) throw new Error("Database not initialized");

  const stmt = db.prepare(DB_CONFIG[version].queries.verses);
  const verses: BibleVerse[] = [];
  
  stmt.bind({ ':bookId': bookId, ':chapter': chapter });
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    verses.push(row as unknown as BibleVerse);
  }
  stmt.free();
  
  return verses;
};

export const searchVerses = async (query: string, version: BibleVersion = 'cuv'): Promise<BibleVerse[]> => {
    await initDB(version);
    const db = databases[version];
    if (!db) throw new Error("Database not initialized");

    const stmt = db.prepare(DB_CONFIG[version].queries.search);
    const verses: BibleVerse[] = [];
    
    stmt.bind({ ':query': `%${query}%` });
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      verses.push(row as unknown as BibleVerse);
    }
    stmt.free();
    
    return verses;
}
