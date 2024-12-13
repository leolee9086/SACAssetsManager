import { request } from '../core/request';

/**
 * 从URL添加图片
 * @param {Object} data - 图片数据
 * @param {string} data.url - 图片URL
 * @param {string} [data.name] - 图片名称
 * @param {string} [data.website] - 图片来源网站
 * @param {string[]} [data.tags] - 图片标签
 * @param {number} [data.modificationTime] - 修改时间
 * @param {string} [data.token] - API令牌
 * @param {Object} [data.headers] - 请求头
 * @param {string} [data.headers.referer] - 请求来源
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string
 * }>}
 */
export const addImageFromURL = (data, options = {}) => {
    const {
        url,
        name,
        website,
        tags,
        modificationTime,
        token,
        headers
    } = data;
    
    return request('/api/item/addFromURL', {
        method: 'POST',
        body: JSON.stringify({
            url,
            name,
            website,
            tags,
            modificationTime,
            token,
            headers
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 批量从URL添��图片
 * @param {Object} data - 批量添加数据
 * @param {Array<{
 *   url: string,
 *   name?: string,
 *   website?: string,
 *   tags?: string[],
 *   modificationTime?: number,
 *   headers?: {
 *     referer?: string
 *   }
 * }>} data.items - 图片项目数组
 * @param {string} [data.folderId] - 目标文件夹ID
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string
 * }>}
 */
export const addImagesFromURLs = (data, options = {}) => {
    const {
        items,
        folderId,
        token
    } = data;
    
    return request('/api/item/addFromURLs', {
        method: 'POST',
        body: JSON.stringify({
            items,
            folderId,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 从本地路径添加图片
 * @param {Object} data - 图片数据
 * @param {string} data.path - 本地文件路径
 * @param {string} [data.name] - 图片名称
 * @param {string} [data.website] - 图片来源网站
 * @param {string[]} [data.tags] - 图片标签
 * @param {string} [data.annotation] - 图片注释
 * @param {string} [data.folderId] - 目标文件夹ID
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string
 * }>}
 */
export const addImageFromPath = (data, options = {}) => {
    const {
        path,
        name,
        website,
        tags,
        annotation,
        folderId,
        token
    } = data;
    
    return request('/api/item/addFromPath', {
        method: 'POST',
        body: JSON.stringify({
            path,
            name,
            website,
            tags,
            annotation,
            folderId,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 批量从本地路径添加图片
 * @param {Object} data - 批量添加数据
 * @param {Array<{
 *   path: string,
 *   name?: string,
 *   website?: string,
 *   tags?: string[],
 *   annotation?: string
 * }>} data.items - 图片项目数组
 * @param {string} [data.folderId] - 目标文件夹ID
 * @param {string} [data.token] - API令牌
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string
 * }>}
 */
export const addImagesFromPaths = (data, options = {}) => {
    const {
        items,
        folderId,
        token
    } = data;
    
    return request('/api/item/addFromPaths', {
        method: 'POST',
        body: JSON.stringify({
            items,
            folderId,
            token
        }),
        redirect: 'follow'
    }, options);
};

/**
 * 添加书签到Eagle
 * @param {Object} params - 书签参数
 * @param {string} params.url - 书签URL
 * @param {string} params.name - 书签名称 
 * @param {string[]} params.tags - 标签数组
 * @param {string} params.base64 - 图片base64数据
 * @param {string} params.token - API token
 * @returns {Promise} 返回添加结果
 */
async function addBookmark(params) {
  try {
    const response = await fetch("http://localhost:41595/api/item/addBookmark", {
      method: 'POST',
      body: JSON.stringify({
        url: params.url,
        token: params.token,
        name: params.name,
        tags: params.tags,
        base64: params.base64
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('添加书签失败:', error);
    throw error;
  }
}

/**
 * 获取Eagle项目中的项目信息
 * @param {Object} params - 请求参数
 * @param {string} params.id - 项目ID
 * @param {string} params.token - API token
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,
 *     name: string,
 *     size: number,
 *     ext: string,
 *     tags: string[],
 *     folders: string[],
 *     isDeleted: boolean,
 *     url: string,
 *     annotation: string,
 *     modificationTime: number,
 *     width: number,
 *     height: number,
 *     noThumbnail: boolean,
 *     lastModified: number,
 *     palettes: Array<{
 *       color: number[],
 *       ratio: number,
 *       $$hashKey: string
 *     }>
 *   }
 * }>} 返回项目详细信息
 */
async function getItemInfo(params) {
  try {
    const response = await fetch(`http://localhost:41595/api/item/info?token=${params.token}&id=${params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('获取项目信息失败:', error);
    throw error;
  }
}

/**
 * 将项目移动到回收站
 * @param {Object} params - 请求参数
 * @param {string[]} params.itemIds - 要移动到回收站的项目ID数组
 * @param {string} params.token - API token
 * @returns {Promise<{status: string}>} 返回操作结果
 */
async function moveToTrash(params) {
  try {
    const response = await fetch("http://localhost:41595/api/item/moveToTrash", {
      method: 'POST',
      body: JSON.stringify({
        itemIds: params.itemIds,
        token: params.token
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('移动到回收站失败:', error);
    throw error;
  }
}

/**
 * 获取项目缩略图路径
 * @param {Object} params - 请求参数
 * @param {string} params.id - 项目ID
 * @param {string} params.token - API token
 * @returns {Promise<{
 *   status: string,
 *   data: string
 * }>} 返回缩略图本地路径
 */
async function getThumbnail(params) {
  try {
    const response = await fetch(`http://localhost:41595/api/item/thumbnail?token=${params.token}&id=${params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('获取缩略图失败:', error);
    throw error;
  }
}

/**
 * 获取项目列表
 * @param {Object} params - 请求参数
 * @param {string} params.token - API token
 * @param {string} [params.orderBy] - 排序方式 (-RESOLUTION, NAME等)
 * @param {number} [params.limit] - 限制返回数量
 * @param {string} [params.ext] - 文件扩展名过滤
 * @param {string} [params.name] - 文件名过滤
 * @param {string} [params.folders] - 文件夹ID过滤
 * @param {string} [params.tags] - 标签过滤,多个标签用逗号分隔
 * @returns {Promise<{
 *   status: string,
 *   data: Array<{
 *     id: string,
 *     name: string,
 *     size: number,
 *     ext: string,
 *     tags: string[],
 *     folders: string[],
 *     isDeleted: boolean,
 *     url: string,
 *     annotation: string,
 *     modificationTime: number,
 *     height: number,
 *     width: number,
 *     lastModified: number,
 *     palettes: Array<{
 *       color: number[],
 *       ratio: number
 *     }>
 *   }>
 * }>} 返回项目列表
 */
async function getItemList(params) {
  try {
    // 构建查询参数
    const queryParams = new URLSearchParams({
      token: params.token
    });

    // 添加可选参数
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.ext) queryParams.append('ext', params.ext);
    if (params.name) queryParams.append('name', params.name);
    if (params.folders) queryParams.append('folders', params.folders);
    if (params.tags) queryParams.append('tags', params.tags);

    const response = await fetch(`http://localhost:41595/api/item/list?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('获取项目列表失败:', error);
    throw error;
  }
}

/**
 * 刷新项目的调色板信息
 * @param {Object} params - 请求参数
 * @param {string} params.id - 项目ID
 * @param {string} params.token - API token
 * @returns {Promise<{status: string}>} 返回操作结果
 */
async function refreshPalette(params) {
  try {
    const response = await fetch(`http://localhost:41595/api/item/refreshPalette?token=${params.token}`, {
      method: 'POST',
      body: JSON.stringify({
        id: params.id
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('刷新调色板失败:', error);
    throw error;
  }
}

/**
 * 刷新项目的缩略图
 * @param {Object} params - 请求参数
 * @param {string} params.id - 项目ID
 * @param {string} params.token - API token
 * @returns {Promise<{status: string}>} 返回操作结果
 */
async function refreshThumbnail(params) {
  try {
    const response = await fetch("http://localhost:41595/api/item/refreshThumbnail", {
      method: 'POST',
      body: JSON.stringify({
        id: params.id,
        token: params.token
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('刷新缩略图失败:', error);
    throw error;
  }
}

/**
 * 更新项目信息
 * @param {Object} params - 请求参数
 * @param {string} params.id - 项目ID
 * @param {string[]} [params.tags] - 标签数组
 * @param {string} [params.annotation] - 注释
 * @param {string} [params.url] - URL
 * @param {number} [params.star] - 星级评分(0-5)
 * @param {string} params.token - API token
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     id: string,
 *     name: string,
 *     size: number,
 *     ext: string,
 *     tags: string[],
 *     folders: string[],
 *     isDeleted: boolean,
 *     url: string,
 *     annotation: string,
 *     modificationTime: number,
 *     width: number,
 *     height: number,
 *     noThumbnail: boolean,
 *     lastModified: number,
 *     palettes: Array<{
 *       color: number[],
 *       ratio: number,
 *       $$hashKey: string
 *     }>,
 *     star: number
 *   }
 * }>} 返回更新后的项目信息
 */
async function updateItem(params) {
  try {
    const response = await fetch("http://localhost:41595/api/item/update", {
      method: 'POST',
      body: JSON.stringify({
        id: params.id,
        tags: params.tags,
        annotation: params.annotation,
        url: params.url,
        star: params.star,
        token: params.token
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('更新项目失败:', error);
    throw error;
  }
}

// 导出所有函数
export {
  addImageFromURL,
  addImagesFromURLs,
  addImageFromPath,
  addImagesFromPaths,
  addBookmark,
  getItemInfo,
  moveToTrash,
  getThumbnail,
  getItemList,
  refreshPalette,
  refreshThumbnail,
  updateItem
};
