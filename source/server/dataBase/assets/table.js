import { runSqlWithDb } from "../utils/sqlSentence.js";
/**
 * meta存储的是一个id,用于从meta表中获取asset的元数据
 * file_uri存储的是一个uri,用于从文件系统或者任意远程空间中定位asset的实际数据
 * 其中 id 和file_uri是唯一键
 */
const _createAssetsTable=`
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_uri TEXT NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    meta TEXT NOT NULL,
    hash TEXT NOT NULL,
    UNIQUE(id,file_uri)
);
`;
/**
 * 
 * @param {*} db
 * 创建 assets 表
 */
export const createAssetsTableWithDb=(db)=>{
    runSqlWithDb(_createAssetsTable,db);
}
/***
 * 根据 id 查询 assets
 */
export const selectAssetsByID=(id,db)=>{
    return db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
}

export const selectAssetsByType=(type,db)=>{
    return db.prepare("SELECT * FROM assets WHERE type = ?").get(type);
}

export const filterAssetsByTags=(tags,db)=>{
    return db.prepare("SELECT * FROM assets WHERE tags LIKE ?").get(tags);
}

export const getAllTags=(db)=>{
    return db.prepare("SELECT DISTINCT tags FROM assets").all();
}

export const getAssetsByDirName=(dirName,db)=>{
    return db.prepare("SELECT * FROM assets WHERE file_path LIKE ?").get(dirName);
}

export const updatedAssets=(id,name,type,file_path,meta,db)=>{
    return db.prepare("UPDATE assets SET name = ?, type = ?, file_path = ?, meta = ? WHERE id = ?").run(name,type,file_path,meta,id);
}


export const deleteAssets = (id, db) => {
    // 检查 id 是否为数组，如果是数组，则处理多个 ID 的删除
    const ids = Array.isArray(id) ? id : [id];
  
    // 开始事务
    return db.transaction((trx) => {
      // 准备删除 assets 表的 SQL 语句
      const deleteAssetsSql = 'DELETE FROM assets WHERE id = ?';
      // 准备删除 annotations 表的 SQL 语句（假设存在）
      const deleteAnnotationsSql = 'DELETE FROM annotations WHERE asset_id = ?';
      // 准备删除 vectors 表的 SQL 语句（假设存在）
      const deleteVectorsSql = 'DELETE FROM vectors WHERE asset_id = ?';
      // 准备删除 meta 表的 SQL 语句（假设存在）
      const deleteMetaSql = 'DELETE FROM meta WHERE asset_id = ?';
  
      // 对每个 ID 执行删除操作
      return ids.reduce((promiseChain, currentId) => {
        return promiseChain
          .then(() => trx.prepare(deleteAssetsSql).run(currentId))
          .then(() => trx.prepare(deleteAnnotationsSql).run(currentId))
          .then(() => trx.prepare(deleteVectorsSql).run(currentId))
          .then(() => trx.prepare(deleteMetaSql).run(currentId));
      }, Promise.resolve());
    })
    .then(() => {
      // 提交事务
      return db.run('COMMIT');
    })
    .catch((err) => {
      // 事务出错时回滚
      return db.run('ROLLBACK').then(() => {
        throw err;
      });
    });
  };
  