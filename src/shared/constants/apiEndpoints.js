/**
 * API端点常量定义
 * 定义系统中使用的所有API端点路径，便于统一管理和维护
 */

/**
 * 思源笔记API端点
 * @type {Object}
 */
export const 思源API端点 = Object.freeze({
  /** 获取块 */
  获取块: '/api/block/getBlockInfo',
  /** 获取块属性 */
  获取块属性: '/api/attr/getBlockAttrs',
  /** 设置块属性 */
  设置块属性: '/api/attr/setBlockAttrs',
  /** 获取文档块 */
  获取文档块: '/api/filetree/getDoc',
  /** 获取文档大纲 */
  获取文档大纲: '/api/outline/getDocOutline',
  /** 导出文档 */
  导出文档: '/api/export/exportMd',
  /** 获取笔记本列表 */
  获取笔记本列表: '/api/notebook/lsNotebooks',
  /** 读取文件 */
  读取文件: '/api/file/getFile',
  /** 写入文件 */
  写入文件: '/api/file/putFile',
  /** 读取目录 */
  读取目录: '/api/file/readDir',
  /** 查询资源文件 */
  查询资源文件: '/api/search/searchAsset',
  /** 获取系统信息 */
  获取系统信息: '/api/system/getConf',
  /** 获取系统版本 */
  获取系统版本: '/api/system/version'
});

/**
 * 插件API端点
 * @type {Object}
 */
export const 插件API端点 = Object.freeze({
  /** 资源API根路径 */
  资源API根路径: '/plugins/SACAssetsManager/api',
  /** 获取资源列表 */
  获取资源列表: '/plugins/SACAssetsManager/api/assets/list',
  /** 获取资源详情 */
  获取资源详情: '/plugins/SACAssetsManager/api/assets/info',
  /** 上传资源 */
  上传资源: '/plugins/SACAssetsManager/api/assets/upload',
  /** 更新资源 */
  更新资源: '/plugins/SACAssetsManager/api/assets/update',
  /** 删除资源 */
  删除资源: '/plugins/SACAssetsManager/api/assets/delete',
  /** 获取资源分类 */
  获取资源分类: '/plugins/SACAssetsManager/api/categories/list',
  /** 更新资源分类 */
  更新资源分类: '/plugins/SACAssetsManager/api/categories/update',
  /** 搜索资源 */
  搜索资源: '/plugins/SACAssetsManager/api/search',
  /** 导入资源 */
  导入资源: '/plugins/SACAssetsManager/api/import',
  /** 导出资源 */
  导出资源: '/plugins/SACAssetsManager/api/export',
  /** 批量操作资源 */
  批量操作资源: '/plugins/SACAssetsManager/api/batch'
});

/**
 * 外部API端点
 * @type {Object}
 */
export const 外部API端点 = Object.freeze({
  /** Unsplash API */
  UNSPLASH_API: 'https://api.unsplash.com',
  /** Pexels API */
  PEXELS_API: 'https://api.pexels.com/v1',
  /** GIPHY API */
  GIPHY_API: 'https://api.giphy.com/v1'
});

/**
 * 导出所有API端点
 */
export const API端点 = Object.freeze({
  思源: 思源API端点,
  插件: 插件API端点,
  外部: 外部API端点
}); 