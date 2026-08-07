-- BibleID Table (Books)
CREATE TABLE IF NOT EXISTS BibleID (
    SN INTEGER PRIMARY KEY,
    KindSN INTEGER,
    ChapterNumber INTEGER,
    NewOrOld INTEGER,
    PinYin TEXT,
    ShortName TEXT,
    FullName TEXT
);

-- Bible Table (Verses)
CREATE TABLE IF NOT EXISTS Bible (
    ID INTEGER PRIMARY KEY,
    VolumeSN INTEGER,
    ChapterSN INTEGER,
    VerseSN INTEGER,
    Lection TEXT,
    SoundBegin REAL,
    SoundEnd REAL,
    Version TEXT DEFAULT 'cuv'
);

CREATE INDEX IF NOT EXISTS idx_bible_volume_chapter ON Bible(VolumeSN, ChapterSN);
CREATE INDEX IF NOT EXISTS idx_bible_version ON Bible(Version);
