import { request } from '../core/request';

/**
 * 获取应用信息
 * @param {Object} [options] - 配置选项
 * @returns {Promise<{
 *   status: string,
 *   data: {
 *     version: string,           // 应用版本号
 *     prereleaseVersion: null,   // 预发布版本号
 *     buildVersion: string,      // 构建版本号
 *     execPath: string,          // 可执行文件路径
 *     platform: string           // 运行平台
 *   }
 * }>}
 */
export const getApplicationInfo = (options = {}) => {
    return request('/api/application/info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, options);
}; 

// 导出所有函数
export {
  getApplicationInfo
}; 