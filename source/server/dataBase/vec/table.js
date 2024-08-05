/**
 * 根据向量名和维度创建向量表
 * @param {*} db 
 * @param {*} vecName 
 * @param {*} dimension 
 */
export const createVecTableByVecDefine = (db, vecName, dimension) => {
    // 构造SQL语句，添加asset_id字段
    const createTableSQL = `
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_${vecName} USING vec0(
        asset_id INTEGER PRIMARY KEY,
        embedding float[${dimension}]
    )
    `;
    // 执行SQL语句，创建表
    db.exec(createTableSQL);
};

/**
 * 根据向量名和asset_id插入,如果没有相应的表,先创建
 */
export const insertVecTableByVecDefine = (db, vecName, dimension, asset_id, embedding) => {
    createVecTableByVecDefine(db, vecName, dimension);
    db.prepare(`INSERT INTO vec_${vecName} (asset_id, embedding) VALUES (?, ?)`)
        .run(asset_id, embedding);
};

/**
 * 将表中的向量导出为数组形式
 */
export const dumpVecTableByVecDefine = (db, vecName) => {
    return db.prepare(`SELECT * FROM vec_${vecName}`).all();
};
/**
 * 批量更新向量
 */
export const updateVecTableByVecDefine = (db, vecName, asset_ids, embeddings) => {
    // 准备SQL语句模板
    const sql = `UPDATE vec_${vecName} SET embedding = ? WHERE asset_id = ?`;
    // 创建一个prepared statement
    const stmt = db.prepare(sql);
    // 遍历asset_ids和embeddings数组，确保它们长度相同
    if (asset_ids.length !== embeddings.length) {
        throw new Error('asset_ids and embeddings must have the same length');
    }
    // 执行批量更新
    for (let i = 0; i < asset_ids.length; i++) {
        // 运行prepared statement，传入embedding和asset_id
        stmt.run([embeddings[i], asset_ids[i]]);
    }
    // 最后，销毁prepared statement
    stmt.free();
};
