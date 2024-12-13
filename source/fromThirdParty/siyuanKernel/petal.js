/**
 * 发送插件相关请求的通用方法
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
const sendPetalRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetch(getApiUrl(`/api/petal/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`插件${endpoint}操作失败:`, err);
    throw err;
  }
};

/**
 * 加载插件列表
 * @param {Object} params - 加载选项
 * @param {string} params.frontend - 前端类型(desktop/mobile/all)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: Array<{
 *     packageName: string,  // 插件包名
 *     name: string,         // 插件名称
 *     description: string,  // 插件描述
 *     version: string,      // 插件版本
 *     author: string,       // 插件作者
 *     url: string,          // 插件URL
 *     enabled: boolean      // 是否启用
 *   }>
 * }>}
 */
export const loadPetals = (params, options = {}) => {
  const { frontend } = params;
  // ... 参数验证 ...
  return sendPetalRequest('loadPetals', { frontend }, options);
};

/**
 * 设置插件启用状态
 * @param {Object} params - 设置选项
 * @param {string} params.packageName - 插件包名
 * @param {boolean} params.enabled - 是否启用
 * @param {string} params.frontend - 前端类型(desktop/mobile/all)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     enabled: boolean  // 是否启用
 *   }
 * }>}
 */
export const setPetalEnabled = (params, options = {}) => {
  const { packageName, enabled, frontend } = params;
  // ... 参数验证 ...
  return sendPetalRequest('setPetalEnabled', {
    packageName,
    enabled,
    frontend
  }, options);
};

// 使用示例：
/*
// 加载插件列表
const petals = await loadPetals({
  frontend: 'desktop'
});

// 启用/禁用插件
const result = await setPetalEnabled({
  packageName: 'com.example.plugin',
  enabled: true,
  frontend: 'desktop'
});
*/ 