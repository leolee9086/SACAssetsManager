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


function 更新图片尺寸(e, 卡片数据, 目标宽度, 更新尺寸回调) {
    const 预览器 = e.target;
    const { naturalWidth, naturalHeight } = 预览器;
    const 缩放因子 = naturalWidth / 目标宽度;
    let 新高度 = naturalHeight / 缩放因子;
    displayMode.value === LAYOUT_ROW ? 新高度 = size.value : null
    // 使用回调函数来更新 Vue 的状态
    更新尺寸回调({ width: 卡片数据.width, height: cardRoot.value ? cardRoot.value.getBoundingClientRect().height : size.value })
}