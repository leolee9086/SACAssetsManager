import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 发送Pandoc相关请求的通用方法
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
const sendPandocRequest = async (endpoint, data, options = {}) => {
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/pandoc/${endpoint}`, options.host), {
      method: 'POST',
      headers: {
        ...getAuthHeaders({ token: options.token }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, `Pandoc${endpoint}操作`);
  }
};

/**
 * 使用Pandoc进行文档转换
 * @param {Object} params - 转换选项
 * @param {string} [params.dir] - 工作目录(默认随机生成7位字符串)
 * @param {string[]} params.args - Pandoc命令行参数
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     path: string  // 转换后的文件路径
 *   }
 * }>}
 */
export const convertPandoc = (params, options = {}) => {
  const { dir, args } = params;

  // 参数验证
  if (!Array.isArray(args) || args.length === 0) {
    return Promise.resolve({
      code: -1,
      msg: 'Pandoc参数不能为空且必须为数组',
      data: null
    });
  }

  // 验证参数是否都是字符串
  if (!args.every(arg => typeof arg === 'string')) {
    return Promise.resolve({
      code: -1,
      msg: 'Pandoc参数必须都是字符串',
      data: null
    });
  }

  return sendPandocRequest('pandoc', {
    dir: dir || undefined, // 如果未指定则由后端生成
    args: args
  }, options);
};

/**
 * 获取Pandoc版本信息
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     version: string  // Pandoc版本号
 *   }
 * }>}
 */
export const getPandocVersion = (options = {}) => {
  return sendPandocRequest('version', {}, options);
};

/**
 * 导出Pandoc支持的格式列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     readers: string[],  // 支持的输入格式
 *     writers: string[]   // 支持的输出格式
 *   }
 * }>}
 */
export const getPandocFormats = (options = {}) => {
  return sendPandocRequest('formats', {}, options);
};

/**
 * 导出Pandoc支持的PDF引擎列表
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: string[]  // PDF引擎列表
 * }>}
 */
export const getPandocPdfEngines = (options = {}) => {
  return sendPandocRequest('pdfEngines', {}, options);
};

/**
 * 常用的Pandoc转换配置
 */
export const PandocPresets = {
  /**
   * Markdown转Word配置
   * @param {string} input - 输入文件路径
   * @param {string} output - 输出文件路径
   * @returns {string[]} Pandoc参数数组
   */
  markdownToWord: (input, output) => [
    input,
    '-f', 'markdown',
    '-t', 'docx',
    '-o', output
  ],

  /**
   * HTML转PDF配置
   * @param {string} input - 输入文件路径
   * @param {string} output - 输出文件路径
   * @returns {string[]} Pandoc参数数组
   */
  htmlToPdf: (input, output) => [
    input,
    '--pdf-engine=wkhtmltopdf',
    '-o', output
  ]
}; 