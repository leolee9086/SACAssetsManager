import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送同步相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendSyncRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/sync/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `同步${endpoint}操作`);
  }
};

/**
 * 执行同步
 * @param {Object} [params] - 同步选项
 * @param {boolean} [params.mobileSwitch] - 是否为移动端切换触发
 * @param {boolean} [params.upload] - 是否上传(仅手动同步模式)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const performSync = (params = {}, options = {}) => {
  const { mobileSwitch, upload } = params;

  // Android端前后台切换时自动触发同步
  if (mobileSwitch && (!window.siyuan?.config?.user || !window.siyuan?.config?.sync?.enabled)) {
    return Promise.resolve({ code: 0, msg: '', data: null });
  }

  return sendSyncRequest('performSync', { mobileSwitch, upload }, options);
};

/**
 * 获取同步信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     synced: boolean,
 *     stat: string,
 *     kernels: Array<{
 *       id: string,
 *       name: string,
 *       os: string,
 *       isOnline: boolean
 *     }>,
 *     kernel: string
 *   }
 * }>}
 */
export const getSyncInfo = (options = {}) => {
  return sendSyncRequest('getSyncInfo', {}, options);
};

/**
 * 设置同步配置
 * @param {Object} params - 配置选项
 * @param {boolean} [params.enabled] - 是否启用同步
 * @param {boolean} [params.generateConflictDoc] - 是否生成冲突文档
 * @param {boolean} [params.perception] - 是否启用同步感知
 * @param {number} [params.mode] - 同步模式(0:自动,3:手动)
 * @param {number} [params.provider] - 同步提供者(0:云端,2:WebDAV,3:S3)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setSyncConfig = (params, options = {}) => {
  const promises = [];
  
  if (params.enabled !== undefined) {
    promises.push(sendSyncRequest('setSyncEnable', { enabled: params.enabled }, options));
  }
  
  if (params.generateConflictDoc !== undefined) {
    promises.push(sendSyncRequest('setSyncGenerateConflictDoc', { enabled: params.generateConflictDoc }, options));
  }
  
  if (params.perception !== undefined) {
    promises.push(sendSyncRequest('setSyncPerception', { enabled: params.perception }, options));
  }
  
  if (params.mode !== undefined) {
    if (![0, 3].includes(params.mode)) {
      return Promise.resolve({
        code: -1,
        msg: '无效的同步模式，必须是 0(自动) 或 3(手动)',
        data: null
      });
    }
    promises.push(sendSyncRequest('setSyncMode', { mode: params.mode }, options));
  }
  
  if (params.provider !== undefined) {
    if (![0, 2, 3].includes(params.provider)) {
      return Promise.resolve({
        code: -1,
        msg: '无效的同步提供者，必须是 0(云端)/2(WebDAV)/3(S3)',
        data: null
      });
    }
    promises.push(sendSyncRequest('setSyncProvider', { provider: params.provider }, options));
  }

  return Promise.all(promises);
};

/**
 * 设置WebDAV同步配置
 * @param {Object} params - WebDAV配置
 * @param {string} params.url - WebDAV服务器地址
 * @param {string} params.username - 用户名
 * @param {string} params.password - 密码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setSyncProviderWebDAV = (params, options = {}) => {
  if (!params.url || !params.username || !params.password) {
    return Promise.resolve({
      code: -1,
      msg: 'WebDAV配置缺少必要字段(url/username/password)',
      data: null
    });
  }

  return sendSyncRequest('setSyncProviderWebDAV', { webdav: params }, options);
};

/**
 * 设置S3同步配置
 * @param {Object} params - S3配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setSyncProviderS3 = (params, options = {}) => {
  return sendSyncRequest('setSyncProviderS3', { s3: params }, options);
};

/**
 * 设置云端同步目录
 * @param {Object} params - 目录参数
 * @param {string} params.path - 同步目录路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setCloudSyncDir = (params, options = {}) => {
  return sendSyncRequest('setCloudSyncDir', { path: params.path }, options);
};

/**
 * 创建云端同步目录
 * @param {Object} params - 目录参数
 * @param {string} params.name - 目录名称
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const createCloudSyncDir = (params, options = {}) => {
  return sendSyncRequest('createCloudSyncDir', { name: params.name }, options);
};

/**
 * 移除云端同步目录
 * @param {Object} params - 目录参数
 * @param {string} params.path - 目录路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeCloudSyncDir = (params, options = {}) => {
  return sendSyncRequest('removeCloudSyncDir', { path: params.path }, options);
};

/**
 * 列出云端同步目录
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array<string>}>}
 */
export const listCloudSyncDir = (options = {}) => {
  return sendSyncRequest('listCloudSyncDir', {}, options);
};

/**
 * 执行启动同步
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const performBootSync = (options = {}) => {
  return sendSyncRequest('performBootSync', {}, options);
};

/**
 * 获取启动同步状态
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {synced: boolean}}>}
 */
export const getBootSync = (options = {}) => {
  return sendSyncRequest('getBootSync', {}, options);
};

/**
 * 导出S3同步配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportSyncProviderS3 = (options = {}) => {
  return sendSyncRequest('exportSyncProviderS3', {}, options);
};

/**
 * 导入S3同步配置
 * @param {Object} params - 配置参数
 * @param {Object} params.config - S3配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const importSyncProviderS3 = (params, options = {}) => {
  return sendSyncRequest('importSyncProviderS3', { config: params.config }, options);
};

/**
 * 导出WebDAV同步配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const exportSyncProviderWebDAV = (options = {}) => {
  return sendSyncRequest('exportSyncProviderWebDAV', {}, options);
};

/**
 * 导入WebDAV同步配置
 * @param {Object} params - 配置参数
 * @param {Object} params.config - WebDAV配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const importSyncProviderWebDAV = (params, options = {}) => {
  return sendSyncRequest('importSyncProviderWebDAV', { config: params.config }, options);
};

// 使用示例：
/*
// 执行同步
await performSync({
  mobileSwitch: false,
  upload: true
});

// 获取同步信息
const syncInfo = await getSyncInfo();

// 设置同步配置
await setSyncConfig({
  enabled: true,
  generateConflictDoc: true,
  perception: true,
  mode: 0,
  provider: 0
});

// 设置WebDAV配置
await setSyncProviderWebDAV({
  url: 'https://dav.example.com',
  username: 'user',
  password: 'pass'
});

// 设置S3配置
await setSyncProviderS3({
  endpoint: 's3.example.com',
  accessKey: 'key',
  secretKey: 'secret',
  bucket: 'siyuan'
});
*/ 