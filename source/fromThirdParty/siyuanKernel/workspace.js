import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送工作空间相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendWorkspaceRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/workspace/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `工作空间${endpoint}操作`);
  }
};

/**
 * 检查工作空间路径是否有效
 * @private
 * @param {string} path - 工作空间路径
 * @returns {boolean}
 */
const isInvalidWorkspacePath = (path) => {
  if (!path) return true;
  
  const name = path.split('/').pop();
  if (!name) return true;
  
  if (name.startsWith('.')) return true;
  
  // 检查文件名是否有效
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  if (invalidChars.test(name)) return true;
  
  // 限制名称长度为32个字符
  if (Array.from(name).length > 32) return true;
  
  const toLower = name.toLowerCase();
  return ['conf', 'home', 'data', 'temp'].some(reserved => toLower.includes(reserved));
};

/**
 * 检查工作空间目录
 * @param {Object} params - 检查选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {isWorkspace: boolean}}>}
 */
export const checkWorkspaceDir = (params, options = {}) => {
  const { path } = params;

  if (isInvalidWorkspacePath(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: null
    });
  }

  return sendWorkspaceRequest('checkWorkspaceDir', { path }, options);
};

/**
 * 创建工作空间目录
 * @param {Object} params - 创建选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const createWorkspaceDir = (params, options = {}) => {
  const { path } = params;
  
  if (isInvalidWorkspacePath(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: null
    });
  }

  return sendWorkspaceRequest('createWorkspaceDir', { 
    path: path.trim() 
  }, options);
};

/**
 * 移除工作空间目录(仅从列表移除)
 * @param {Object} params - 移除选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeWorkspaceDir = (params, options = {}) => {
  return sendWorkspaceRequest('removeWorkspaceDir', params, options);
};

/**
 * 物理删除工作空间目录
 * @param {Object} params - 删除选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeWorkspaceDirPhysically = (params, options = {}) => {
  return sendWorkspaceRequest('removeWorkspaceDirPhysically', params, options);
};

/**
 * 获取移动端工作空间列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array<string>}>}
 */
export const getMobileWorkspaces = (options = {}) => {
  return sendWorkspaceRequest('getMobileWorkspaces', {}, options);
};

/**
 * 获取工作空间列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     path: string,
 *     closed: boolean
 *   }>
 * }>}
 */
export const getWorkspaces = (options = {}) => {
  return sendWorkspaceRequest('getWorkspaces', {}, options);
};

/**
 * 设置工作空间目录
 * @param {Object} params - 设置选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout?: number}}>}
 */
export const setWorkspaceDir = (params, options = {}) => {
  const { path } = params;

  if (isInvalidWorkspacePath(path)) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间名称不允许，请使用其他名称',
      data: { closeTimeout: 3000 }
    });
  }

  // 检查是否为云端同步路径
  if (path.includes(':/') || path.includes(':\\')) {
    return Promise.resolve({
      code: -1,
      msg: '不能选择云端同步路径作为工作空间',
      data: { closeTimeout: 7000 }
    });
  }

  return sendWorkspaceRequest('setWorkspaceDir', { path }, options);
};

/**
 * 列出工作空间目录
 * @param {Object} params - 列表选项
 * @param {string} params.path - 工作空间路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     name: string,
 *     path: string,
 *     isDir: boolean,
 *     size: number
 *   }>
 * }>}
 */
export const listWorkspaceDir = (params, options = {}) => {
  const { path } = params;
  
  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '工作空间路径不能为空',
      data: null
    });
  }

  return sendWorkspaceRequest('listWorkspaceDir', { path }, options);
};

/**
 * 获取工作空间配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     conf: Object,
 *     box: string,
 *     boxId: string
 *   }
 * }>}
 */
export const getWorkspaceConfig = (options = {}) => {
  return sendWorkspaceRequest('getWorkspaceConfig', {}, options);
};

/**
 * 获取工作空间状态
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     uiLayout: Object,
 *     boxId: string
 *   }
 * }>}
 */
export const getWorkspaceState = (options = {}) => {
  return sendWorkspaceRequest('getWorkspaceState', {}, options);
};

// 使用示例：
/*
// 检查工作空间
const check = await checkWorkspaceDir({
  path: '/path/to/workspace'
});

// 创建工作空间
await createWorkspaceDir({
  path: '/path/to/new/workspace'
});

// 获取工作空间列表
const workspaces = await getWorkspaces();

// 设置工作空间
await setWorkspaceDir({
  path: '/path/to/workspace'
});

// 移除工作空间
await removeWorkspaceDir({
  path: '/path/to/workspace'
});

// 物理删除工作空间
await removeWorkspaceDirPhysically({
  path: '/path/to/workspace'
});
*/ 