import { request } from '../core/request';

/**
 * 创建文件夹
 * @param {Object} data - 文件夹数据
 * @param {string} data.folderName - 文件夹名称
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,              // 文件夹ID
 *     name: string,            // 文件夹名称
 *     images: Array,           // 图片列表
 *     folders: Array,          // 子文件夹列表
 *     modificationTime: number, // 修改时间
 *     imagesMappings: Object,  // 图片映射
 *     tags: Array,             // 标签列表
 *     children: Array,         // 子项目
 *     isExpand: boolean        // 是否展开
 *   }
 * }>}
 */
export const createFolder = (data, options = {}) => {
    const { folderName, token } = data;
    
    return request('/api/folder/create', {
        method: 'POST',
        body: JSON.stringify({
            folderName,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 创建子文件夹
 * @param {Object} data - 子文件夹数据
 * @param {string} data.folderName - 文件夹名称
 * @param {string} data.parent - 父文件夹ID
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,              // 文件夹ID
 *     name: string,            // 文件夹名称
 *     images: Array,           // 图片列表
 *     folders: Array,          // 子文件夹列表
 *     modificationTime: number, // 修改时间
 *     imagesMappings: Object,  // 图片映射
 *     tags: Array,             // 标签列表
 *     parent: string,          // 父文件夹ID
 *     children: Array,         // 子项目
 *     isExpand: boolean        // 是否展开
 *   }
 * }>}
 */
export const createSubFolder = (data, options = {}) => {
    const { folderName, parent, token } = data;
    
    return request('/api/folder/create', {
        method: 'POST',
        body: JSON.stringify({
            folderName,
            parent,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 重命名文件夹
 * @param {Object} data - 重命名数据
 * @param {string} data.folderId - 文件夹ID
 * @param {string} data.newName - 新文件夹名称
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,              // 文件夹ID
 *     name: string,            // 文件夹名称
 *     images: Array,           // 图片列表
 *     folders: Array,          // 子文件夹列表
 *     modificationTime: number, // 修改时间
 *     imagesMappings: Object,  // 图片映射
 *     tags: Array,             // 标签列表
 *     children: Array,         // 子项目
 *     isExpand: boolean,       // 是否展开
 *     size: number,            // 文件夹大小
 *     vstype: string,          // 视图类型
 *     styles: {                // 样式信息
 *       depth: number,         // 深度
 *       first: boolean,        // 是否第一个
 *       last: boolean          // 是否最后一个
 *     },
 *     isVisible: boolean,      // 是否可见
 *     newFolderName: string,   // 新文件夹名称
 *     editable: boolean,       // 是否可编辑
 *     pinyin: string          // 拼音
 *   }
 * }>}
 */
export const renameFolder = (data, options = {}) => {
    const { folderId, newName, token } = data;
    
    return request('/api/folder/rename', {
        method: 'POST',
        body: JSON.stringify({
            folderId,
            newName,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 更新文件夹
 * @param {Object} data - 更新数据
 * @param {string} data.folderId - 文件夹ID
 * @param {string} [data.newName] - 新文件夹名称
 * @param {string} [data.newDescription] - 新描述
 * @param {string} [data.newColor] - 新颜色
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,              // 文件夹ID
 *     name: string,            // 文件夹名称
 *     description: string,     // 文件夹描述
 *     images: Array,           // 图片列表
 *     folders: Array,          // 子文件夹列表
 *     modificationTime: number, // 修改时间
 *     imagesMappings: Object,  // 图片映射
 *     tags: Array,             // 标签列表
 *     children: Array,         // 子项目
 *     isExpand: boolean,       // 是否展开
 *     size: number,            // 文件夹大小
 *     vstype: string,          // 视图类型
 *     styles: {                // 样式信息
 *       depth: number,         // 深度
 *       first: boolean,        // 是否第一个
 *       last: boolean          // 是否最后一个
 *     },
 *     isVisible: boolean,      // 是否可见
 *     editable: boolean        // 是否可编辑
 *   }
 * }>}
 */
export const updateFolder = (data, options = {}) => {
    const { 
        folderId, 
        newName, 
        newDescription, 
        newColor, 
        token 
    } = data;
    
    return request('/api/folder/update', {
        method: 'POST',
        body: JSON.stringify({
            folderId,
            newName,
            newDescription,
            newColor,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 获取所有文件夹列表
 * @param {Object} [data] - 请求数据
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     description: string,        // 文件夹描述
 *     children: Array,            // 子文件夹
 *     modificationTime: number,   // 修改时间
 *     tags: string[],             // 标签列表
 *     imageCount: number,         // 图片数量
 *     descendantImageCount: number, // 包含子文件夹的总图片数量
 *     pinyin: string,             // 拼音
 *     extendTags: string[]        // 扩展标签
 *   }>
 * }>}
 */
export const getFolderList = (data = {}, options = {}) => {
    const { token } = data;
    const queryString = token ? `?token=${token}` : '';
    
    return request(`/api/folder/list${queryString}`, {
        method: 'GET',
        redirect: 'follow'
    }, options);
};

/**
 * 获取最近使用的文件夹列表
 * @param {Object} [data] - 请求数据
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,                 // 文件夹ID
 *     name: string,               // 文件夹名称
 *     description: string,        // 文件夹描述
 *     children: Array,            // 子文件夹
 *     modificationTime: number,   // 修改时间
 *     tags: string[],             // 标签列表
 *     password: string,           // 密码
 *     passwordTips: string,       // 密码提示
 *     images: Array,              // 图片列表
 *     isExpand: boolean,          // 是否展开
 *     newFolderName: string,      // 新文件夹名称
 *     imagesMappings: Object,     // 图片映射
 *     imageCount: number,         // 图片数量
 *     descendantImageCount: number, // 包含子文件夹的总图片数量
 *     pinyin: string,             // 拼音
 *     extendTags: string[]        // 扩展标签
 *   }>
 * }>}
 */
export const getRecentFolders = (data = {}, options = {}) => {
    const { token } = data;
    const queryString = token ? `?token=${token}` : '';
    
    return request(`/api/folder/listRecent${queryString}`, {
        method: 'GET',
        redirect: 'follow'
    }, options);
};

// 导出所有函数
export {
  createFolder,
  createSubFolder,
  renameFolder,
  updateFolder,
  getFolderList,
  getRecentFolders
};