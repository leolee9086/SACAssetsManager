const dataBasePath = require('path').join(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'assets.db')
const db = require('better-sqlite3')(dataBasePath)
/**
 * 这必须使用直接从release里下载的vec0.dll,从npm安装的那个会报错
 */
const dllPath = require('path').join(siyuanConfig.system.workspaceDir, 'data', 'plugins', 'SACAssetsManager', 'source', 'server', 'dataBase', 'sqlite-vec-windows-x64/vec0.dll');
/**
 * 这里暂时直接手动加载算了,node包的系统字段明显写错了,
 * 导致dll根本加载不了,所以暂时直接手动加载算了,
 * 其实所谓适配了better-sqlite3的node包,真实处理就是直接调用下面这个指令让sqlite3加载这个dll
 * 而且,node包里面打包的那个vec0.dll在electron里反正是加载不了的,不如自己拉dll
 */
db.loadExtension(dllPath);
const { vec_version } = db
    .prepare("select vec_version() as vec_version;")
    .get();

const createAssetsTable = `
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    creator_id INTEGER,
    license TEXT,
    usage_rights TEXT
);
`;
const createAnnotationsTable = `
CREATE TABLE IF NOT EXISTS annotations (
    asset_id TEXT NOT NULL,
    annotation_id TEXT NOT NULL,
    annotation_type TEXT NOT NULL,
    block_id TEXT,
    page INTEGER NOT NULL,
    section INTEGER NOT NULL,
    start INTEGER NOT NULL,
    end INTEGER NOT NULL,
    rectangle BLOB NOT NULL, 
    timestamp TEXT NOT NULL,
    author TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    interactive BOOLEAN NOT NULL,
    PRIMARY KEY (asset_id, annotation_id)
);
`;
const createVecTable = `
CREATE VIRTUAL TABLE IF NOT EXISTS vec_items USING vec0(embedding float[2536])
`;
db.prepare(createAnnotationsTable).run();
db.prepare(createAssetsTable).run();
db.prepare(createVecTable).run();
export default db