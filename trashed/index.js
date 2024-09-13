import { createAssetsTableWithDb } from './assets/assetsTable';
const dataBasePath = require('path').join(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'assets.db')
const db = require('better-sqlite3')(dataBasePath)
/**
 * 这必须使用直接从release里下载的vec0.dll,从npm安装的那个会报错
 */
const dllPath = require('path').join(siyuanConfig.system.workspaceDir, 'data', 'plugins', 'SACAssetsManager', 'source', 'server', 'dataBase', 'sqlite-vec-windows-x64/vec0.dll');
/**
 * 这里暂时直接手动加载算了,node包的系统字段明显写错了,
 * 导致dll根本加载不了,所以暂时直接手动加载算了,
 * 反正其实本来的处理就是直接调用下面这个指令让sqlite3加载这个dll
 */
db.loadExtension(dllPath);
/**
 * 创建assets表
 */
createAssetsTableWithDb(db)
/**
 * 创建annotations表
 */
createAnnotationsTableWithDb(db)


export default db