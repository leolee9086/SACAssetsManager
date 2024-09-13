const Database = require('better-sqlite3')
let dbs = {}
globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs
export function 初始化数据库(dbPath, root) {
    if (dbs[root]) {
        return dbs[root]
    }
    dbs[root] = new Database(dbPath);
    dbs[root].pragma('journal_mode = WAL');
    dbs[root].pragma('synchronous = NORMAL');
    dbs[root].pragma('cache_size = 1000');
    dbs[root].pragma('temp_store = MEMORY');
    dbs[root].exec(`
        CREATE TABLE IF NOT EXISTS thumbnails (
            fullName TEXT PRIMARY KEY,
            type Text,
            statHash TEXT,
            updateTime INTEGER,
            stat TEXT,
            size INTEGER,
            ctime INTEGER,
            atime INTEGER,
            mtime INTEGER
        )
    `);
    dbs[root].prepare('CREATE INDEX IF NOT EXISTS idx_name ON thumbnails(fullName)').run();
    return dbs[root]
}