import { getApiUrl, handleApiError } from './utils/apiConfig';
import { fetchWithTimeout, getAuthHeaders } from './utils/fetchUtils';

/**
 * 压缩文件或目录
 * @param {Object} params - 压缩参数
 * @param {string} params.path - 要压缩的文件或目录路径（工作空间相对路径）
 * @param {string} params.zipPath - 生成的压缩文件保存路径（工作空间相对路径）
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     path: string,    // 压缩后的文件路径
 *     size: number     // 压缩后的文件大小（字节）
 *   }
 * }>}
 */
export const zip = async ({ path, zipPath }, options = {}) => {
  if (!path || !zipPath) {
    return {
      code: -1,
      msg: '路径参数不能为空',
      data: null
    };
  }

  try {
    const response = await fetchWithTimeout(getApiUrl('/api/archive/zip', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ 
        path,
        zipPath 
      })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '压缩文件');
  }
};

/**
 * 解压缩文件
 * @param {Object} params - 解压参数
 * @param {string} params.zipPath - 要解压的文件路径（工作空间相对路径）
 * @param {string} params.path - 解压目标路径（工作空间相对路径）
 * @param {Object} [options] - 可选配置
 * @param {string} [options.host] - API服务器地址
 * @param {string} [options.token] - 自定义认证令牌
 * @returns {Promise<{
 *   code: number,  // 0表示成功，其他值表示失败
 *   msg: string,   // 返回消息
 *   data: {
 *     path: string,     // 解压后的目标路径
 *     entries: number   // 解压的文件条目数
 *   }
 * }>}
 */
export const unzip = async ({ zipPath, path }, options = {}) => {
  if (!zipPath || !path) {
    return {
      code: -1,
      msg: '路径参数不能为空',
      data: null
    };
  }

  try {
    const response = await fetchWithTimeout(getApiUrl('/api/archive/unzip', options.host), {
      method: 'POST',
      headers: getAuthHeaders({ token: options.token }),
      body: JSON.stringify({ 
        zipPath,
        path 
      })
    });
    return await response.json();
  } catch (err) {
    return handleApiError(err, '解压文件');
  }
}; 