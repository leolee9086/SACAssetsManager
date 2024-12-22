import { getApiUrl, handleApiError } from './utils/apiConfig.js';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils.js';

/**
 * 发送系统相关请求的通用方法
 * @private
 * @param {string} endpoint - API 端点
 * @param {Object} data - 请求数据
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: Object}>}
 */
const sendSystemRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/system/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `系统${endpoint}操作`);
  }
};

/**
 * 重载UI
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const reloadUI = (options = {}) => {
  return sendSystemRequest('reloadUI', {}, options);
};

/**
 * 获取工作空间信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     workspaceDir: string,
 *     siyuanVer: string
 *   }
 * }>}
 */
export const getWorkspaceInfo = (options = {}) => {
  return sendSystemRequest('getWorkspaceInfo', {}, options);
};

/**
 * 获取网络配置
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     proxy: {
 *       scheme: string,
 *       host: string,
 *       port: string
 *     }
 *   }
 * }>}
 */
export const getNetwork = (options = {}) => {
  return sendSystemRequest('getNetwork', {}, options);
};

/**
 * 设置网络代理
 * @param {Object} params - 代理配置
 * @param {string} params.scheme - 代理协议(http/https/socks5)
 * @param {string} params.host - 代理主机
 * @param {string} params.port - 代理端口
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setNetworkProxy = (params, options = {}) => {
  const { scheme, host, port } = params;
  
  if (!['http', 'https', 'socks5'].includes(scheme)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的代理协议，必须是 http/https/socks5',
      data: null
    });
  }

  if (!host) {
    return Promise.resolve({
      code: -1,
      msg: '代理主机不能为空',
      data: null
    });
  }

  if (!port || !/^\d+$/.test(port)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的代理端口',
      data: null
    });
  }

  return sendSystemRequest('setNetworkProxy', { scheme, host, port }, options);
};

/**
 * 获取系统字体列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: string[]}>}
 */
export const getSysFonts = (options = {}) => {
  return sendSystemRequest('getSysFonts', {}, options);
};

/**
 * 获取版本号
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: string}>}
 */
export const version = (options = {}) => {
  return sendSystemRequest('version', {}, options);
};

/**
 * 获取当前时间戳
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: number}>}
 */
export const currentTime = (options = {}) => {
  return sendSystemRequest('currentTime', {}, options);
};

/**
 * 获取启动进度
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     progress: number,
 *     details: string
 *   }
 * }>}
 */
export const bootProgress = (options = {}) => {
  return sendSystemRequest('bootProgress', {}, options);
};

/**
 * 退出应用
 * @param {Object} [params] - 退出选项
 * @param {boolean} [params.force] - 是否强制退出
 * @param {number} [params.execInstallPkg] - 执行安装包(0:检查新版本,1:不执行,2:执行)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     closeTimeout?: number
 *   }
 * }>}
 */
export const exit = (params = {}, options = {}) => {
  const { force = false, execInstallPkg = 0 } = params;

  if (![0, 1, 2].includes(execInstallPkg)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的安装包执行选项，必须是 0/1/2',
      data: null
    });
  }

  return sendSystemRequest('exit', { force, execInstallPkg }, options);
};

/**
 * 设置自动启动
 * @param {Object} params - 启动参数
 * @param {number} params.autoLaunch - 自动启动选项(0:禁用,1:启用,2:最小化启动)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: null}>}
 */
export const setAutoLaunch = (params, options = {}) => {
  const { autoLaunch } = params;
  if (![0, 1, 2].includes(autoLaunch)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的自动启动选项，必须是 0/1/2',
      data: null
    });
  }

  return sendSystemRequest('setAutoLaunch', { autoLaunch }, options);
};

/**
 * 设置外观模式
 * @param {Object} params - 外观参数
 * @param {number} params.mode - 外观模式(0:浅色,1:深色)
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     appearance: Object
 *   }
 * }>}
 */
export const setAppearanceMode = (params, options = {}) => {
  const { mode } = params;
  if (![0, 1].includes(mode)) {
    return Promise.resolve({
      code: -1,
      msg: '无效的外观模式，必须是 0(浅色)/1(深色)',
      data: null
    });
  }

  return sendSystemRequest('setAppearanceMode', { mode }, options);
};

/**
 * 检查系统更新
 * @param {Object} [params] - 检查参数
 * @param {boolean} [params.beta=false] - 是否检查Beta版本
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     version: string,
 *     downloadURL: string,
 *     releaseDate: string,
 *     releaseNotes: string
 *   }
 * }>}
 */
export const checkUpdate = (params = {}, options = {}) => {
  return sendSystemRequest('checkUpdate', { beta: params.beta || false }, options);
};

/**
 * 获取系统环境信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     os: string,
 *     arch: string,
 *     mode: string,
 *     container: string
 *   }
 * }>}
 */
export const getEchartsRendererInfo = (options = {}) => {
  return sendSystemRequest('getEchartsRendererInfo', {}, options);
};

/**
 * 获取系统主题模式
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{code: number, msg: string, data: {mode: string}}>}
 */
export const getThemeMode = (options = {}) => {
  return sendSystemRequest('getThemeMode', {}, options);
};

/**
 * 获取系统升级进度
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     action: string,
 *     progress: number
 *   }
 * }>}
 */
export const getUpgradeProgress = (options = {}) => {
  return sendSystemRequest('getUpgradeProgress', {}, options);
};

// 使用示例：
/*
// 重载UI
await reloadUI();

// 获取工作空间信息
const info = await getWorkspaceInfo();

// 设置网络代理
await setNetworkProxy({
  scheme: 'http',
  host: '127.0.0.1',
  port: '1080'
});

// 获取系统字体
const fonts = await getSysFonts();

// 获取版本号
const ver = await version();

// 退出应用
await exit({
  force: true,
  execInstallPkg: 0
});
*/ 