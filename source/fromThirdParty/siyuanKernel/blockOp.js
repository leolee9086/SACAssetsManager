import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送块操作相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendBlockOpRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/block/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `块操作${endpoint}`);
  }
};

/**
 * 移动大纲标题
 * @param {Object} options - 移动选项
 * @param {string} options.id - 块ID
 * @param {string} [options.parentID] - 父块ID
 * @param {string} [options.previousID] - 前一个块ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const moveOutlineHeading = (options, apiOptions = {}) => {
  if (!options?.id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('moveOutlineHeading', options, apiOptions);
};

/**
 * 在日记中追加块
 * @param {Object} options - 追加选项
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {string} options.notebook - 笔记本ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const appendDailyNoteBlock = (options, apiOptions = {}) => {
  if (!options?.notebook || !options?.data) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和块内容不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('appendDailyNoteBlock', options, apiOptions);
};

/**
 * 在日记中前置块
 * @param {Object} options - 前置选项
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {string} options.notebook - 笔记本ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const prependDailyNoteBlock = (options, apiOptions = {}) => {
  if (!options?.notebook || !options?.data) {
    return Promise.resolve({
      code: -1,
      msg: '笔记本ID和块内容不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('prependDailyNoteBlock', options, apiOptions);
};

/**
 * 展开块
 * @param {string} id - 块ID
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const unfoldBlock = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('unfoldBlock', { id }, options);
};

/**
 * 折叠块
 * @param {string} id - 块ID
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const foldBlock = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('foldBlock', { id }, options);
};

/**
 * 移动块
 * @param {Object} options - 移动选项
 * @param {string} options.id - 块ID
 * @param {string} [options.parentID] - 父块ID
 * @param {string} [options.previousID] - 前一个块ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const moveBlock = (options, apiOptions = {}) => {
  if (!options?.id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  // 检查 previousID 不能是文档块 ID
  if (options.previousID) {
    const blockTree = window.siyuan?.blockTree?.[options.previousID];
    if (!blockTree || blockTree.type === 'd') {
      return Promise.resolve({
        code: -1,
        msg: 'previousID不能是文档块ID',
        data: null
      });
    }
  }
  return sendBlockOpRequest('moveBlock', options, apiOptions);
};

/**
 * 插入块
 * @param {Object} options - 插入选项
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {string} options.previousID - 前一个块ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const insertBlock = (options, apiOptions = {}) => {
  if (!options?.data) {
    return Promise.resolve({
      code: -1,
      msg: '块内容不能为空',
      data: null
    });
  }
  if (options.dataType && !['markdown', 'dom'].includes(options.dataType)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的数据类型，必须是 markdown 或 dom',
      data: null
    });
  }
  return sendBlockOpRequest('insertBlock', options, apiOptions);
};

/**
 * 更新块
 * @param {Object} options - 更新选项
 * @param {string} options.id - 块ID
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const updateBlock = (options, apiOptions = {}) => {
  if (!options?.id || !options?.data) {
    return Promise.resolve({
      code: -1,
      msg: '块ID和内容不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('updateBlock', options, apiOptions);
};

/**
 * 删除块
 * @param {string} id - 块ID
 * @param {Object} [options] - API可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const deleteBlock = (id, options = {}) => {
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('deleteBlock', { id }, options);
};

/**
 * 前置块
 * @param {Object} options - 前置选项
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {string} options.parentID - 父块ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const prependBlock = (options, apiOptions = {}) => {
  if (!options?.data || !options?.parentID) {
    return Promise.resolve({
      code: -1,
      msg: '块内容和父块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('prependBlock', options, apiOptions);
};

/**
 * 追加块
 * @param {Object} options - 追加选项
 * @param {string} options.data - 块内容
 * @param {string} options.dataType - 数据类型：'markdown' | 'dom'
 * @param {string} options.parentID - 父块ID
 * @param {Object} [apiOptions] - API可选配置
 * @param {string} [apiOptions.host] - API服务器地址
 * @param {string} [apiOptions.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const appendBlock = (options, apiOptions = {}) => {
  if (!options?.data || !options?.parentID) {
    return Promise.resolve({
      code: -1,
      msg: '块内容和父块ID不能为空',
      data: null
    });
  }
  return sendBlockOpRequest('appendBlock', options, apiOptions);
};

// 用示例：
/*
// 移动块
await moveBlock({
  id: '20210808180117-6v0mkxr',
  parentID: '20210808180117-7v0mkxr',
  previousID: '20210808180117-8v0mkxr'
});

// 插入块
await insertBlock({
  data: '# 新标题',
  dataType: 'markdown',
  parentID: '20210808180117-6v0mkxr'
});

// 更新块
await updateBlock({
  id: '20210808180117-6v0mkxr',
  data: '更新后的内容',
  dataType: 'markdown'
});
*/ 