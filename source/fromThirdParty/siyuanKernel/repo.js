import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送仓库相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: Object   // 返回数据
 * }>}
 */
const sendRepoRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/repo/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `仓库${endpoint}操作`);
  }
};

/**
 * 设置仓库索引保留天数
 * @param {number} days - 保���天数(最小1天)
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setRepoIndexRetentionDays = (days) => {
  if (days < 1) {
    days = 180; // 默认180天
  }
  return sendRepoRequest('setRepoIndexRetentionDays', { days });
};

/**
 * 获取云端空间使用情况
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     sync: boolean,
 *     backup: boolean,
 *     hAssetSize: string,
 *     hSize: string,
 *     hTotalSize: string,
 *     hExchangeSize: string,
 *     hTrafficUploadSize: string,
 *     hTrafficDownloadSize: string,
 *     hTrafficAPIGet: string,
 *     hTrafficAPIPut: string
 *   }
 * }>}
 */
export const getCloudSpace = () => {
  return sendRepoRequest('getCloudSpace', {});
};

/**
 * 创建快照
 * @param {Object} params - 快照参数
 * @param {string} params.memo - 快照备注
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout: number}}>}
 */
export const createSnapshot = (params, options = {}) => {
  const { memo } = params;
  if (!memo) {
    return Promise.resolve({
      code: -1,
      msg: '快照备注不能为空',
      data: null
    });
  }
  return sendRepoRequest('createSnapshot', { memo }, options);
};

/**
 * 获取仓库快照列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     snapshots: Array<{
 *       id: string,       // 快照ID
 *       created: string,  // 创建时间
 *       memo: string,     // 备注
 *       tag: string,      // 标签
 *       count: number,    // 文件数量
 *       size: number,     // 大小(字节)
 *       hSize: string     // 人类可读大小
 *     }>,
 *     pageCount: number,  // 总页数
 *     totalCount: number  // 总记录数
 *   }
 * }>}
 */
export const getRepoSnapshots = (params, options = {}) => {
  let { page } = params;
  if (page < 1) {
    page = 1;
  }
  return sendRepoRequest('getRepoSnapshots', { page }, options);
};

/**
 * 从密码初始化仓库密钥
 * @param {Object} params - 初始化参数
 * @param {string} params.pass - 密码
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     key: string,         // 密钥
 *     closeTimeout: number // 关闭超时时间
 *   }
 * }>}
 */
export const initRepoKeyFromPassphrase = (params, options = {}) => {
  const { pass } = params;
  if (!pass) {
    return Promise.resolve({
      code: -1,
      msg: '密码不能为空',
      data: null
    });
  }
  return sendRepoRequest('initRepoKeyFromPassphrase', { pass }, options);
};

/**
 * 重置仓库
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {closeTimeout: number}}>}
 */
export const resetRepo = (options = {}) => {
  return sendRepoRequest('resetRepo', {}, options);
};

/**
 * 初始化仓库密钥
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {key: string}}>}
 */
export const initRepoKey = (options = {}) => {
  return sendRepoRequest('initRepoKey', {}, options);
};

/**
 * 清除仓库数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const purgeRepo = (options = {}) => {
  return sendRepoRequest('purgeRepo', {}, options);
};

/**
 * 清除云端仓库数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const purgeCloudRepo = (options = {}) => {
  return sendRepoRequest('purgeCloudRepo', {}, options);
};

/**
 * 导入仓库密钥
 * @param {Object} params - 导入参数
 * @param {string} params.key - 密钥
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const importRepoKey = (params, options = {}) => {
  const { key } = params;
  if (!key) {
    return Promise.resolve({
      code: -1,
      msg: '密钥不能为空',
      data: null
    });
  }
  return sendRepoRequest('importRepoKey', { key }, options);
};

/**
 * 标记快照
 * @param {Object} params - 标记参数
 * @param {string} params.id - 快照ID
 * @param {string} params.tag - 标签名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const tagSnapshot = (params, options = {}) => {
  const { id, tag } = params;
  if (!id || !tag) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRepoRequest('tagSnapshot', { id, tag }, options);
};

/**
 * 检出仓库到指定快照
 * @param {Object} params - 检出参数
 * @param {string} params.id - 快照ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const checkoutRepo = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '快照ID不能为空',
      data: null
    });
  }
  return sendRepoRequest('checkoutRepo', { id }, options);
};

/**
 * 获取标记的快照列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     id: string,      // 快照ID
 *     created: string, // 创建时间
 *     tag: string      // 标签
 *   }>
 * }>}
 */
export const getRepoTagSnapshots = (options = {}) => {
  return sendRepoRequest('getRepoTagSnapshots', {}, options);
};

/**
 * 删除标记的快照
 * @param {Object} params - 删除参数
 * @param {string} params.tag - 标签名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeRepoTagSnapshot = (params, options = {}) => {
  const { tag } = params;
  if (!tag) {
    return Promise.resolve({
      code: -1,
      msg: '标签名不能为空',
      data: null
    });
  }
  return sendRepoRequest('removeRepoTagSnapshot', { tag }, options);
};

/**
 * 获取云端标记的快照列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const getCloudRepoTagSnapshots = (options = {}) => {
  return sendRepoRequest('getCloudRepoTagSnapshots', {}, options);
};

/**
 * 获取云端快照列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Array}>}
 */
export const getCloudRepoSnapshots = (options = {}) => {
  return sendRepoRequest('getCloudRepoSnapshots', {}, options);
};

/**
 * 删除云端标记的快照
 * @param {Object} params - 删除参数
 * @param {string} params.tag - 标签名
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const removeCloudRepoTagSnapshot = (params, options = {}) => {
  const { tag } = params;
  if (!tag) {
    return Promise.resolve({
      code: -1,
      msg: '标签名不能为空',
      data: null
    });
  }
  return sendRepoRequest('removeCloudRepoTagSnapshot', { tag }, options);
};

/**
 * 上传快照到云端
 * @param {Object} params - 上传参数
 * @param {string} params.id - 快照ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const uploadCloudSnapshot = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '快照ID不能为空',
      data: null
    });
  }
  return sendRepoRequest('uploadCloudSnapshot', { id }, options);
};

/**
 * 从云端下载快照
 * @param {Object} params - 下载参数
 * @param {string} params.id - 快照ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const downloadCloudSnapshot = (params, options = {}) => {
  const { id } = params;
  if (!id) {
    return Promise.resolve({
      code: -1,
      msg: '快照ID不能为空',
      data: null
    });
  }
  return sendRepoRequest('downloadCloudSnapshot', { id }, options);
};

/**
 * 比较两个快照的差异
 * @param {Object} params - 比较参数
 * @param {string} params.left - 左侧快照ID
 * @param {string} params.right - 右侧快照ID
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const diffRepoSnapshots = (params, options = {}) => {
  const { left, right } = params;
  if (!left || !right) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRepoRequest('diffRepoSnapshots', { left, right }, options);
};

/**
 * 打开快照中的文档
 * @param {Object} params - 打开参数
 * @param {string} params.id - 快照ID
 * @param {string} params.path - 文档路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const openRepoSnapshotDoc = (params, options = {}) => {
  const { id, path } = params;
  if (!id || !path) {
    return Promise.resolve({
      code: -1,
      msg: '参数不完整',
      data: null
    });
  }
  return sendRepoRequest('openRepoSnapshotDoc', { id, path }, options);
};

/**
 * 获取仓库文件
 * @param {Object} params - 获取参数
 * @param {string} params.path - 文件路径
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
export const getRepoFile = (params, options = {}) => {
  const { path } = params;
  if (!path) {
    return Promise.resolve({
      code: -1,
      msg: '文件路径不能为空',
      data: null
    });
  }
  return sendRepoRequest('getRepoFile', { path }, options);
};

/**
 * 设置每日保留索引
 * @param {Object} params - 设置参数
 * @param {boolean} params.enabled - 是否启用
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setRetentionIndexesDaily = (params, options = {}) => {
  const { enabled } = params;
  return sendRepoRequest('setRetentionIndexesDaily', { enabled }, options);
};

// 使用示例：
/*
// 设置索引保留天数
await setRepoIndexRetentionDays(180);

// 获取云端空间
const space = await getCloudSpace();

// 创建快照
await createSnapshot('备份文档');

// 获取快照列表
const snapshots = await getRepoSnapshots(1);

// 初始化仓库密钥
const key = await initRepoKeyFromPassphrase('password123');

// 重置仓库
await resetRepo();
*/ 