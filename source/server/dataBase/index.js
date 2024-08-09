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
 * 其实所谓适配了better-sqlite3的node包,真实处理就是直接调用下面这个指令让sqlite3加载这个dll
 * 而且,node包里面打包的那个vec0.dll在electron里反正是加载不了的,不如自己拉dll
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