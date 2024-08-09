/**
 * 创建metas表
 * 其中以json形式存储asset的通用元数据
 * 并特别地存储asset的color、size、属性
 * 
 * @param {*} db 
 */
const createMetasTable = (db) => {
    db.prepare(
        `CREATE TABLE IF NOT EXISTS metas (
            id TEXT NOT NULL,
            asset_id TEXT NOT NULL,
            external_json TEXT NOT NULL,
            color TEXT NOT NULL,
            size TEXT NOT NULL,
            UNIQUE(id)
        )`
    ).run();
}