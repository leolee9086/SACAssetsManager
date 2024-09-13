/***
 * 使用向量查询N个最相似的资产,首先从vec_${vecName}表中查询embedding,然后从asset表中查询asset_id和内容
 * @param {string} vecName 向量表名
 * @param {number[]} embedding 向量
 * @param {number} N 查询数量
 * @returns {Promise<Array>} 返回查询结果
 */
export const queryNSimilarAssetsByVec = (db, vecName, embedding, N=10) => {
    const rows = db
        .prepare(
            `
    SELECT * FROM asset 
    WHERE id IN (
    SELECT
      asset_id,
      distance
    FROM vec_${vecName}
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
    )
  `,
        )
        .all(embedding, N);
    return rows;
};
/**
 * 传入一个stat数组对象
 * 对于其中每一条记录,如果它的更新时间大于表中已经有asset的更新时间
 * 返回数组中相应asset_id的值为true
 * 否则为false
 * 更新时间存储在传入对象的updated和表中的updated字段
 */

export const needUpdate = (db, stats) => {
    // 提取stats中的asset_id和updated字段
    const assetIdsWithUpdated = stats.map(stat => {
        return `(${stat.asset_id}, ${stat.updated}::timestamp)`; // 假设updated是JavaScript Date对象，需要转换为timestamp
    });

    // 构造SQL语句，使用子查询来比较updated字段
    const sql = `
        SELECT 
            a.id, 
            CASE 
                WHEN s.updated > a.updated THEN true
                ELSE false 
            END AS need_update
        FROM 
            asset a
        LEFT JOIN (
            SELECT asset_id as id, updated FROM (VALUES ${assetIdsWithUpdated.join(',')}) AS subquery(id, updated)
        ) s ON a.id = s.id
    `;

    // 执行SQL查询
    const results = db.prepare(sql).all();

    // 将结果转换为一个对象，以asset_id为键，need_update为值
    const needUpdateMap = results.reduce((acc, { id, need_update }) => {
        acc[id] = need_update;
        return acc;
    }, {});

    // 根据传入的stats数组，返回每个asset_id的need_update值
    return stats.map(stat => needUpdateMap[stat.asset_id]);
};
/**
 * 传入一个路径数组对象
 * 返回一个数组对象,其中包含需要更新的asset_id
 */
export const updateFstat = (db, paths) => {
    const needUpdate = needUpdate(db, paths);
    const needUpdateIds = paths.filter((path, index) => needUpdate[index]).map(path => path.asset_id);
    return needUpdateIds;
};